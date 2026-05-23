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

socket.on('connect', () => {
  socket.emit('register', 'pc');
});

// get the connected count element
const connectedCountNumber = document.getElementById('connected-count-number');

socket.on('mobile_update', (data) => {
  // Update the UI to show the number of connected mobile clients
  const count = data && typeof data.count === 'number' ? data.count : 0;

  if (connectedCountNumber) {
    connectedCountNumber.textContent = String(count);
  }

  // update dot class to reflect connection state
  if (dot) {
    if (count > 0) {
      dot.classList.add('connected');
      dot.classList.remove('disconnected');
    } else {
      dot.classList.remove('connected');
      dot.classList.add('disconnected');
    }
  }

  // update status text to be informative
  if (statusText) {
    statusText.textContent = count > 0
      ? `${count} device${count === 1 ? '' : 's'} connected`
      : 'Connect your mobile device(s) at pingpongpaint.ca/mobile';
  }

  // enable start button when at least one mobile is connected
  if (startBtn) {
    startBtn.disabled = !(count > 0);
  }
});

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
