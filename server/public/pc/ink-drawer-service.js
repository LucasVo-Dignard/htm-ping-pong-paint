const HIT_Y_OFFSET = 0.5;

(function () {
  const DEFAULT_PALETTE = [
    '#0a0a0f', '#0d2b8c', '#094d3c', '#8b0000', '#b34700', '#3d0070', '#7a0038', '#1a3d0a', '#1a2330'
  ];

  function noise(x, y, seed = 0) {
    return (
      Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) +
      Math.sin(x * 7.3 + seed * 0.7) * Math.cos(y * 5.9 + seed * 2.1)
    ) * 0.5;
  }

  function wobblePath(ctx, cx, cy, radiusFn, steps) {
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2;
      const radius = radiusFn(angle);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16)
    ];
  }

  class DrawerService {
    constructor(canvas, options = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new TypeError('DrawerService requires a canvas element');
      }

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.palette = options.palette || DEFAULT_PALETTE.slice();
      this.activeColor = null;
      this.autoIndex = 0;
      this.resizeObserver = null;
      this._onPointerEvent = this._onPointerEvent.bind(this);
    }

    init() {
      this._resizeCanvas();
      window.addEventListener('resize', () => this._resizeCanvas());
      this.canvas.addEventListener('click', this._onPointerEvent);
      this.canvas.addEventListener('touchstart', this._onPointerEvent, { passive: false });
    }

    setColor(hex) {
      this.activeColor = typeof hex === 'string' ? hex : null;
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawSplash(x, y) {
      const newY = y + HIT_Y_OFFSET;
      const color = this.activeColor || this._getNextColor();
      const [r, g, b] = hexToRgb(color);
      const radius = 26 + Math.random() * 10;
      this._drawFilaments(x, newY, radius, r, g, b);
      this._drawDroplets(x, newY, radius, 12 + Math.floor(Math.random() * 8), r, g, b);
      this._drawRim(x, newY, radius, r, g, b);
      this._drawTendrils(x, newY, radius, r, g, b);
      this._drawCore(x, newY, radius, r, g, b);
      this._drawSpecks(x, newY, radius, r, g, b);
    }

    _resizeCanvas() {
      const parentWidth = this.canvas.parentElement?.clientWidth || 680;
      this.canvas.width = parentWidth;
      this.canvas.height = Math.round(parentWidth * 0.55);
    }

    _getNextColor() {
      const color = this.palette[this.autoIndex % this.palette.length];
      this.autoIndex += 1;
      return color;
    }

    _onPointerEvent(event) {
      event.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      const x = point.clientX - rect.left;
      const y = point.clientY - rect.top;
      this.drawSplash(x, y);
    }

    _drawCore(cx, cy, R, r, g, b) {
      const seed = Math.random() * 100;
      this.ctx.save();
      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      wobblePath(this.ctx, cx, cy, (angle) => {
        const n = noise(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, seed);
        return R * (0.82 + n * 0.18);
      }, 64);
      this.ctx.fill();
      this.ctx.restore();
    }

    _drawTendrils(cx, cy, R, r, g, b) {
      for (let i = 0; i < 6 + Math.floor(Math.random() * 5); i += 1) {
        const baseAngle = Math.random() * Math.PI * 2;
        const len = R * (0.35 + Math.random() * 0.55);
        const width = R * (0.04 + Math.random() * 0.09);
        const tipX = cx + Math.cos(baseAngle) * (R + len);
        const tipY = cy + Math.sin(baseAngle) * (R + len);
        const perp = baseAngle + Math.PI / 2;
        const baseX = cx + Math.cos(baseAngle) * R * 0.8;
        const baseY = cy + Math.sin(baseAngle) * R * 0.8;
        const ctrlAngle = baseAngle + (Math.random() - 0.5) * 0.5;
        const ctrlDist = len * 0.55;
        const ctrlX = cx + Math.cos(ctrlAngle) * (R + ctrlDist);
        const ctrlY = cy + Math.sin(ctrlAngle) * (R + ctrlDist);

        this.ctx.save();
        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
        this.ctx.globalAlpha = 0.92;
        this.ctx.beginPath();
        this.ctx.moveTo(baseX + Math.cos(perp) * width, baseY + Math.sin(perp) * width);
        this.ctx.quadraticCurveTo(
          ctrlX + Math.cos(perp) * width * 0.4,
          ctrlY + Math.sin(perp) * width * 0.4,
          tipX,
          tipY
        );
        this.ctx.quadraticCurveTo(
          ctrlX - Math.cos(perp) * width * 0.4,
          ctrlY - Math.sin(perp) * width * 0.4,
          baseX - Math.cos(perp) * width,
          baseY - Math.sin(perp) * width
        );
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    _drawDroplets(cx, cy, R, count, r, g, b) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const dist = R * (1.1 + Math.random() * 0.9);
        const dx = cx + Math.cos(angle) * dist;
        const dy = cy + Math.sin(angle) * dist;
        const rx = 1.5 + Math.random() * 3.5;
        const ry = rx * (1.2 + Math.random() * 1.8);
        const rot = angle + Math.PI / 2;

        this.ctx.save();
        this.ctx.globalAlpha = 0.75 + Math.random() * 0.25;
        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
        this.ctx.translate(dx, dy);
        this.ctx.rotate(rot);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    _drawFilaments(cx, cy, R, r, g, b) {
      const count = 10 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const startR = R * (0.85 + Math.random() * 0.15);
        const endR = R * (1.3 + Math.random() * 0.6);
        const sx = cx + Math.cos(angle) * startR;
        const sy = cy + Math.sin(angle) * startR;
        const ex = cx + Math.cos(angle + (Math.random() - 0.5) * 0.3) * endR;
        const ey = cy + Math.sin(angle + (Math.random() - 0.5) * 0.3) * endR;
        const ctrlX = (sx + ex) / 2 + (Math.random() - 0.5) * 8;
        const ctrlY = (sy + ey) / 2 + (Math.random() - 0.5) * 8;

        this.ctx.save();
        this.ctx.globalAlpha = 0.35 + Math.random() * 0.35;
        this.ctx.strokeStyle = `rgb(${r},${g},${b})`;
        this.ctx.lineWidth = 0.4 + Math.random() * 0.8;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(sx, sy);
        this.ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    _drawRim(cx, cy, R, r, g, b) {
      const seed = Math.random() * 77;
      this.ctx.save();
      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      this.ctx.globalAlpha = 0.55;
      wobblePath(this.ctx, cx, cy, (angle) => {
        const n = noise(Math.cos(angle) * 2.5 + seed, Math.sin(angle) * 2.5, seed);
        return R * (0.88 + n * 0.22);
      }, 80);
      this.ctx.fill();
      this.ctx.restore();
    }

    _drawSpecks(cx, cy, R, r, g, b) {
      const count = 18 + Math.floor(Math.random() * 14);
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const dist = R * (0.9 + Math.random() * 0.85);
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;

        this.ctx.save();
        this.ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 0.5 + Math.random() * 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }
  }

  window.InkDrawerService = DrawerService;
})();
