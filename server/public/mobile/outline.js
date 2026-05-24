// Mobile outline script
// This file defines the client-side structure and page behavior for the mobile version.
const mobileOutline = {
  init() {
    const root = document.getElementById('app');
    if (!root) return;

    const card = root.querySelector('.page-card');
    if (!card) return;

    // --- Socket join logic ---
    // Requires socket.io client script to be included on the page.
    try {
      const socket = io();
      // register this client as "mobile"
      socket.emit('register', 'mobile');

      // helper: display a small status element in the card
      let statusEl = card.querySelector('.join-status');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'join-status';
        statusEl.style.marginTop = '12px';
        statusEl.style.fontSize = '14px';
        card.appendChild(statusEl);
      }

      function setStatus(text, ok) {
        statusEl.textContent = text || '';
        statusEl.style.color = ok === false ? '#c0392b' : (ok === true ? '#16a085' : '');
      }

      // elements
      const input = document.getElementById('code-input') || document.querySelector('input[name="code"]');
      const joinBtn = document.getElementById('join-btn') || card.querySelector('button.join-btn');

      function validateRoomCode(value) {
        return /^[A-Z]{4}$/.test(value);
      }

      function normalizeInputValue(v) {
        return (v || '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0,4);
      }

      // keep input normalized as user types
      if (input) {
        input.addEventListener('input', () => {
          const normalized = normalizeInputValue(input.value);
          if (input.value !== normalized) input.value = normalized;
        });
      }

      async function joinWithCode(c) {
        const codeClean = normalizeInputValue(c || (input && input.value));
        if (!validateRoomCode(codeClean)) {
          setStatus(codeClean.length === 0 ? 'Room code is required.' : 'Enter exactly 4 letters.', false);
          return;
        }

        setStatus('Joining...');
        socket.emit('join', codeClean);
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
      const autoCode = normalizeInputValue(params.get('code'));
      if (autoCode && validateRoomCode(autoCode)) {
        if (input) input.value = autoCode;
        joinWithCode(autoCode);
      }

      socket.on('join_response', (status) => {
        // server returns either 'success' or 'error'
        if (status === 'success') {
          setStatus('Joined — waiting for game', true);
          if (input) input.disabled = true;
          if (joinBtn) joinBtn.disabled = true;
        } else { // 'error' (or any unexpected value)
          setStatus('Failed to join — invalid code', false);
        }
      });

      socket.on('session_ended', () => {
        setStatus('Session ended', false);
        if (input) input.disabled = false;
        if (joinBtn) joinBtn.disabled = false;
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
