const socket = io();

socket.on('code', (code) => {
  codeBlock.innerHTML = code.split('').map(c => `<div class="code-char">${c}</div>`).join('');
 });

// dot.classList.add('connected');
// statusText.textContent = 'Connected';
// startBtn.disabled = false;

socket.on('disconnect', () => {
  console.log("disconnected");
});
