
// Three.js Scene Setup
let scene = new THREE.Scene();
scene.background = new THREE.Color(0xF5F0E8);

// ── CAMERA: wider FOV + much closer to the action ──────────────────────
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 30;
let camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);
camera.position.set(0, 10, 5);
camera.lookAt(0, 10, -14);

const canvas = document.getElementById('canvas');
let renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = false;

// Lighting
let ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// Grid
let gridHelper = new THREE.GridHelper(50, 50, 0x8B7355, 0x8B7355);
gridHelper.position.z = -10;
scene.add(gridHelper);

// Floor
let floorGeometry = new THREE.PlaneGeometry(50, 50);
let floorMaterial = new THREE.MeshStandardMaterial({ color: 0xA73F2A });
let floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // rotate flat
floor.position.set(0, 0, -10);   // match gridHelper position
scene.add(floor);

// ── BOARD: bigger and closer so it fills the far end ───────────────────
let BOARD_Z = -10;
let BOARD_NEAR = 2.5;  // near bounce wall Z
const BOARD_W = 40;
const BOARD_H = 22;

// Create a canvas texture for the board
const boardTextureCanvas = document.createElement('canvas');
boardTextureCanvas.width = 1600;  // 4x resolution for better clarity
boardTextureCanvas.height = 1120; // maintains 40:28 ratio
const boardCtx = boardTextureCanvas.getContext('2d');
boardCtx.fillStyle = '#f0f0f0';
boardCtx.fillRect(0, 0, boardTextureCanvas.width, boardTextureCanvas.height);

const boardCanvasTexture = new THREE.CanvasTexture(boardTextureCanvas);
boardCanvasTexture.magFilter = THREE.LinearFilter;
boardCanvasTexture.minFilter = THREE.LinearFilter;

let boardGeometry = new THREE.PlaneGeometry(BOARD_W, BOARD_H);
let boardMaterial = new THREE.MeshStandardMaterial({
    map: boardCanvasTexture,
    metalness: 0.1,
    roughness: 0.2
});
let board = new THREE.Mesh(boardGeometry, boardMaterial);
board.position.set(0, BOARD_H / 2 - 4, BOARD_Z);
scene.add(board);

// Camera is fixed at z=3; keep near wall always in front of it
const CAMERA_Z = 3;
const NEAR_WALL_MAX = CAMERA_Z - 0.5; // ball can get at most this close (z=2.5)

function updateBoard() {
    const nearVal = parseFloat(document.getElementById('boardNear').value);
    const farVal = parseFloat(document.getElementById('boardFar').value);

    if (isNaN(nearVal) || isNaN(farVal)) return;
    if (nearVal <= farVal) return; // still typing, ignore

    // Clamp near so ball never passes behind the camera
    BOARD_NEAR = Math.min(nearVal, NEAR_WALL_MAX);
    BOARD_Z = farVal;

    // Move the board mesh
    board.position.z = BOARD_Z;

    // If ball isn't flying, snap it to new near position
    if (!isFlying) {
        ballPhysics.pos.z = BOARD_NEAR;
    }
}

// Ball
let ballGeometry = new THREE.SphereGeometry(0.2, 32, 32);
let ballMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.3,
    roughness: 0.4,
    emissive: 0xff4500,
    emissiveIntensity: 0.1
});
let ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ballMesh);

// ── RAYCASTING for board clicks ──────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Create drawer service for the board texture
const boardDrawerService = new InkDrawerService(boardTextureCanvas);

// Physics simulation (simplified)
let ballPhysics = {
    pos: new THREE.Vector3(0, 16, BOARD_NEAR),
    vel: new THREE.Vector3(0, 0, 0),
    radius: 0.2,
    gravity: 0.003,
    damping: 0.999,
    bounceDamping: 0.85,
    swingAccelerationScale: 0.01
};

const IDLE_THRESHOLD = 0.02;
const IDLE_RESET_DELAY = 2000;
const MAX_SPEED = 0.5;
let idleTimer = null;

let isFlying = false;
const HITTING_ZONE_DEPTH = 3.0;
let lastBoardCollisionZ = null;  // Track last collision to avoid duplicate splashes

function launchBall() {
    // If ball is flying and NOT in the hitting zone, the hit doesn't count
    if (isFlying && ballPhysics.pos.z < (BOARD_NEAR - HITTING_ZONE_DEPTH)) {
        return;
    }

    let speed = (parseFloat(document.getElementById('speed').value) || 10) * ballPhysics.swingAccelerationScale;
    let angleX = (parseFloat(document.getElementById('angleX').value) || 0) * Math.PI / 180;
    let angleY = (parseFloat(document.getElementById('angleY').value) || 0) * Math.PI / 180;

    let horizComponent = Math.cos(angleY);
    ballPhysics.vel.x = speed * Math.sin(angleX) * horizComponent;
    ballPhysics.vel.y = speed * Math.sin(angleY);
    // Force Z velocity to be negative (towards the board)
    ballPhysics.vel.z = -Math.abs(speed * Math.cos(angleX) * horizComponent);

    isFlying = true;
    
    let indicator = document.getElementById('queuedIndicator');
    if (indicator) {
        indicator.classList.remove('active');
        indicator.textContent = 'Hit registered!';
        setTimeout(() => { 
            if (indicator.textContent === 'Hit registered!') {
                indicator.textContent = 'Ready'; 
            }
        }, 1000);
    }
    
    updateStatus();
}

function resetScene() {
    ballPhysics.pos.set(0, 10, BOARD_NEAR);
    ballPhysics.vel.set(0, 0, 0);
    isFlying = false;
    let indicator = document.getElementById('queuedIndicator');
    if (indicator) {
        indicator.classList.remove('active');
        indicator.textContent = 'Ready';
    }
    updateStatus();
}

