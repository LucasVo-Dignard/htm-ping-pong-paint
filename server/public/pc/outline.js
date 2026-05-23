const socket = io();
const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');
const codeBlock = document.getElementById('code-block');
const startBtn = document.getElementById('start-btn');

socket.on('code', (code) => {
  codeBlock.innerHTML = code.split('').map(c => `<div class="code-char">${c}</div>`).join('');
 });

// dot.classList.add('connected');
// statusText.textContent = 'Connected';
// startBtn.disabled = false;

socket.on('disconnect', () => {
  console.log("disconnected");
});
