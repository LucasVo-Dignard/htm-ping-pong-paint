class GyroscopeService {
  constructor() {
    this.callback = null;
  }

  /**
   * Set callback function to be called when gyroscope/orientation data updates
   * @param {Function} callback - Function to call with {alpha, beta, gamma} data
   */
  setCallback(callback) {
    this.callback = callback;
  }

  /**
   * Start listening to gyroscope/orientation events
   */
  start() {
    window.addEventListener("deviceorientation", (event) => {
      if (this.callback) {
        this.callback({
          alpha: event.alpha?.toFixed(2) || 0,
          beta: event.beta?.toFixed(2) || 0,
          gamma: event.gamma?.toFixed(2) || 0,
        });
      }
    });

    console.log("Gyroscope service started.");
  }

  /**
   * Stop listening to gyroscope/orientation events
   */
  stop() {
    window.removeEventListener("deviceorientation", this.onOrientation);
    console.log("Gyroscope service stopped.");
  }
}