function updateStatus() {
    let launchBtn = document.getElementById('launchBtn');
    if (isFlying) {
        document.getElementById('statusBar').textContent = 'Ball in flight... Wait for it to return to the hitting zone';
        launchBtn.textContent = 'WAIT';
    } else {
        document.getElementById('statusBar').textContent = 'Ready • Press LAUNCH to begin';
        launchBtn.textContent = '▶ LAUNCH';
    }
    document.getElementById('infoStatus').textContent = isFlying ? 'Flying' : 'Idle';
}

function updateInfo() {
    let speed = ballPhysics.vel.length();
    document.getElementById('infoZ').textContent = Math.abs(ballPhysics.pos.z).toFixed(1);
    document.getElementById('infoSpeed').textContent = speed.toFixed(2);
    document.getElementById('infoY').textContent = ballPhysics.pos.y.toFixed(2);
}

function drawSplashOnBoard(ballPos) {
    // Convert ball's world position to board's local coordinates
    const boardCenterY = BOARD_H / 2 - 4;
    const localX = ballPos.x;
    const localY = ballPos.y - boardCenterY;

    // Convert local coords to UV (0-1 range)
    const uvX = (localX + BOARD_W / 2) / BOARD_W;
    const uvY = (localY + BOARD_H / 2) / BOARD_H;

    // Clamp to valid range
    if (uvX < 0 || uvX > 1 || uvY < 0 || uvY > 1) return;

    // Convert UV to texture pixel coordinates
    const pixelX = uvX * boardTextureCanvas.width;
    const pixelY = (1 - uvY) * boardTextureCanvas.height; // flip Y for canvas coords

    boardDrawerService.drawSplash(pixelX, pixelY);
    boardCanvasTexture.needsUpdate = true;
}

function updatePhysics(delta) {

    if (!isFlying) return;

    const t = delta * 60; // normalize to 60fps

    // Gravity
    ballPhysics.vel.y -= ballPhysics.gravity * t;

    // Damping
    ballPhysics.vel.multiplyScalar(Math.pow(ballPhysics.damping, t));


    //Cap speed
    if(ballPhysics.vel.length() > MAX_SPEED) {
        ballPhysics.vel.normalize().multiplyScalar(MAX_SPEED);
    }

    // Kill horizontal movement if too slow, but keep gravity
    if (Math.abs(ballPhysics.vel.x) < 0.01) ballPhysics.vel.x = 0;
    if (Math.abs(ballPhysics.vel.z) < 0.01) ballPhysics.vel.z = 0;

    // Update position
    ballPhysics.pos.x += ballPhysics.vel.x * t;
    ballPhysics.pos.y += ballPhysics.vel.y * t;
    ballPhysics.pos.z += ballPhysics.vel.z * t;

    const r = ballPhysics.radius;
    const halfW = BOARD_W / 2;
    const boardTop = board.position.y + BOARD_H / 2;
    const boardBottom = board.position.y - BOARD_H / 2;

    // Horizontal bounds (board edges)
    if (ballPhysics.pos.x > halfW - r) {
        ballPhysics.pos.x = halfW - r;
        ballPhysics.vel.x *= -ballPhysics.bounceDamping;
    }
    if (ballPhysics.pos.x < -(halfW - r)) {
        ballPhysics.pos.x = -(halfW - r);
        ballPhysics.vel.x *= -ballPhysics.bounceDamping;
    }

    // Vertical upper bound (top of board)
    if (ballPhysics.pos.y > boardTop - r) {
        ballPhysics.pos.y = boardTop - r;
        ballPhysics.vel.y *= -ballPhysics.bounceDamping;
    }

    // Floor
    if (ballPhysics.pos.y < r) {
        ballPhysics.pos.y = r;
        ballPhysics.vel.y *= -ballPhysics.bounceDamping;
    }

    // Board collision (far wall)
    if (ballPhysics.pos.z < BOARD_Z) {
        // Only create splash if ball just hit the board (crossed threshold)
        if (lastBoardCollisionZ === null || lastBoardCollisionZ > BOARD_Z) {
            drawSplashOnBoard(ballPhysics.pos);
            // Play metallic sound on impact
            const impactSpeed = Math.abs(ballPhysics.vel.z);
            const frequency = 400 + Math.min(impactSpeed * 200, 400); // Higher speed = higher pitch
            playMetalSound(frequency);
        }
        lastBoardCollisionZ = ballPhysics.pos.z;
        ballPhysics.pos.z = BOARD_Z;
        ballPhysics.vel.z *= -ballPhysics.bounceDamping;
    } else {
        lastBoardCollisionZ = null;  // Reset when ball leaves board zone
    }

    // Near wall
    if (ballPhysics.pos.z > BOARD_NEAR) {
        ballPhysics.pos.z = BOARD_NEAR;
        ballPhysics.vel.z *= -ballPhysics.bounceDamping;
    }

    if (Math.abs(ballPhysics.vel.x) < IDLE_THRESHOLD &&
        Math.abs(ballPhysics.vel.y) < IDLE_THRESHOLD &&
        Math.abs(ballPhysics.vel.z) < IDLE_THRESHOLD) {
        if (!idleTimer) {
            idleTimer = setTimeout(() => {
                resetScene();
                idleTimer = null;
            }, IDLE_RESET_DELAY);
        }
    } else {
        // Ball is still moving, cancel any pending reset
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
    }
}



const clock = new THREE.Clock();


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // seconds since last frame
    updatePhysics(delta);

    // Update ball mesh position
    ballMesh.position.copy(ballPhysics.pos);

    updateInfo();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30;
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Keyboard input
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launchBall();
    }
});


// Initialize
resetScene();
animate();;