
// Three.js Scene Setup
let scene = new THREE.Scene();

// ── CAMERA: wider FOV + much closer to the action ──────────────────────
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 30;

// Orthographic camera for the game elements (Layer 0)
let camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);
camera.position.set(0, 12, 5);
camera.lookAt(0, 12, -14);

// Perspective camera for the floor (Layer 1)
let cameraPersp = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
cameraPersp.position.set(0, 12, 5);
cameraPersp.lookAt(0, 12, -14);
cameraPersp.layers.set(1);

const canvas = document.getElementById('canvas');
let renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.setClearColor(0xF5F0E8);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = false;
renderer.autoClear = false; // Disable autoClear for dual-camera rendering

// Lighting
let ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
ambientLight.layers.enable(1); // Enable for Layer 1
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 15, 10);
directionalLight.layers.enable(1); // Enable for Layer 1
scene.add(directionalLight);

// Grid
let gridHelper = new THREE.GridHelper(50, 50, 0x8B7355, 0x8B7355);
gridHelper.position.z = -10;
gridHelper.layers.set(1); // Set to Layer 1
scene.add(gridHelper);

// Floor
let floorGeometry = new THREE.PlaneGeometry(50, 50);
let floorMaterial = new THREE.MeshStandardMaterial({ color: 0xA73F2A });
let floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // rotate flat
floor.position.set(0, 0, -10);   // match gridHelper position
floor.layers.set(1); // Set to Layer 1
scene.add(floor);

// ── BOARD: bigger and closer so it fills the far end ───────────────────
let BOARD_Z = -10;
let BOARD_NEAR = 2.5;  // near bounce wall Z
const BOARD_W = 40;
const BOARD_H = 25;

// Create a canvas texture for the board
const boardTextureCanvas = document.createElement('canvas');
boardTextureCanvas.width = 1600;  // 4x resolution for better clarity
boardTextureCanvas.height = 1000; // maintains 40:25 ratio
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
board.position.set(0, BOARD_H / 2, BOARD_Z);
scene.add(board);

// Camera is fixed at z=3; keep near wall always in front of it
const CAMERA_Z = 3;
const NEAR_WALL_MAX = CAMERA_Z - 0.5; // ball can get at most this close (z=2.5)

// Ball
let ballGeometry = new THREE.SphereGeometry(1.0, 32, 32);
let ballMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.3,
    roughness: 0.4,
    emissive: 0xff4500,
    emissiveIntensity: 0.05
});
const balls = [];
let ballIdCounter = 0;

function createBall() {
    const mesh = new THREE.Mesh(ballGeometry, ballMaterial);
    scene.add(mesh);

    const ball = {
        id: ++ballIdCounter,
        mesh,
        physics: {
            pos: new THREE.Vector3(0, 4, BOARD_NEAR),
            vel: new THREE.Vector3(0, 0, 0)
        },
        isFlying: false,
        idleTimer: null
    };
    resetBall(ball);
    return ball;
}

function removeBall(ball) {
    if (!ball) return;
    if (ball.idleTimer) {
        clearTimeout(ball.idleTimer);
        ball.idleTimer = null;
    }
    scene.remove(ball.mesh);
    const index = balls.indexOf(ball);
    if (index !== -1) balls.splice(index, 1);
}

function setBallCount(count) {
    count = Math.max(0, Math.floor(count));
    while (balls.length < count) {
        balls.push(createBall());
    }
    while (balls.length > count) {
        removeBall(balls[balls.length - 1]);
    }
    // Refresh UI
    updateInfo();
    updateStatus();
}

function getHittableBalls() {
    return balls.filter(ball => ball.mesh.visible && !ball.isFlying && ball.physics.pos.z >= (BOARD_NEAR - HITTING_ZONE_DEPTH));
}

function chooseRandomHittableBall() {
    const hittable = getHittableBalls();
    if (!hittable.length) return null;
    return hittable[Math.floor(Math.random() * hittable.length)];
}

window.setBallCount = setBallCount;
// Apply any pending count set by outline before script loaded
if (window.__pendingBallCount !== undefined) {
    setBallCount(window.__pendingBallCount);
    delete window.__pendingBallCount;
}

// ── RAYCASTING for board clicks ──────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Create drawer service for the board texture
const boardDrawerService = new InkDrawerService(boardTextureCanvas);

// Physics simulation (simplified)
let ballPhysics = {
    pos: new THREE.Vector3(0, 4, BOARD_NEAR),
    vel: new THREE.Vector3(0, 0, 0),
    radius: 1.0,
    gravity: 0.003,
    damping: 0.999,
    bounceDamping: 0.85,
    swingAccelerationScale: 0.01
};

// Game state
let gameStarted = false;
window.gameStarted = gameStarted;

function startGame() {
    gameStarted = true;
    window.gameStarted = true;
    // Ensure UI reflects the started state
    const indicator = document.getElementById('queuedIndicator');
    if (indicator) {
        indicator.classList.add('active');
        indicator.textContent = 'Ready';
    }
    updateStatus();
}

