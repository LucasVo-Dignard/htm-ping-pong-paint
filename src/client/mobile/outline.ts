import { SwingDetectionService } from './services/swing-detection-service';
import { ROOM_CODE_LENGTH, ROOM_CODE_REGEX, SocketEvents } from '../../shared/constants';
import { loadSound, audioCtx } from '../pc/load-sound';
import { playSoundWithPitch } from '../pc/play-sound';
import { playMetalSound } from '../pc/metallic-sound';

declare const io: any;

export const mobileOutline = {
  init(): void {
    // Set audio session type for iOS to bypass physical mute switch as early as possible
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        (navigator as any).audioSession.type = 'playback';
      } catch (e) {
        console.warn('Failed to set audioSession type in init:', e);
      }
    }
    const root = document.getElementById('app');
    if (!root) return;

    const card = root.querySelector('.page-card');
    if (!card) return;

    // --- Socket join logic ---
    // Requires socket.io client script to be included on the page.
    try {
      const socket = io();
      // register this client as "mobile"
      socket.emit(SocketEvents.REGISTER, 'mobile');

      const swingService = new SwingDetectionService();
      let woodBuffer: AudioBuffer | null = null;
      let plasticBuffer: AudioBuffer | null = null;

      // Set audio session type for iOS to bypass physical mute switch
      const configureAudioSession = () => {
        if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
          try {
            (navigator as any).audioSession.type = 'playback';
            console.log('audioSession type set to playback');
          } catch (e) {
            console.warn('Failed to set audioSession type:', e);
          }
        }
      };

      let keepAliveStarted = false;
      const startKeepAlive = () => {
        if (keepAliveStarted || !audioCtx) return;
        try {
          // Play a persistent silent oscillator to prevent iOS Safari from auto-suspending the audio thread
          const keepAliveGain = audioCtx.createGain();
          keepAliveGain.gain.setValueAtTime(0.000001, audioCtx.currentTime);
          const keepAliveOsc = audioCtx.createOscillator();
          keepAliveOsc.connect(keepAliveGain);
          keepAliveGain.connect(audioCtx.destination);
          keepAliveOsc.start(0);
          keepAliveStarted = true;
          console.log('Mobile: Audio keep-alive loop started successfully');
        } catch (e) {
          console.warn('Mobile: Failed to start audio keep-alive:', e);
        }
      };

      // Fully unlock Web Audio API synchronously inside user gesture
      const unlockAudio = () => {
        configureAudioSession();
        if (audioCtx) {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch((err) => console.warn('Failed to resume AudioContext:', err));
          }
          // Play a silent dummy buffer source to trigger audio unlock on iOS/Android
          try {
            const buffer = audioCtx.createBuffer(1, 1, 22050);
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);
            console.log('Mobile: Silent dummy buffer played successfully');
          } catch (e) {
            console.warn('Mobile: Failed to play silent dummy buffer:', e);
          }
          startKeepAlive();
        }
      };

      // Robustly resume AudioContext and request sensor permission on first user interaction gesture (click or tap)
      const resumeAudio = () => {
        if (swingService && !swingService.isRunning) {
          swingService.start().catch((err) => {
            console.error('Failed to start swing service on gesture:', err);
          });
        }
        unlockAudio();
        window.removeEventListener('click', resumeAudio);
        window.removeEventListener('touchstart', resumeAudio);
      };
      window.addEventListener('click', resumeAudio);
      window.addEventListener('touchstart', resumeAudio);

      // Pre-load wood and plastic sounds immediately on page load with cache-busters
      (async () => {
        try {
          const cacheBuster = '?v=' + Date.now();
          woodBuffer = await loadSound('/sounds/wood.wav' + cacheBuster);
          plasticBuffer = await loadSound('/sounds/plastic.wav' + cacheBuster);
          console.log('Mobile sound buffers preloaded successfully');
        } catch (error) {
          console.error('Failed to preload sound buffers:', error);
        }
      })();

      let isBallHittable = false;

      swingService.setCallback((eventData) => {
        socket.emit(SocketEvents.HIT, eventData);
        if (isBallHittable && woodBuffer) {
          console.log('Mobile: Playing wood sound on swing gesture (ball is hittable)');
          playSoundWithPitch(woodBuffer, 1.0, 1.0);
        } else {
          console.log('Mobile: Silent swing gesture (no ball in range)');
        }
      });

      // helper: display a small status element in the card
      let statusEl = card.querySelector('.join-status') as HTMLDivElement | null;
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'join-status';
        statusEl.style.marginTop = '12px';
        statusEl.style.fontSize = '14px';
        card.appendChild(statusEl);
      }

      function setStatus(text: string, ok?: boolean) {
        if (!statusEl) return;
        statusEl.textContent = text || '';
        statusEl.style.color = ok === false ? '#c0392b' : (ok === true ? '#16a085' : '');
      }

      // elements
      const input = (document.getElementById('code-input') || document.querySelector('input[name="code"]')) as HTMLInputElement | null;
      const joinBtn = (document.getElementById('join-btn') || card.querySelector('button.join-btn')) as HTMLButtonElement | null;
      const materialsGroup = document.getElementById('materials-group');
      const materialBtns = document.querySelectorAll('.material-btn');
      const h1 = card.querySelector('h1') as HTMLElement | null;
      const lead = card.querySelector('.lead') as HTMLElement | null;
      const joinGroup = document.getElementById('join-group');
      const statusPill = document.querySelector('.status-pill') as HTMLElement | null;

      function validateRoomCode(value: string): boolean {
        return ROOM_CODE_REGEX.test(value);
      }

      function normalizeInputValue(v: string): string {
        return (v || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, ROOM_CODE_LENGTH);
      }

      // keep input normalized as user types
      if (input) {
        input.addEventListener('input', () => {
          const normalized = normalizeInputValue(input.value);
          if (input.value !== normalized) input.value = normalized;
        });
      }

      function joinWithCode(c?: string): void {
        const codeClean = normalizeInputValue(c || (input ? input.value : ''));
        if (!validateRoomCode(codeClean)) {
          setStatus(codeClean.length === 0 ? 'Room code is required.' : 'Enter exactly 4 letters.', false);
          return;
        }

        // Start swing detection synchronously inside user gesture turn (before any async yields!)
        if (swingService && !swingService.isRunning) {
          swingService.start().catch((error) => {
            console.error('Could not start swing detection service:', error);
          });
        }

        // Unlock and resume AudioContext synchronously
        unlockAudio();

        setStatus('Joining...');
        socket.emit(SocketEvents.JOIN, codeClean);
      }

      // wire button
      if (joinBtn) {
        joinBtn.addEventListener('click', (e) => {
          e.preventDefault();
          joinWithCode();
        });
      }

      // attempt auto-join from query param if present
      const params = new URLSearchParams(window.location.search);
      const autoCode = normalizeInputValue(params.get('code') || '');
      if (autoCode && validateRoomCode(autoCode)) {
        if (input) input.value = autoCode;
        joinWithCode(autoCode);
      }

      socket.on(SocketEvents.JOIN_RESPONSE, (status: string) => {
        // server returns either 'success' or 'error'
        if (status === 'success') {
          setStatus('Joined — waiting for game', true);
          if (input) input.disabled = true;
          if (joinBtn) joinBtn.disabled = true;
          if (materialsGroup) materialsGroup.style.display = 'block';

          // Wire material buttons to emit socket message and play local audio feedback
          materialBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
              // Ensure audioCtx is resumed and unlocked on click gesture
              unlockAudio();
              // Ensure swingService is started on click gesture
              if (swingService && !swingService.isRunning) {
                swingService.start().catch((err) => {
                  console.error('Could not start swing detection service on material select:', err);
                });
              }
              const material = btn.getAttribute('data-material');
              socket.emit(SocketEvents.MATERIAL_SELECT, { material });
            });
          });
        } else { // 'error' (or any unexpected value)
          setStatus('Failed to join — invalid code', false);
        }
      });

      socket.on(SocketEvents.SESSION_ENDED, () => {
        setStatus('Session ended', false);
        if (input) input.disabled = false;
        if (joinBtn) joinBtn.disabled = false;
        if (h1) h1.style.display = '';
        if (lead) lead.style.display = '';
        if (joinGroup) joinGroup.style.display = '';
        if (statusEl) statusEl.style.display = '';
        if (materialsGroup) materialsGroup.style.display = 'none';
        if (statusPill) statusPill.style.display = '';
      });

      socket.on(SocketEvents.GAME_START, () => {
        if (h1) h1.style.display = 'none';
        if (lead) lead.style.display = 'none';
        if (joinGroup) joinGroup.style.display = 'none';
        if (statusEl) statusEl.style.display = 'none';
        if (materialsGroup) materialsGroup.style.display = 'block';
        if (statusPill) statusPill.style.display = 'none';
      });

      socket.on(SocketEvents.HITTABLE_STATUS, (status: boolean) => {
        isBallHittable = status;
        console.log('Mobile: received HITTABLE_STATUS:', status);
        const lastSocketEl = document.getElementById('debug-last-socket');
        if (lastSocketEl) {
          lastSocketEl.textContent = `Hittable: ${isBallHittable} at ${new Date().toLocaleTimeString()}`;
        }
      });

      // --- Debug Overlay for Diagnostics ---
      const debugPanel = document.createElement('div');
      debugPanel.id = 'mobile-audio-debug-panel';
      debugPanel.style.position = 'fixed';
      debugPanel.style.bottom = '12px';
      debugPanel.style.left = '12px';
      debugPanel.style.right = '12px';
      debugPanel.style.padding = '12px';
      debugPanel.style.background = 'rgba(15, 23, 42, 0.95)';
      debugPanel.style.color = '#e2e8f0';
      debugPanel.style.fontSize = '12px';
      debugPanel.style.fontFamily = 'monospace';
      debugPanel.style.borderRadius = '10px';
      debugPanel.style.zIndex = '9999';
      debugPanel.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)';
      debugPanel.style.border = '1px solid #334155';

      const statusText = document.createElement('div');
      statusText.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 6px; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 4px;">AUDIO DIAGNOSTICS</div>
        Ctx State: <span id="debug-ctx-state" style="color: #fbbf24">${audioCtx ? audioCtx.state : 'null'}</span><br/>
        Wood Loaded: <span id="debug-wood-loaded" style="color: #34d399">false</span><br/>
        Last Event: <span id="debug-last-socket" style="color: #60a5fa">none</span>
      `;
      debugPanel.appendChild(statusText);

      const testBtn = document.createElement('button');
      testBtn.textContent = '🔊 TEST SOUND';
      testBtn.style.marginTop = '10px';
      testBtn.style.padding = '8px 12px';
      testBtn.style.background = '#0284c7';
      testBtn.style.color = '#ffffff';
      testBtn.style.border = 'none';
      testBtn.style.borderRadius = '6px';
      testBtn.style.fontWeight = 'bold';
      testBtn.style.width = '100%';
      testBtn.style.cursor = 'pointer';
      testBtn.style.transition = 'background-color 0.2s';
      testBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Mobile: Test button clicked. Context state:', audioCtx ? audioCtx.state : 'null');
        unlockAudio();
        if (woodBuffer) {
          playSoundWithPitch(woodBuffer, 1.0, 1.0);
          console.log('Mobile: Test sound played successfully');
        } else {
          console.warn('Mobile: Test clicked but woodBuffer is null!');
        }
      });
      debugPanel.appendChild(testBtn);
      document.body.appendChild(debugPanel);

      // Periodically update diagnostic information
      setInterval(() => {
        const el = document.getElementById('debug-ctx-state');
        if (el && audioCtx) {
          el.textContent = audioCtx.state;
          el.style.color = audioCtx.state === 'running' ? '#34d399' : '#f87171';
        }
        const el2 = document.getElementById('debug-wood-loaded');
        if (el2) {
          el2.textContent = String(woodBuffer !== null);
          el2.style.color = woodBuffer !== null ? '#34d399' : '#f87171';
        }
      }, 500);

    } catch (e) {
      // socket.io not available or other error
      console.error('Socket join not initialized:', e);
    }
    // --- end socket join logic ---
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mobileOutline.init();
  });
} else {
  mobileOutline.init();
}
