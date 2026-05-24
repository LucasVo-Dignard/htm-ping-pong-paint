class SwingDetectonService {
  constructor(options = {}) {
    this.callback = null;
    this.isRunning = false;
    this.isSwingArmed = true;
    this.lastSwingAt = 0;
    this.orientation = {
      alpha: 0,
      beta: 0,
      gamma: 0,
    };

    this.swingThreshold = options.swingThreshold ?? 16;
    this.resetThreshold = options.resetThreshold ?? this.swingThreshold * 0.65;
    this.cooldownMs = options.cooldownMs ?? 250;

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

    window.addEventListener('devicemotion', this.onMotion);
    window.addEventListener('deviceorientation', this.onOrientation);
    this.isRunning = true;

    console.log('Swing detection service started.');
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    window.removeEventListener('devicemotion', this.onMotion);
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.isRunning = false;
    this.isSwingArmed = true;

    console.log('Swing detection service stopped.');
  }

  getDirectionVector() {
    const betaRad = (this.orientation.beta * Math.PI) / 180;
    const gammaRad = (this.orientation.gamma * Math.PI) / 180;

    return {
      x: Math.sin(gammaRad),
      y: -Math.sin(betaRad) * Math.cos(gammaRad),
      z: Math.cos(betaRad) * Math.cos(gammaRad),
    };
  }

  logSwing(zAcceleration) {
    const directionVector = this.getDirectionVector();

    console.log('Swing detected', {
      zAcceleration: Number(zAcceleration.toFixed(2)),
      directionVector: {
        x: Number(directionVector.x.toFixed(3)),
        y: Number(directionVector.y.toFixed(3)),
        z: Number(directionVector.z.toFixed(3)),
      },
    });

    if (this.callback) {
      this.callback({
        zAcceleration,
        directionVector,
      });
    }
  }

  onMotion(event) {
    const acceleration = event.accelerationIncludingGravity ?? event.acceleration ?? {};
    const zAcceleration = acceleration.z ?? 0;
    const now = Date.now();

    if (Math.abs(zAcceleration) >= this.swingThreshold && this.isSwingArmed && now - this.lastSwingAt >= this.cooldownMs) {
      this.isSwingArmed = false;
      this.lastSwingAt = now;
      this.logSwing(zAcceleration);
      return;
    }

    if (Math.abs(zAcceleration) <= this.resetThreshold) {
      this.isSwingArmed = true;
    }
  }

  onOrientation(event) {
    this.orientation = {
      alpha: event.alpha ?? 0,
      beta: event.beta ?? 0,
      gamma: event.gamma ?? 0,
    };
  }
}

window.SwingDetectonService = SwingDetectonService;
