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
        } catch (error) {
          console.error('Failed to preload sound buffers:', error);
        }
      })();

      let isBallHittable = false;

      swingService.setCallback((eventData) => {
        socket.emit(SocketEvents.HIT, eventData);
        if (isBallHittable && woodBuffer) {
          playSoundWithPitch(woodBuffer, 1.0, 1.0);
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
      });

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
