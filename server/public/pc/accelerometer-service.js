class AccelerometerService {
  constructor() {
    this.callback = null;
  }

  /**
   * Set callback function to be called when accelerometer data updates
   * @param {Function} callback - Function to call with {x, y, z} data
   */
  setCallback(callback) {
    this.callback = callback;
  }

  /**
   * Start listening to accelerometer events
   */
  start() {
    window.addEventListener("devicemotion", (event) => {
      const acc = event.accelerationIncludingGravity;
      
      if (this.callback) {
        this.callback({
          x: acc.x?.toFixed(2) || 0,
          y: acc.y?.toFixed(2) || 0,
          z: acc.z?.toFixed(2) || 0,
        });
      }
    });

    console.log("Accelerometer service started.");
  }

  /**
   * Stop listening to accelerometer events
   */
  stop() {
    window.removeEventListener("devicemotion", this.onMotion);
    console.log("Accelerometer service stopped.");
  }
}
