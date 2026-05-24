const RADIUS = 5;

class PixelConvolutionService {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.cache = {};
    this.currentUrl = null;
    this.imgWidth = 0;
    this.imgHeight = 0;
  }

  prepareImage(imagePath) {
    if (this.cache[imagePath]) return;
    this.cache[imagePath] = 'loading'; // Prevent duplicate loads
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      this.ctx.drawImage(img, 0, 0);
      this.cache[imagePath] = this.ctx.getImageData(0, 0, img.width, img.height).data;
      this.currentUrl = imagePath;
      this.imgWidth = img.width;
      this.imgHeight = img.height;
    };
    img.src = imagePath;
  }

  /**
   * Get the average RGB value of pixels within a radius around a coordinate
   * @param {string} imagePath - Path to the image file
   * @param {number} x - X coordinate of the center pixel
   * @param {number} y - Y coordinate of the center pixel
   * @returns {Promise<{r: number, g: number, b: number}>} Average RGB values
   */
  async getAveragePixelColor(imagePath, x, y) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);

        const imageData = this.ctx.getImageData(
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );
        const data = imageData.data;

        let r = 0, g = 0, b = 0, count = 0;

        for (let dy = -RADIUS; dy <= RADIUS; dy++) {
          for (let dx = -RADIUS; dx <= RADIUS; dx++) {
            const px = x + dx;
            const py = y + dy;

            if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
              const index = (py * this.canvas.width + px) * 4;
              r += data[index];
              g += data[index + 1];
              b += data[index + 2];
              count++;
            }
          }
        }

        resolve({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        });
      };

      img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
      img.src = imagePath;
    });
  }

  getAveragePixelColorSync(imagePath, x, y) {
    const data = this.cache[imagePath];
    if (!data || data === 'loading') return null;

    let r = 0, g = 0, b = 0, count = 0;
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        const px = x + dx;
        const py = y + dy;

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const index = (py * width + px) * 4;
          r += data[index];
          g += data[index + 1];
          b += data[index + 2];
          count++;
        }
      }
    }

    return count ? {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    } : null;
  }
}