// Mobile outline script
// This file defines the client-side structure and page behavior for the mobile version.
const mobileOutline = {
  init() {
    const root = document.getElementById('app');
    if (!root) return;

    const card = root.querySelector('.page-card');
    if (!card) return;

    this.showTouchHint(card);

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

      // determine room code:
      // 1) query param ?code=XXXX
      // 2) input field with id "code-input"
      // 3) prompt the user (fallback)
      const params = new URLSearchParams(window.location.search);
      let code = params.get('code');

      const input = document.getElementById('code-input') || document.querySelector('input[name="code"]');
      if (!code && input && input.value) code = input.value.trim();

      async function joinWithCode(c) {
        if (!c) {
          // fallback prompt
          c = window.prompt('Enter room code:');
          if (!c) {
            setStatus('No code provided', false);
            return;
          }
        }
        setStatus('Joining...');
        socket.emit('join', c);
      }

      // if there's an input + button, wire them up
      const joinBtn = document.getElementById('join-btn') || card.querySelector('button.join-btn');
      if (joinBtn && input) {
        joinBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const v = input.value && input.value.trim();
          joinWithCode(v);
        });
      }

      // attempt auto-join when code available from query or input
      if (code) joinWithCode(code);

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
  },

  showTouchHint(card) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Tip: Mobile pages should prioritize touch interactions and responsive layout.';
    card.appendChild(hint);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  mobileOutline.init();
});
