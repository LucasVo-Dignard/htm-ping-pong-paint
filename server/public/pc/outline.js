const socket = io();
const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');
const codeBlock = document.getElementById('code-block');
const startBtn = document.getElementById('start-btn');
let currentCode = '';
window.selectedCanvasUrl = null; // null represents the blank canvas

async function loadCanvasOptions() {
  const imageGrid = document.getElementById('image-grid');
  if (!imageGrid) return;

  // 1. Create Blank Canvas Option
  const blankDiv = document.createElement('div');
  blankDiv.className = 'canvas-option selected';
  blankDiv.innerHTML = `<div class="canvas-info" style="margin-left:auto; margin-right:auto;"><strong>Blank Canvas</strong></div>`;
  blankDiv.addEventListener('click', () => {
    document.querySelectorAll('.canvas-option').forEach(el => el.classList.remove('selected'));
    blankDiv.classList.add('selected');
    window.selectedCanvasUrl = null;
  });
  imageGrid.appendChild(blankDiv);

  // 2. Fetch and populate Image Options
  try {
    const response = await fetch('/images/info.json');
    const data = await response.json();
    
    let images = [];
    if (Array.isArray(data)) {
      images = data;
    } else {
      // Search for any top-level key that contains an array (like "paintings")
      const foundArray = Object.values(data).find(val => Array.isArray(val));
      if (foundArray) {
        images = foundArray;
      } else {
        // Fallback for { "01.webp": { "title": "..." } } dictionary style
        images = Object.entries(data).map(([key, val]) => ({
          filename: key,
          ...(typeof val === 'object' ? val : { value: val })
        }));
      }
    }
    
    images.forEach(imgData => {
      // Find the file name dynamically
      const imgName = imgData.file || imgData.filename || imgData.src; 
      if (!imgName) return; // Skip if no image file is found

      const imgUrl = `/images/files/${imgName}`;
      
      const imgDiv = document.createElement('div');
      imgDiv.className = 'canvas-option';
      
      const imgEl = document.createElement('img');
      imgEl.src = imgUrl;
      imgEl.alt = imgData.title || imgName;
      
      // Extract data with fallbacks for common JSON keys
      const pName = imgData.paintingName || imgData.title || imgData.name || 'Unknown Title';
      const pArtist = imgData.paintingArtist || imgData.artist || imgData.author || 'Unknown Artist';
      const pDate = imgData.date || imgData.year || 'N/A';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'canvas-info';
      // Apply the template format: {paintingName} - {paintingArtist} ({date})
      infoDiv.innerHTML = `<div><strong>${pName}</strong> - ${pArtist} (${pDate})</div>`;
      
      imgDiv.appendChild(imgEl);
      imgDiv.appendChild(infoDiv);
      
      imgDiv.addEventListener('click', () => {
        document.querySelectorAll('.canvas-option').forEach(el => el.classList.remove('selected'));
        imgDiv.classList.add('selected');
        window.selectedCanvasUrl = imgUrl;
      });
      
      imageGrid.appendChild(imgDiv);
    });
  } catch (error) {
    console.error('Error loading image options:', error);
  }
}

// Initialize options
loadCanvasOptions();

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

if (startBtn) {
  startBtn.addEventListener('click', () => {
    const lobbyContainer = document.getElementById('lobby-container');
    const gameContainer = document.getElementById('game-container');
    
    if (lobbyContainer && gameContainer) {
      lobbyContainer.style.display = 'none';
      gameContainer.style.display = 'block';
      
      // Dispatch a resize event to ensure Three.js canvas size is correct 
      // since it was initialized while display was 'none'
      window.dispatchEvent(new Event('resize'));
      // Mark game as started in the 3D script
      if (typeof startGame === 'function') startGame();
    }
  });
}

socket.on('hit', (hitData) => {
  console.log('Received hit from mobile:', hitData);
  // Ignore hits until the game has started
  if (!window.gameStarted) return;
  
  if (hitData && hitData.directionVector) {
    // Map acceleration to speed input (adjust multiplier as needed)
    const accel = Math.abs(hitData.zAcceleration || 15);
    const newSpeed = Math.min(200, Math.floor(50 + (accel - 15) * 5));

    // Map direction vector to angles
    const dir = hitData.directionVector;
    const isBackhand = (hitData.zAcceleration || 0) > 0;
    
    // angleX: Horizontal angle (Rotation around Y axis)
    // Backhand swings produce a smaller X component — boost to compensate
    const xMultiplier = isBackhand ? 70 : 45;
    const newAngleX = Math.floor(dir.x * xMultiplier);

    // angleY: Vertical angle (Rotation around X axis)
    // We can use z (Up) to determine the vertical angle
    const newAngleY = Math.floor(dir.z * 45);

    if (typeof updateSwing === 'function') {
      updateSwing(newSpeed, newAngleX, newAngleY);
    } else {
      // Fallback if script.js isn't loaded or updated
      const speedInput = document.getElementById('speed');
      if (speedInput) speedInput.value = newSpeed;
      const angleXInput = document.getElementById('angleX');
      if (angleXInput) angleXInput.value = newAngleX;
      const angleYInput = document.getElementById('angleY');
      if (angleYInput) angleYInput.value = newAngleY;
    }

    // Trigger the launch
    if (typeof launchBall === 'function') {
      launchBall();
    }
  }
});

let woodBuffer = null;
let plasticBuffer = null;

// Pre-load sound buffers
(async () => {
  try {
    if (typeof loadSound === 'function') {
      woodBuffer = await loadSound('/sounds/wood.wav');
      plasticBuffer = await loadSound('/sounds/plastic.wav');
      window.woodBuffer = woodBuffer;
      window.plasticBuffer = plasticBuffer;
      console.log('Sound buffers loaded');
    }
  } catch (error) {
    console.warn('Failed to preload sound buffers:', error);
  }
})();

socket.on('material_select', async (data) => {
  console.log('Material selected by mobile:', data);
  
  if (!data || !data.material) {
    return;
  }

  const material = data.material.toLowerCase();
  window.selectedMaterial = material;

  if (material === 'metal') {
    if (typeof playMetalSound === 'function') {
      playMetalSound(500);
    }
  } else if (material === 'wood') {
    if (woodBuffer && typeof playSoundWithPitch === 'function') {
      await playSoundWithPitch(woodBuffer, 1.0);
    }
  } else if (material === 'plastic') {
    if (plasticBuffer && typeof playSoundWithPitch === 'function') {
      await playSoundWithPitch(plasticBuffer, 1.0);
    }
  }
});
