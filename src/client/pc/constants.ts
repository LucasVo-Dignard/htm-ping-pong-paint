// Camera settings
export const CAMERA_FRUSTUM_SIZE = 30;
export const CAMERA_ORTHO_POSITION = { x: 0, y: 12, z: 5 };
export const CAMERA_ORTHO_LOOK_AT = { x: 0, y: 12, z: -14 };
export const CAMERA_PERSP_FOV = 70;
export const CAMERA_PERSP_POSITION = { x: 0, y: 12, z: 5 };
export const CAMERA_PERSP_LOOK_AT = { x: 0, y: 12, z: -14 };
export const CAMERA_Z = 3;
export const NEAR_WALL_MAX = CAMERA_Z - 0.5;

// Light settings
export const RENDERER_CLEAR_COLOR = 0xF5F0E8;
export const AMBIENT_LIGHT_COLOR = 0xffffff;
export const AMBIENT_LIGHT_INTENSITY = 0.6;
export const DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DIRECTIONAL_LIGHT_INTENSITY = 1.0;
export const DIRECTIONAL_LIGHT_POSITION = { x: 10, y: 15, z: 10 };

// Floor & Walls
export const FLOOR_SIZE = 50;
export const FLOOR_POSITION = { x: 0, y: 0, z: -10 };
export const WOOD_FLOOR_TEXTURE_REPEAT = 4;
export const WOOD_FLOOR_TEXTURE_PATH = '/images/WoodFloor.png';

export const WALL_TEXTURE_SIZE = 512;
export const WALL_GRADIENT_STOPS = [
  { offset: 0, color: '#ffffff' },
  { offset: 0.45, color: '#fffbed' },
  { offset: 1, color: '#fff6d8' }
];
export const WALL_HEIGHT = 28;
export const WALL_DEPTH = 28;
export const WALL_HALF_WIDTH = 25;
export const WALL_BACK_Z = -24;

// Board setup
export const BOARD_Z = -10;
export const BOARD_NEAR = 2.5;
export const BOARD_W = 40;
export const BOARD_H = 25;
export const BOARD_TEXTURE_WIDTH = 1600;
export const BOARD_TEXTURE_HEIGHT = 1000;
export const BOARD_BACKGROUND_COLOR = '#f0f0f0';

// Ball and physics
export const BALL_RADIUS = 1.0;
export const BALL_GRAVITY = 0.003;
export const BALL_DAMPING = 0.999;
export const BALL_BOUNCE_DAMPING = 0.85;
export const BALL_SWING_ACCELERATION_SCALE = 0.025;
export const BALL_MAX_SPEED = 0.5;
export const BALL_COLOR = 0x000000;
export const BALL_EMISSIVE_COLOR = 0xff4500;
export const BALL_EMISSIVE_INTENSITY = 0.05;
export const BALL_GEOMETRY_SEGMENTS = 32;
export const BALL_LINEAR_SCALE_FACTOR = 0.04;

// Swing logic
export const IDLE_THRESHOLD = 0.02;
export const IDLE_RESET_DELAY = 2000;
export const SWING_ORIENTATION_SCALE = 1.2;
export const HITTING_ZONE_DEPTH = 3.0;
export const DEFAULT_SWING_SPEED = 50;
export const BASE_SPLASH_SIZE = 25;

// Sound effects
export const SOUND_WOOD_PATH = '/sounds/wood.wav';
export const SOUND_PLASTIC_PATH = '/sounds/plastic.wav';

// Ink drawer & Splat physics
export const HIT_Y_OFFSET = 0.5;
export const MIN_SPLAT_SIZE = 30;
export const MAX_SPLAT_SIZE = 100;

export const DEFAULT_PALETTE = [
  '#0a0a0f', '#0d2b8c', '#094d3c', '#8b0000', '#b34700', '#3d0070', '#7a0038', '#1a3d0a', '#1a2330'
];

// Pixel processing
export const PIXEL_CONVOLUTION_RADIUS = 5;
