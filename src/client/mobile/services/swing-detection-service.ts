import { SWING_ACCELERATION_THRESHOLD, SWING_RESET_THRESHOLD, SWING_COOLDOWN_MS } from '../constants';

interface SwingData {
  zAcceleration: number;
  directionVector: {
    x: number;
    y: number;
    z: number;
  };
}

export class SwingDetectionService {
  private callback: ((data: SwingData) => void) | null;
  public isRunning: boolean;
  private isSwingArmed: boolean;
  private lastSwingAt: number;
  private alphaOffset: number | null; // calibration: first alpha reading becomes "zero"
  private orientation: {
    alpha: number;
    beta: number;
    gamma: number;
  };

  constructor() {
    this.callback = null;
    this.isRunning = false;
    this.isSwingArmed = true;
    this.lastSwingAt = 0;
    this.alphaOffset = null;
    this.orientation = {
      alpha: 0,
      beta: 0,
      gamma: 0,
    };

    this.onMotion = this.onMotion.bind(this);
    this.onOrientation = this.onOrientation.bind(this);
  }

  setCallback(callback: (data: SwingData) => void): void {
    this.callback = callback;
  }

  async requestPermission(): Promise<void> {
    const motionPermissionNeeded =
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function';
    const orientationPermissionNeeded =
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    if (!motionPermissionNeeded && !orientationPermissionNeeded) {
      return;
    }

    const motionPermission = motionPermissionNeeded
      ? await (DeviceMotionEvent as any).requestPermission()
      : 'granted';
    const orientationPermission = orientationPermissionNeeded
      ? await (DeviceOrientationEvent as any).requestPermission()
      : 'granted';

    if (motionPermission !== 'granted' || orientationPermission !== 'granted') {
      throw new Error('Motion sensor permission denied.');
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    await this.requestPermission();

    this.alphaOffset = null; // reset calibration on each start
    window.addEventListener('devicemotion', this.onMotion);
    window.addEventListener('deviceorientation', this.onOrientation);
    this.isRunning = true;
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    window.removeEventListener('devicemotion', this.onMotion);
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.isRunning = false;
    this.isSwingArmed = true;
  }

  getDirectionVector(): { x: number; y: number; z: number } {
    const degToRad = Math.PI / 180;
    // Subtract the calibration offset so the initial facing direction = 0
    const rawAlpha = this.orientation.alpha || 0;
    const calibratedAlpha = rawAlpha - (this.alphaOffset || 0);
    const a = calibratedAlpha * degToRad;
    const b = (this.orientation.beta || 0) * degToRad;
    const g = (this.orientation.gamma || 0) * degToRad;

    // W3C standard rotation sequence (Z-X-Y)
    const cA = Math.cos(a), sA = Math.sin(a);
    const cB = Math.cos(b), sB = Math.sin(b);
    const cG = Math.cos(g), sG = Math.sin(g);

    // Calculates the unit vector pointing straight out of the screen (racket face normal)
    const nx = cA * sG + sA * sB * cG;
    const ny = sA * sG - cA * sB * cG;
    const nz = cB * cG;

    return {
      x: nx,
      y: ny,
      z: nz,
    };
  }

  logSwing(zAcceleration: number): void {
    const directionVector = this.getDirectionVector();

    if (zAcceleration > 0) {
      directionVector.x *= -1;
      directionVector.y *= -1;
      directionVector.z *= -1;
    }

    if (this.callback) {
      this.callback({
        zAcceleration,
        directionVector,
      });
    }
  }

  onMotion(event: DeviceMotionEvent): void {
    // Z-axis is perpendicular to the screen. 
    // Use acceleration (factor out gravity) as per advice.
    const zAcceleration = event.acceleration?.z ?? 0;
    const now = Date.now();

    if (Math.abs(zAcceleration) >= SWING_ACCELERATION_THRESHOLD && this.isSwingArmed && now - this.lastSwingAt >= SWING_COOLDOWN_MS) {
      this.isSwingArmed = false;
      this.lastSwingAt = now;
      this.logSwing(zAcceleration);
      return;
    }

    if (Math.abs(zAcceleration) <= SWING_RESET_THRESHOLD) {
      this.isSwingArmed = true;
    }
  }

  onOrientation(event: DeviceOrientationEvent): void {
    if (event.alpha === null) return;

    // Capture the first alpha reading as the "zero" reference
    if (this.alphaOffset === null) {
      this.alphaOffset = event.alpha;
    }

    this.orientation = {
      alpha: event.alpha ?? 0,
      beta: event.beta ?? 0,
      gamma: event.gamma ?? 0,
    };
  }
}

(window as any).SwingDetectionService = SwingDetectionService;
