import { Container } from 'typedi';
import { SwingDetectionService } from './services/swing-detection-service';
import { ROOM_CODE_LENGTH, ROOM_CODE_REGEX, SocketEvents } from '../../shared/constants';
import { loadSound, audioCtx } from '../pc/load-sound';
import { playSoundWithPitch } from '../pc/play-sound';

declare const io: any;

export const mobileOutline = {
  init(): void {
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

      const swingService = Container.get(SwingDetectionService);
      let woodBuffer: AudioBuffer | null = null;

      // Robustly resume AudioContext on first user interaction gesture (click or tap)
      const resumeAudio = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().then(() => {
            console.log('AudioContext resumed successfully');
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
          }).catch((err) => console.warn('Failed to resume AudioContext:', err));
        } else if (audioCtx && audioCtx.state === 'running') {
          window.removeEventListener('click', resumeAudio);
          window.removeEventListener('touchstart', resumeAudio);
        }
      };
      window.addEventListener('click', resumeAudio, { passive: true });
      window.addEventListener('touchstart', resumeAudio, { passive: true });

      // Pre-load wood sound immediately on page load
      (async () => {
        try {
          woodBuffer = await loadSound('/sounds/wood.wav');
          console.log('Mobile wood sound preloaded successfully');
        } catch (error) {
          console.warn('Failed to preload wood sound:', error);
        }
      })();

      swingService.setCallback((eventData) => {
        socket.emit(SocketEvents.HIT, eventData);
        if (woodBuffer) {
          playSoundWithPitch(woodBuffer, 1.0, 0.25); // Play faint wood sound (0.25 volume is audible on phone speakers)
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

      async function joinWithCode(c?: string): Promise<void> {
        const codeClean = normalizeInputValue(c || (input ? input.value : ''));
        if (!validateRoomCode(codeClean)) {
          setStatus(codeClean.length === 0 ? 'Room code is required.' : 'Enter exactly 4 letters.', false);
          return;
        }

        // Resume AudioContext on user gesture
        if (audioCtx && audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        if (swingService && !swingService.isRunning) {
          swingService.start().catch((error) => {
            console.warn('Could not start swing detection service:', error);
          });
        }
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

          // Wire material buttons to emit socket message
          materialBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
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
    } catch (e) {
      // socket.io not available or other error
      console.warn('Socket join not initialized', e);
    }
    // --- end socket join logic ---
  }
};

document.addEventListener('DOMContentLoaded', () => {
  mobileOutline.init();
});
