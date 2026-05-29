import { loadSound, audioCtx } from './load-sound';
import { playSoundWithPitch } from './play-sound';
import { playMetalSound } from './metallic-sound';
import { setBallCount, startGame, updateSwing, launchBall, getHittableBalls } from './script';
import { SocketEvents, Material } from '../../shared/constants';

declare const io: any;
const socket = io();

const codeBlock = document.getElementById('code-block');
const startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
let currentCode = '';

(window as any).selectedCanvasUrl = null; // null represents the blank canvas

interface ImageInfo {
  file?: string;
  filename?: string;
  src?: string;
  title?: string;
  name?: string;
  paintingName?: string;
  paintingArtist?: string;
  artist?: string;
  author?: string;
  date?: string;
  year?: string;
}

async function loadCanvasOptions(): Promise<void> {
  const imageGrid = document.getElementById('image-grid');
  if (!imageGrid) return;

  // 1. Create Blank Canvas Option
  const blankDiv = document.createElement('div');
  blankDiv.className = 'canvas-option selected';
  blankDiv.innerHTML = `<div class="canvas-info" style="margin-left:auto; margin-right:auto;"><strong>Blank Canvas</strong></div>`;
  blankDiv.addEventListener('click', () => {
    document.querySelectorAll('.canvas-option').forEach(el => el.classList.remove('selected'));
    blankDiv.classList.add('selected');
    (window as any).selectedCanvasUrl = null;
  });
  imageGrid.appendChild(blankDiv);

  // 2. Fetch and populate Image Options
  try {
    const response = await fetch('/images/info.json');
    const data = await response.json();
    
    let images: ImageInfo[] = [];
    if (Array.isArray(data)) {
      images = data;
    } else {
      // Search for any top-level key that contains an array (like "paintings")
      const foundArray = Object.values(data).find(val => Array.isArray(val));
      if (foundArray) {
        images = foundArray as ImageInfo[];
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
        (window as any).selectedCanvasUrl = imgUrl;
      });
      
      imageGrid.appendChild(imgDiv);
    });
  } catch (error) {
    console.error('Error loading image options:', error);
  }
}

// Initialize options
loadCanvasOptions();

async function copyRoomCode(): Promise<void> {
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
  } catch (error) {
    console.error('Failed to copy room code', error);
  }
}

if (codeBlock) {
  codeBlock.addEventListener('click', copyRoomCode);
}

socket.on(SocketEvents.CONNECT, () => {
  socket.emit(SocketEvents.REGISTER, 'pc');
});

// get the connected count element
const connectedCountNumber = document.getElementById('connected-count-number');

socket.on(SocketEvents.MOBILE_UPDATE, (data: { count?: number }) => {
  // Update the UI to show the number of connected mobile clients
  const count = data && typeof data.count === 'number' ? data.count : 0;

  if (connectedCountNumber) {
    connectedCountNumber.textContent = String(count);
  }

  // enable start button when at least one mobile is connected
  if (startBtn) {
    startBtn.disabled = !(count > 0);
  }

  setBallCount(count);
});

socket.on(SocketEvents.CODE, (code: string) => {
  if (!codeBlock) return;
  currentCode = code;
  codeBlock.innerHTML = code.split('').map(c => `<div class="code-char">${c}</div>`).join('');
});

if (startBtn) {
  startBtn.addEventListener('click', async () => {
    const lobbyContainer = document.getElementById('lobby-container');
    const gameContainer = document.getElementById('game-container');
    
    if (lobbyContainer && gameContainer) {
      lobbyContainer.style.display = 'none';
      gameContainer.style.display = 'block';
      
      // Dispatch a resize event to ensure Three.js canvas size is correct 
      // since it was initialized while display was 'none'
      window.dispatchEvent(new Event('resize'));

      // Resume AudioContext on user gesture
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Load sounds when the game starts so there is no delay
      try {
        woodBuffer = await loadSound('/sounds/wood.wav');
        plasticBuffer = await loadSound('/sounds/plastic.wav');
        (window as any).woodBuffer = woodBuffer;
        (window as any).plasticBuffer = plasticBuffer;
      } catch (error) {
        console.warn('Failed to load sound buffers:', error);
      }

      // Mark game as started in the 3D script
      startGame();

      // Notify the server (and mobile clients) that the game has started
      socket.emit(SocketEvents.GAME_START);
    }
  });
}

socket.on(SocketEvents.HIT, (hitData: any) => {
  // Ignore hits until the game has started
  if (!(window as any).gameStarted) return;
  
  if (hitData && hitData.directionVector) {
    const accel = Math.abs(hitData.zAcceleration || 15);
    const newSpeed = Math.min(200, Math.floor(50 + (accel - 15) * 5));

    const dir = hitData.directionVector;
    const isBackhand = (hitData.zAcceleration || 0) > 0;
    
    const xMultiplier = isBackhand ? 70 : 45;
    const newAngleX = Math.floor(dir.x * xMultiplier);

    const newAngleY = Math.floor(dir.z * 45);

    updateSwing(newSpeed, newAngleX, newAngleY);

    // Trigger the launch
    launchBall();
  }
});

export let woodBuffer: AudioBuffer | null = null;
export let plasticBuffer: AudioBuffer | null = null;



socket.on(SocketEvents.MATERIAL_SELECT, async (data: { material?: string }) => {
  if (!data || !data.material) {
    return;
  }

  const material = data.material.toLowerCase();
  (window as any).selectedMaterial = material;

  if (material === Material.METAL) {
    playMetalSound(500);
  } else if (material === Material.WOOD) {
    if (woodBuffer) {
      await playSoundWithPitch(woodBuffer, 1.0);
    }
  } else if (material === Material.PLASTIC) {
    if (plasticBuffer) {
      await playSoundWithPitch(plasticBuffer, 1.0);
    }
  }
});

// Track the "hittable ball" status and emit state changes to the server
let lastHittableState = false;
function checkHittableState() {
  requestAnimationFrame(checkHittableState);
  if (!(window as any).gameStarted) return;

  const isHittable = getHittableBalls().length > 0;
  if (isHittable !== lastHittableState) {
    lastHittableState = isHittable;
    socket.emit(SocketEvents.HITTABLE_STATUS, isHittable);
  }
}
requestAnimationFrame(checkHittableState);
