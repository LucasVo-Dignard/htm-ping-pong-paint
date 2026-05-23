const socket = io();
const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');
const codeBlock = document.getElementById('code-block');
const startBtn = document.getElementById('start-btn');
let currentCode = '';

async function copyRoomCode() {
  if (!currentCode || !codeBlock) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentCode);
    } else {
      const tempInput = document.createElement('textarea');
      tempInput.value = currentCode;
      tempInput.setAttribute('readonly', 'true');
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-9999px';
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }

    if (statusText) {
      const previousStatus = statusText.textContent;
      statusText.textContent = 'Code copied';
      window.setTimeout(() => {
        statusText.textContent = previousStatus;
      }, 1200);
    }
  } catch (error) {
    console.error('Failed to copy room code', error);
  }
}

if (codeBlock) {
  codeBlock.addEventListener('click', copyRoomCode);
}

socket.on('code', (code) => {
  if (!codeBlock) return;
  currentCode = code;
  codeBlock.innerHTML = code.split('').map(c => `<div class="code-char">${c}</div>`).join('');
 });

// dot.classList.add('connected');
// statusText.textContent = 'Connected';
// startBtn.disabled = false;

socket.on('disconnect', () => {
  console.log("disconnected");
});
