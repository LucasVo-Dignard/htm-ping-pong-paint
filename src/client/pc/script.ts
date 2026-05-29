import type * as THREE_TYPES from 'three';
import { Container } from 'typedi';
import { InkDrawerService } from './services/ink-drawer-service';
import { loadSound, audioCtx } from './load-sound';
import { playSoundWithPitch } from './play-sound';
import { playMetalSound } from './metallic-sound';
import { Material } from '../../shared/constants';
import {
  CAMERA_FRUSTUM_SIZE,
  CAMERA_ORTHO_POSITION,
  CAMERA_ORTHO_LOOK_AT,
  CAMERA_PERSP_FOV,
  CAMERA_PERSP_POSITION,
  CAMERA_PERSP_LOOK_AT,
  CAMERA_Z,
  NEAR_WALL_MAX,
  RENDERER_CLEAR_COLOR,
  AMBIENT_LIGHT_COLOR,
  AMBIENT_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_COLOR,
  DIRECTIONAL_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_POSITION,
  FLOOR_SIZE,
  FLOOR_POSITION,
  WOOD_FLOOR_TEXTURE_REPEAT,
  WOOD_FLOOR_TEXTURE_PATH,
  WALL_TEXTURE_SIZE,
  WALL_GRADIENT_STOPS,
  WALL_HEIGHT,
  WALL_DEPTH,
  WALL_HALF_WIDTH,
  WALL_BACK_Z,
  BOARD_Z,
  BOARD_NEAR,
  BOARD_W,
  BOARD_H,
  BOARD_TEXTURE_WIDTH,
  BOARD_TEXTURE_HEIGHT,
  BOARD_BACKGROUND_COLOR,
  BALL_RADIUS,
  BALL_GRAVITY,
  BALL_DAMPING,
  BALL_BOUNCE_DAMPING,
  BALL_SWING_ACCELERATION_SCALE,
  BALL_MAX_SPEED as MAX_SPEED,
  BALL_COLOR,
  BALL_EMISSIVE_COLOR,
  BALL_EMISSIVE_INTENSITY,
  BALL_GEOMETRY_SEGMENTS,
  BALL_LINEAR_SCALE_FACTOR,
  IDLE_THRESHOLD,
  IDLE_RESET_DELAY,
  SWING_ORIENTATION_SCALE,
  HITTING_ZONE_DEPTH,
  DEFAULT_SWING_SPEED,
  BASE_SPLASH_SIZE
} from './constants';

declare const THREE: typeof THREE_TYPES;

// Three.js Scene Setup
const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;

// Helper Functions
function updateOrthoCamera(cam: THREE_TYPES.OrthographicCamera, aspect: number): void {
    cam.left = -CAMERA_FRUSTUM_SIZE * aspect / 2;
    cam.right = CAMERA_FRUSTUM_SIZE * aspect / 2;
    cam.top = CAMERA_FRUSTUM_SIZE / 2;
    cam.bottom = -CAMERA_FRUSTUM_SIZE / 2;
    cam.updateProjectionMatrix();
}

function initCameras(aspect: number): { camera: THREE_TYPES.OrthographicCamera; cameraPersp: THREE_TYPES.PerspectiveCamera } {
    // Orthographic
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000);
    updateOrthoCamera(camera, aspect);
    camera.position.set(CAMERA_ORTHO_POSITION.x, CAMERA_ORTHO_POSITION.y, CAMERA_ORTHO_POSITION.z);
    camera.lookAt(CAMERA_ORTHO_LOOK_AT.x, CAMERA_ORTHO_LOOK_AT.y, CAMERA_ORTHO_LOOK_AT.z);

    // Perspective
    const cameraPersp = new THREE.PerspectiveCamera(CAMERA_PERSP_FOV, aspect, 0.1, 1000);
    cameraPersp.position.set(CAMERA_PERSP_POSITION.x, CAMERA_PERSP_POSITION.y, CAMERA_PERSP_POSITION.z);
    cameraPersp.lookAt(CAMERA_PERSP_LOOK_AT.x, CAMERA_PERSP_LOOK_AT.y, CAMERA_PERSP_LOOK_AT.z);
    cameraPersp.layers.set(1);

    return { camera, cameraPersp };
}

function initRenderer(canvas: HTMLCanvasElement): THREE_TYPES.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setClearColor(RENDERER_CLEAR_COLOR);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = false;
    renderer.autoClear = false;
    return renderer;
}

function setupLights(scene: THREE_TYPES.Scene): void {
    const ambientLight = new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY);
    ambientLight.layers.enable(1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(DIRECTIONAL_LIGHT_COLOR, DIRECTIONAL_LIGHT_INTENSITY);
    directionalLight.position.set(DIRECTIONAL_LIGHT_POSITION.x, DIRECTIONAL_LIGHT_POSITION.y, DIRECTIONAL_LIGHT_POSITION.z);
    directionalLight.layers.enable(1);
    scene.add(directionalLight);
}

