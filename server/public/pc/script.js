
// Three.js Scene Setup
let scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// ── CAMERA: wider FOV + much closer to the action ──────────────────────
let camera = new THREE.PerspectiveCamera(
    95,                                    // wider FOV for immersive feel
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 1.2, 3);           // eye-level, right at the near end
camera.lookAt(0, 1.5, -12);               // look toward the board

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

// Lighting
let ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

// Grid
let gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
gridHelper.position.z = -10;
scene.add(gridHelper);

// ── BOARD: bigger and closer so it fills the far end ───────────────────
let BOARD_Z = -14;
let BOARD_NEAR = -5;  // near bounce wall Z
const BOARD_W = 40;
const BOARD_H = 28;

let boardGeometry = new THREE.PlaneGeometry(BOARD_W, BOARD_H);
let boardMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
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
    color: 0xff6b35,
    metalness: 0.3,
    roughness: 0.4,
    emissive: 0xff4500,
    emissiveIntensity: 0.1
});
let ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ballMesh);

// Physics simulation (simplified)
let ballPhysics = {
    pos: new THREE.Vector3(0, 1, BOARD_NEAR),
    vel: new THREE.Vector3(0, 0, 0),
    radius: 0.2,
    gravity: 0.08,
    damping: 0.995,
    bounceDamping: 0.85
};

let isFlying = false;
let queuedInput = null;

function launchBall() {
    if (isFlying && !queuedInput) {
        queueInput();
        return;
    }

    if (isFlying) return;

    let speed = parseFloat(document.getElementById('speed').value) || 10;
    let angleX = (parseFloat(document.getElementById('angleX').value) || 0) * Math.PI / 180;
    let angleY = (parseFloat(document.getElementById('angleY').value) || 0) * Math.PI / 180;

    let horizComponent = Math.cos(angleY);
    ballPhysics.vel.x = speed * Math.sin(angleX) * horizComponent;
    ballPhysics.vel.y = speed * Math.sin(angleY);
    ballPhysics.vel.z = -speed * Math.cos(angleX) * horizComponent;

    isFlying = true;
    queuedInput = null;
    document.getElementById('queuedIndicator').classList.remove('active');
    document.getElementById('queuedIndicator').textContent = 'No input queued';
    updateStatus();
}

function queueInput() {
    queuedInput = true;
    document.getElementById('queuedIndicator').classList.add('active');
    document.getElementById('queuedIndicator').textContent = '✓ Input queued - will launch on return';
}

function resetScene() {
    ballPhysics.pos.set(0, 1, BOARD_NEAR);
    ballPhysics.vel.set(0, 0, 0);
    isFlying = false;
    queuedInput = null;
    document.getElementById('queuedIndicator').classList.remove('active');
    document.getElementById('queuedIndicator').textContent = 'No input queued';
    updateStatus();
}

function updateStatus() {
    let launchBtn = document.getElementById('launchBtn');
    if (isFlying) {
        document.getElementById('statusBar').textContent = 'Ball in flight... Press LAUNCH to queue next shot';
        launchBtn.textContent = queuedInput ? '✓ QUEUED' : '⏱ QUEUE';
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

function updatePhysics() {
    if (!isFlying) return;

    // Gravity
    ballPhysics.vel.y -= ballPhysics.gravity;

    // Damping
    ballPhysics.vel.multiplyScalar(ballPhysics.damping);

    // Stop if too slow
    if (ballPhysics.vel.length() < 0.01) {
        ballPhysics.vel.set(0, 0, 0);
    }

    // Update position
    ballPhysics.pos.add(ballPhysics.vel);

    // ── Compute visible bounds at ball's current Z so it stays on screen ──
    const distToCamera = Math.abs(ballPhysics.pos.z - CAMERA_Z);
    const halfH = distToCamera * Math.tan((95 / 2) * Math.PI / 180);
    const halfW = halfH * (window.innerWidth / window.innerHeight);
    const r = ballPhysics.radius;

    // Horizontal
    if (ballPhysics.pos.x > halfW - r) {
        ballPhysics.pos.x = halfW - r;
        ballPhysics.vel.x *= -ballPhysics.bounceDamping;
    }
    if (ballPhysics.pos.x < -(halfW - r)) {
        ballPhysics.pos.x = -(halfW - r);
        ballPhysics.vel.x *= -ballPhysics.bounceDamping;
    }
    // Vertical
    const camY = 1.2; // camera.position.y
    if (ballPhysics.pos.y > camY + halfH - r) {
        ballPhysics.pos.y = camY + halfH - r;
        ballPhysics.vel.y *= -ballPhysics.bounceDamping;
    }
    if (ballPhysics.pos.y < camY - halfH + r) {
        ballPhysics.pos.y = camY - halfH + r;
        ballPhysics.vel.y *= -ballPhysics.bounceDamping;
    }

    // Board collision (at BOARD_Z)
    if (ballPhysics.pos.z < BOARD_Z) {
        ballPhysics.pos.z = BOARD_Z;
        ballPhysics.vel.z *= -ballPhysics.bounceDamping;

        if (ballPhysics.vel.z > -0.1 && ballPhysics.vel.length() < 2) {
            if (queuedInput) {
                setTimeout(launchBall, 400);
            } else {
                isFlying = false;
                updateStatus();
            }
        }
    }

    // Return to user (near wall)
    if (ballPhysics.pos.z > BOARD_NEAR) {
        ballPhysics.pos.z = BOARD_NEAR;
        ballPhysics.vel.z *= -ballPhysics.bounceDamping;

        if (ballPhysics.vel.length() < 1) {
            isFlying = false;
            updateStatus();
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    updatePhysics();

    // Update ball mesh position
    ballMesh.position.copy(ballPhysics.pos);

    updateInfo();

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Keyboard input
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && isFlying && !queuedInput) {
        queueInput();
    } else if (e.key === ' ') {
        e.preventDefault();
        launchBall();
    }
});

// Initialize
resetScene();
animate();