// expose startGame globally so other scripts can call it
window.startGame = startGame;

const IDLE_THRESHOLD = 0.02;
const IDLE_RESET_DELAY = 2000;
const MAX_SPEED = 0.5;
const SWING_ORIENTATION_SCALE = 1.2;
const HITTING_ZONE_DEPTH = 3.0;

// Swing variables
let currentSwingSpeed = 50;
let currentSwingAngleX = 0;
let currentSwingAngleY = 0;

function updateSwing(speed, angleX, angleY) {
    if (speed !== undefined) currentSwingSpeed = speed;
    if (angleX !== undefined) currentSwingAngleX = angleX;
    if (angleY !== undefined) currentSwingAngleY = angleY;
}

function launchBall() {
    // Don't allow hits before the game has started
    if (!gameStarted) {
        const statusBarEl = document.getElementById('statusBar');
        if (statusBarEl) statusBarEl.textContent = 'Game not started • Press START';
        return;
    }

    const targetBall = chooseRandomHittableBall();
    if (!targetBall) {
        return;
    }

    if (!targetBall.mesh.visible) return;

    if (targetBall.isFlying && targetBall.physics.pos.z < (BOARD_NEAR - HITTING_ZONE_DEPTH)) {
        return;
    }

    let speed = (currentSwingSpeed || 10) * ballPhysics.swingAccelerationScale;
    let angleX = (currentSwingAngleX || 0) * SWING_ORIENTATION_SCALE * Math.PI / 180;
    let angleY = (currentSwingAngleY || 0) * SWING_ORIENTATION_SCALE * Math.PI / 180;

    let horizComponent = Math.cos(angleY);
    targetBall.physics.vel.x = speed * Math.sin(angleX) * horizComponent;
    targetBall.physics.vel.y = speed * Math.sin(angleY);
    targetBall.physics.vel.z = -Math.abs(speed * Math.cos(angleX) * horizComponent);

    targetBall.isFlying = true;
    if (targetBall.idleTimer) {
        clearTimeout(targetBall.idleTimer);
        targetBall.idleTimer = null;
    }

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

function resetBall(ball) {
    if (!ball) return;
    const randomX = (Math.random() - 0.5) * (BOARD_W - ballPhysics.radius * 2);
    const randomY = ballPhysics.radius + Math.random() * (BOARD_H - ballPhysics.radius);

    ball.physics.pos.set(randomX, randomY, BOARD_NEAR);
    ball.physics.vel.set(0, 0, 0);
    ball.isFlying = false;
    ball.mesh.visible = true;

    if (ball.idleTimer) {
        clearTimeout(ball.idleTimer);
        ball.idleTimer = null;
    }

    let indicator = document.getElementById('queuedIndicator');
    if (indicator) {
        indicator.classList.remove('active');
        indicator.textContent = 'Ready';
    }
    updateStatus();
}

function updateStatus() {
    const statusBarEl = document.getElementById('statusBar');
    if (statusBarEl) {
        if (!gameStarted) {
            statusBarEl.textContent = 'Game not started • Press START';
            return;
        }
        if (balls.length === 0) {
            statusBarEl.textContent = 'Waiting for mobile devices...';
            return;
        }
        const anyFlying = balls.some(ball => ball.isFlying);
        const anyReady = balls.some(ball => ball.mesh.visible && !ball.isFlying);
        if (anyFlying) {
            statusBarEl.textContent = 'Ball in flight... Wait for it to return to the hitting zone';
        } else if (anyReady) {
            statusBarEl.textContent = 'Ready • Press Space or Enter to begin';
        } else {
            statusBarEl.textContent = 'Preparing balls...';
        }
    }

    const infoStatusEl = document.getElementById('infoStatus');
    if (infoStatusEl) {
        const anyFlying = balls.some(ball => ball.isFlying);
        infoStatusEl.textContent = anyFlying ? 'Flying' : 'Idle';
    }
}

function updateInfo() {
    const infoCount = document.getElementById('infoCount');
    const trackedBall = balls.find(ball => ball.mesh.visible) || balls[0] || null;
    const speed = trackedBall ? trackedBall.physics.vel.length() : 0;
    const z = trackedBall ? Math.abs(trackedBall.physics.pos.z) : 0;
    const y = trackedBall ? trackedBall.physics.pos.y : 0;

    if (infoCount) {
        infoCount.textContent = String(balls.length);
    }
    document.getElementById('infoZ').textContent = z.toFixed(1);
    document.getElementById('infoSpeed').textContent = speed.toFixed(2);
    document.getElementById('infoY').textContent = y.toFixed(2);
}

function drawSplashOnBoard(ballPos) {
    // Convert ball's world position to board's local coordinates
    const boardCenterY = BOARD_H / 2;
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
    function updateBallPhysics(ball, deltaSec) {
        if (!ball.isFlying) return;
        const t = deltaSec * 60;

        ball.physics.vel.y -= ballPhysics.gravity * t;
        ball.physics.vel.multiplyScalar(Math.pow(ballPhysics.damping, t));

        if (ball.physics.vel.length() > MAX_SPEED) {
            ball.physics.vel.normalize().multiplyScalar(MAX_SPEED);
        }

        if (Math.abs(ball.physics.vel.x) < 0.01) ball.physics.vel.x = 0;
        if (Math.abs(ball.physics.vel.z) < 0.01) ball.physics.vel.z = 0;

        ball.physics.pos.x += ball.physics.vel.x * t;
        ball.physics.pos.y += ball.physics.vel.y * t;
        ball.physics.pos.z += ball.physics.vel.z * t;

        const r = ballPhysics.radius;
        const halfW = BOARD_W / 2;
        const boardTop = board.position.y + BOARD_H / 2;

        if (ball.physics.pos.x > halfW - r) {
            ball.physics.pos.x = halfW - r;
            ball.physics.vel.x *= -ballPhysics.bounceDamping;
        }
        if (ball.physics.pos.x < -(halfW - r)) {
            ball.physics.pos.x = -(halfW - r);
            ball.physics.vel.x *= -ballPhysics.bounceDamping;
        }

        if (ball.physics.pos.y > boardTop - r) {
            ball.physics.pos.y = boardTop - r;
            ball.physics.vel.y *= -ballPhysics.bounceDamping;
        }

        if (ball.physics.pos.y < r) {
            ball.physics.pos.y = r;
            ball.physics.vel.y *= -ballPhysics.bounceDamping;
        }

        if (ball.physics.pos.z < BOARD_Z) {
            drawSplashOnBoard(ball.physics.pos);
            const impactSpeed = Math.abs(ball.physics.vel.z);
            const material = window.selectedMaterial || 'metal';
            if (material === 'wood' && window.woodBuffer && typeof window.playSoundWithPitch === 'function') {
                const pitch = 0.8 + Math.min(impactSpeed * 0.4, 0.8);
                window.playSoundWithPitch(window.woodBuffer, pitch);
            } else if (material === 'plastic' && window.plasticBuffer && typeof window.playSoundWithPitch === 'function') {
                const pitch = 0.8 + Math.min(impactSpeed * 0.4, 0.8);
                window.playSoundWithPitch(window.plasticBuffer, pitch);
            } else {
                const frequency = 400 + Math.min(impactSpeed * 200, 400);
                window.playMetalSound(frequency);
            }

            ball.mesh.visible = false;
            ball.isFlying = false;
            ball.physics.vel.set(0, 0, 0);
            ball.lastCollisionZ = ball.physics.pos.z;

            setTimeout(() => {
                resetBall(ball);
            }, 250);
            return;
        }

        if (ball.physics.pos.z > BOARD_NEAR) {
            ball.physics.pos.z = BOARD_NEAR;
            ball.physics.vel.z *= -ballPhysics.bounceDamping;
        }

        if (Math.abs(ball.physics.vel.x) < IDLE_THRESHOLD &&
            Math.abs(ball.physics.vel.y) < IDLE_THRESHOLD &&
            Math.abs(ball.physics.vel.z) < IDLE_THRESHOLD) {
            if (!ball.idleTimer) {
                ball.idleTimer = setTimeout(() => {
                    resetBall(ball);
                    ball.idleTimer = null;
                }, IDLE_RESET_DELAY);
            }
        } else {
            if (ball.idleTimer) {
                clearTimeout(ball.idleTimer);
                ball.idleTimer = null;
            }
        }
    }

    balls.forEach(ball => updateBallPhysics(ball, delta));
}



const clock = new THREE.Clock();


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // seconds since last frame
    updatePhysics(delta);

        balls.forEach((ball) => {
            if (!ball.mesh.visible) return;
            ball.mesh.position.copy(ball.physics.pos);

            const dist = camera.position.z - ball.physics.pos.z;
            const refDist = camera.position.z - BOARD_NEAR;
            const linearScaleFactor = 0.06;
            let scale = 1.0 - ((dist - refDist) * linearScaleFactor);
            if (scale < 0) scale = 0;
            ball.mesh.scale.setScalar(scale);
            ball.mesh.position.y -= ball.physics.radius * (1 - scale);
        });

    updateInfo();
    
    // Dual-camera rendering
    renderer.clear(); // Clear color and depth
    
    // 1. Render Layer 1 (Perspective Floor)
    cameraPersp.layers.set(1);
    renderer.render(scene, cameraPersp);
    
    renderer.clearDepth(); // Clear depth buffer so ortho objects render on top
    
    // 2. Render Layer 0 (Orthographic Game Elements)
    camera.layers.set(0);
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    
    // Update Orthographic camera
    const frustumSize = 30;
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    
    // Update Perspective camera
    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();
    
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
// Initialize
setBallCount(0);
animate();;