function createCanvasTexture(
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D) => void
): { canvas: HTMLCanvasElement; texture: THREE_TYPES.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        drawFn(ctx);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return { canvas, texture };
}

function setupFloor(scene: THREE_TYPES.Scene): THREE_TYPES.Mesh {
    const floorGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);

    const textureLoader = new THREE.TextureLoader();
    const woodFloorTexture = textureLoader.load(WOOD_FLOOR_TEXTURE_PATH);
    woodFloorTexture.wrapS = THREE.RepeatWrapping;
    woodFloorTexture.wrapT = THREE.RepeatWrapping;
    woodFloorTexture.repeat.set(WOOD_FLOOR_TEXTURE_REPEAT, WOOD_FLOOR_TEXTURE_REPEAT);

    const floorMaterial = new THREE.MeshStandardMaterial({
        map: woodFloorTexture,
        roughness: 0.7,
        metalness: 0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(FLOOR_POSITION.x, FLOOR_POSITION.y, FLOOR_POSITION.z);
    floor.layers.set(1); 
    scene.add(floor);
    return floor;
}

function setupWalls(scene: THREE_TYPES.Scene): THREE_TYPES.Mesh[] {
    const { texture: wallTexture } = createCanvasTexture(WALL_TEXTURE_SIZE, WALL_TEXTURE_SIZE, (ctx) => {
        const wallGradient = ctx.createRadialGradient(
            WALL_TEXTURE_SIZE * 0.5,
            WALL_TEXTURE_SIZE * 0.45,
            WALL_TEXTURE_SIZE * 0.08,
            WALL_TEXTURE_SIZE * 0.5,
            WALL_TEXTURE_SIZE * 0.5,
            WALL_TEXTURE_SIZE * 0.7
        );
        WALL_GRADIENT_STOPS.forEach(stop => {
            wallGradient.addColorStop(stop.offset, stop.color);
        });
        ctx.fillStyle = wallGradient;
        ctx.fillRect(0, 0, WALL_TEXTURE_SIZE, WALL_TEXTURE_SIZE);
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide
    });

    function createWall(width: number, height: number, x: number, y: number, z: number, rotationY: number): THREE_TYPES.Mesh {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
        wall.position.set(x, y, z);
        wall.rotation.y = rotationY;
        wall.layers.set(1);
        scene.add(wall);
        return wall;
    }

    const backWall = createWall(FLOOR_SIZE, WALL_HEIGHT, 0, WALL_HEIGHT / 2, WALL_BACK_Z, 0);
    const leftWall = createWall(WALL_DEPTH, WALL_HEIGHT, -WALL_HALF_WIDTH, WALL_HEIGHT / 2, WALL_BACK_Z + WALL_DEPTH / 2, Math.PI / 2);
    const rightWall = createWall(WALL_DEPTH, WALL_HEIGHT, WALL_HALF_WIDTH, WALL_HEIGHT / 2, WALL_BACK_Z + WALL_DEPTH / 2, -Math.PI / 2);

    return [backWall, leftWall, rightWall];
}

function setupBoard(scene: THREE_TYPES.Scene): { board: THREE_TYPES.Mesh; boardTextureCanvas: HTMLCanvasElement; boardCanvasTexture: THREE_TYPES.CanvasTexture } {
    const { canvas: boardTextureCanvas, texture: boardCanvasTexture } = createCanvasTexture(BOARD_TEXTURE_WIDTH, BOARD_TEXTURE_HEIGHT, (ctx) => {
        ctx.fillStyle = BOARD_BACKGROUND_COLOR;
        ctx.fillRect(0, 0, BOARD_TEXTURE_WIDTH, BOARD_TEXTURE_HEIGHT);
    });

    const boardGeometry = new THREE.PlaneGeometry(BOARD_W, BOARD_H);
    const boardMaterial = new THREE.MeshStandardMaterial({
        map: boardCanvasTexture,
        metalness: 0.1,
        roughness: 0.2
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.set(0, BOARD_H / 2, BOARD_Z);
    scene.add(board);

    return { board, boardTextureCanvas, boardCanvasTexture };
}

function setupBallResources(): { ballGeometry: THREE_TYPES.SphereGeometry; ballMaterial: THREE_TYPES.MeshStandardMaterial } {
    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, BALL_GEOMETRY_SEGMENTS, BALL_GEOMETRY_SEGMENTS);
    const ballMaterial = new THREE.MeshStandardMaterial({
        color: BALL_COLOR,
        metalness: 0.3,
        roughness: 0.4,
        emissive: BALL_EMISSIVE_COLOR,
        emissiveIntensity: BALL_EMISSIVE_INTENSITY
    });
    return { ballGeometry, ballMaterial };
}

// Room & Scene Initialization
const { camera, cameraPersp } = initCameras(aspect);
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = initRenderer(canvas);

setupLights(scene);
setupFloor(scene);
setupWalls(scene);

const { board, boardTextureCanvas, boardCanvasTexture } = setupBoard(scene);
const { ballGeometry, ballMaterial } = setupBallResources();

const ballPhysics = {
    pos: new THREE.Vector3(0, 4, BOARD_NEAR),
    vel: new THREE.Vector3(0, 0, 0),
    radius: BALL_RADIUS,
    gravity: BALL_GRAVITY,
    damping: BALL_DAMPING,
    bounceDamping: BALL_BOUNCE_DAMPING,
    swingAccelerationScale: BALL_SWING_ACCELERATION_SCALE
};

interface Ball {
    id: number;
    mesh: THREE_TYPES.Mesh;
    physics: {
        pos: THREE_TYPES.Vector3;
        vel: THREE_TYPES.Vector3;
        radius: number;
    };
    isFlying: boolean;
    idleTimer: number | null; // Use number for window.setTimeout
    lastCollisionZ?: number;
}

const balls: Ball[] = [];
let ballIdCounter = 0;

function createBall(): Ball {
    const mesh = new THREE.Mesh(ballGeometry, ballMaterial);
    scene.add(mesh);

    const ball: Ball = {
        id: ++ballIdCounter,
        mesh,
        physics: {
            pos: new THREE.Vector3(0, 4, BOARD_NEAR),
            vel: new THREE.Vector3(0, 0, 0),
            radius: ballPhysics.radius
        },
        isFlying: false,
        idleTimer: null
    };
    resetBall(ball);
    return ball;
}

function removeBall(ball: Ball | undefined): void {
    if (!ball) return;
    if (ball.idleTimer) {
        window.clearTimeout(ball.idleTimer);
        ball.idleTimer = null;
    }
    scene.remove(ball.mesh);
    const index = balls.indexOf(ball);
    if (index !== -1) balls.splice(index, 1);
}

export function setBallCount(count: number): void {
    count = Math.max(0, Math.floor(count));
    while (balls.length < count) {
        balls.push(createBall());
    }
    while (balls.length > count) {
        removeBall(balls[balls.length - 1]);
    }
}

function getHittableBalls(): Ball[] {
    return balls.filter(ball => ball.mesh.visible && !ball.isFlying && ball.physics.pos.z >= (BOARD_NEAR - HITTING_ZONE_DEPTH));
}

function chooseRandomHittableBall(): Ball | null {
    const hittable = getHittableBalls();
    if (!hittable.length) return null;
    return hittable[Math.floor(Math.random() * hittable.length)];
}

(window as any).setBallCount = setBallCount;
if ((window as any).__pendingBallCount !== undefined) {
    setBallCount((window as any).__pendingBallCount);
    delete (window as any).__pendingBallCount;
}

const boardDrawerService = Container.get(InkDrawerService);
boardDrawerService.setCanvas(boardTextureCanvas);

let gameStarted = false;
(window as any).gameStarted = gameStarted;

export function startGame(): void {
    gameStarted = true;
    (window as any).gameStarted = true;
    const indicator = document.getElementById('queuedIndicator');
    if (indicator) {
        indicator.classList.add('active');
        indicator.textContent = 'Ready';
    }
}

(window as any).startGame = startGame;

let currentSwingSpeed = DEFAULT_SWING_SPEED;
let currentSwingAngleX = 0;
let currentSwingAngleY = 0;

export function updateSwing(speed?: number, angleX?: number, angleY?: number): void {
    if (speed !== undefined) currentSwingSpeed = speed;
    if (angleX !== undefined) currentSwingAngleX = angleX;
    if (angleY !== undefined) currentSwingAngleY = angleY;
}

export function launchBall(): boolean {
    if (!gameStarted) {
        return false;
    }

    const targetBall = chooseRandomHittableBall();
    if (!targetBall) {
        return false;
    }

    if (!targetBall.mesh.visible) return false;

    if (targetBall.isFlying && targetBall.physics.pos.z < (BOARD_NEAR - HITTING_ZONE_DEPTH)) {
        return false;
    }

    const speed = (currentSwingSpeed || 10) * ballPhysics.swingAccelerationScale;
    const angleX = (currentSwingAngleX || 0) * SWING_ORIENTATION_SCALE * Math.PI / 180;
    const angleY = (currentSwingAngleY || 0) * SWING_ORIENTATION_SCALE * Math.PI / 180;

    const horizComponent = Math.cos(angleY);
    targetBall.physics.vel.x = speed * Math.sin(angleX) * horizComponent;
    targetBall.physics.vel.y = speed * Math.sin(angleY);
    targetBall.physics.vel.z = -Math.abs(speed * Math.cos(angleX) * horizComponent);

    targetBall.isFlying = true;
    if (targetBall.idleTimer) {
        window.clearTimeout(targetBall.idleTimer);
        targetBall.idleTimer = null;
    }

    const indicator = document.getElementById('queuedIndicator');
    if (indicator) {
        indicator.classList.remove('active');
        indicator.textContent = 'Hit registered!';
        window.setTimeout(() => {
            if (indicator.textContent === 'Hit registered!') {
                indicator.textContent = 'Ready';
            }
        }, 1000);
    }
    return true;
}

function resetBall(ball: Ball): void {
    if (!ball) return;
    const randomX = (Math.random() - 0.5) * (BOARD_W - ballPhysics.radius * 2);
    const randomY = ballPhysics.radius + Math.random() * (BOARD_H - ballPhysics.radius);

    ball.physics.pos.set(randomX, randomY, BOARD_NEAR);
    ball.physics.vel.set(0, 0, 0);
    ball.isFlying = false;
    ball.mesh.visible = true;

    if (ball.idleTimer) {
        window.clearTimeout(ball.idleTimer);
        ball.idleTimer = null;
    }

    const indicator = document.getElementById('queuedIndicator');
    if (indicator) {
        indicator.classList.remove('active');
        indicator.textContent = 'Ready';
    }
}

function drawSplashOnBoard(ballPos: THREE_TYPES.Vector3): void {
    const boardCenterY = BOARD_H / 2;
    const localX = ballPos.x;
    const localY = ballPos.y - boardCenterY;

    const uvX = (localX + BOARD_W / 2) / BOARD_W;
    const uvY = (localY + BOARD_H / 2) / BOARD_H;

    if (uvX < 0 || uvX > 1 || uvY < 0 || uvY > 1) return;

    const pixelX = uvX * boardTextureCanvas.width;
    const pixelY = (1 - uvY) * boardTextureCanvas.height;

    const baseSize = BASE_SPLASH_SIZE;
    const sizeVariation = baseSize * (0.7 + Math.random() * 0.6);
    
    boardDrawerService.drawSplash(pixelX, pixelY, sizeVariation);
    boardCanvasTexture.needsUpdate = true;
}

function updatePhysics(delta: number): void {
    function updateBallPhysics(ball: Ball, deltaSec: number) {
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
            const material = (window as any).selectedMaterial || Material.METAL;
            const woodBuffer = (window as any).woodBuffer;
            const plasticBuffer = (window as any).plasticBuffer;

            const pitch = 0.8 + Math.min(impactSpeed * 0.4, 0.8);

            if (material === Material.WOOD && woodBuffer) {
                playSoundWithPitch(woodBuffer, pitch);
            } else if (material === Material.PLASTIC && plasticBuffer) {
                playSoundWithPitch(plasticBuffer, pitch);
            } else {
                const frequency = 400 + Math.min(impactSpeed * 200, 400);
                playMetalSound(frequency);
            }

            ball.mesh.visible = false;
            ball.isFlying = false;
            ball.physics.vel.set(0, 0, 0);
            ball.lastCollisionZ = ball.physics.pos.z;

            window.setTimeout(() => {
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
                ball.idleTimer = window.setTimeout(() => {
                    resetBall(ball);
                    if (ball) ball.idleTimer = null;
                }, IDLE_RESET_DELAY);
            }
        } else {
            if (ball.idleTimer) {
                window.clearTimeout(ball.idleTimer);
                ball.idleTimer = null;
            }
        }
    }

    balls.forEach(ball => updateBallPhysics(ball, delta));
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updatePhysics(delta);

    balls.forEach((ball) => {
        if (!ball.mesh.visible) return;
        ball.mesh.position.copy(ball.physics.pos);

        const dist = camera.position.z - ball.physics.pos.z;
        const refDist = camera.position.z - BOARD_NEAR;
        let scale = 1.0 - ((dist - refDist) * BALL_LINEAR_SCALE_FACTOR);
        if (scale < 0) scale = 0;
        ball.mesh.scale.setScalar(scale);
        ball.mesh.position.y -= ball.physics.radius * (1 - scale);
    });

    renderer.clear();

    cameraPersp.layers.set(1);
    renderer.render(scene, cameraPersp);

    renderer.clearDepth();

    camera.layers.set(0);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;

    updateOrthoCamera(camera, aspect);

    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('keypress', (e) => {
    if (e.key === 'd' || e.key === 'D') {
        if (!gameStarted) return;
        const link = document.createElement('a');
        link.download = 'painting.png';
        link.href = boardTextureCanvas.toDataURL('image/png');
        link.click();
    }
});

setBallCount(0);
animate();
