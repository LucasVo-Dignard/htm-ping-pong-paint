const SWING_ACCELERATION_THRESHOLD = 15;
const SWING_RESET_THRESHOLD = SWING_ACCELERATION_THRESHOLD * 0.65;
const SWING_COOLDOWN_MS = 250;

class SwingDetectionService {
  constructor(options = {}) {
    this.callback = null;
    this.isRunning = false;
    this.isSwingArmed = true;
    this.lastSwingAt = 0;
    this.alphaOffset = null; // calibration: first alpha reading becomes "zero"
    this.orientation = {
      alpha: 0,
      beta: 0,
      gamma: 0,
    };

    this.onMotion = this.onMotion.bind(this);
    this.onOrientation = this.onOrientation.bind(this);
  }

  setCallback(callback) {
    this.callback = callback;
  }

  async requestPermission() {
    const motionPermissionNeeded =
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function';
    const orientationPermissionNeeded =
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';

    if (!motionPermissionNeeded && !orientationPermissionNeeded) {
      return;
    }

    const motionPermission = motionPermissionNeeded
      ? await DeviceMotionEvent.requestPermission()
      : 'granted';
    const orientationPermission = orientationPermissionNeeded
      ? await DeviceOrientationEvent.requestPermission()
      : 'granted';

    if (motionPermission !== 'granted' || orientationPermission !== 'granted') {
      throw new Error('Motion sensor permission denied.');
    }
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    await this.requestPermission();

    this.alphaOffset = null; // reset calibration on each start
    window.addEventListener('devicemotion', this.onMotion);
    window.addEventListener('deviceorientation', this.onOrientation);
    this.isRunning = true;
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    window.removeEventListener('devicemotion', this.onMotion);
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.isRunning = false;
    this.isSwingArmed = true;
  }

  getDirectionVector() {
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

  logSwing(zAcceleration) {
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

  onMotion(event) {
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

  onOrientation(event) {
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

window.SwingDetectionService = SwingDetectionService;
