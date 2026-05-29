import { Service } from 'typedi';
import { PixelConvolutionService } from './pixel-convolution-service';
import { HIT_Y_OFFSET, MIN_SPLAT_SIZE, MAX_SPLAT_SIZE, DEFAULT_PALETTE } from '../constants';

function noise(x: number, y: number, seed = 0): number {
  return (
    Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) +
    Math.sin(x * 7.3 + seed * 0.7) * Math.cos(y * 5.9 + seed * 2.1)
  ) * 0.5;
}

function wobblePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, radiusFn: (angle: number) => number, steps: number): void {
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

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

interface DrawerServiceOptions {
  palette?: string[];
}

@Service()
export class InkDrawerService {
  private canvas!: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private palette: string[] = [];
  private activeColor: string | null = null;
  private autoIndex = 0;

  constructor(private pixelService: PixelConvolutionService) {}

  setCanvas(canvas: HTMLCanvasElement, options: DrawerServiceOptions = {}): void {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('DrawerService requires a canvas element');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = options.palette ? options.palette.slice() : DEFAULT_PALETTE.slice();
    this.activeColor = null;
    this.autoIndex = 0;
  }

  init(): void {
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
    this.canvas.addEventListener('click', (e) => this._onPointerEvent(e));
    this.canvas.addEventListener('touchstart', (e) => this._onPointerEvent(e), { passive: false });
  }

  setColor(hex: string | null): void {
    this.activeColor = typeof hex === 'string' ? hex : null;
  }

  clear(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawSplash(x: number, y: number, size?: number): void {
    const newY = y + HIT_Y_OFFSET;
    let r = 0, g = 0, b = 0;

    if ((window as any).selectedCanvasUrl) {
      this.pixelService.prepareImage((window as any).selectedCanvasUrl);

      const normX = x / this.canvas.width;
      const normY = newY / this.canvas.height;
      const imgTargetX = Math.round(normX * this.pixelService.imgWidth);
      const imgTargetY = Math.round(normY * this.pixelService.imgHeight);

      const avgColor = this.pixelService.getAveragePixelColorSync((window as any).selectedCanvasUrl, imgTargetX, imgTargetY);
      
      if (avgColor) {
        r = avgColor.r; g = avgColor.g; b = avgColor.b;
      } else {
        // Fallback while loading
        const color = this.activeColor || this._getNextColor();
        [r, g, b] = hexToRgb(color);
      }
    } else {
      const color = this.activeColor || this._getNextColor();
      [r, g, b] = hexToRgb(color);
    }

    let radius: number;
    if (typeof size === 'number') {
      // Map linearly from [17.5, 32.5] (expected sizeVariation range from script.ts)
      // to [MIN_SPLAT_SIZE, MAX_SPLAT_SIZE]
      const minInput = 17.5;
      const maxInput = 32.5;
      const t = (size - minInput) / (maxInput - minInput);
      radius = MIN_SPLAT_SIZE + t * (MAX_SPLAT_SIZE - MIN_SPLAT_SIZE);
      radius = Math.max(MIN_SPLAT_SIZE, Math.min(MAX_SPLAT_SIZE, radius));
    } else {
      radius = MIN_SPLAT_SIZE + Math.random() * (MAX_SPLAT_SIZE - MIN_SPLAT_SIZE);
    }
    this._drawFilaments(x, newY, radius, r, g, b);
    this._drawDroplets(x, newY, radius, 12 + Math.floor(Math.random() * 8), r, g, b);
    this._drawRim(x, newY, radius, r, g, b);
    this._drawTendrils(x, newY, radius, r, g, b);
    this._drawCore(x, newY, radius, r, g, b);
    this._drawSpecks(x, newY, radius, r, g, b);
  }

  private _resizeCanvas(): void {
    const parentWidth = this.canvas.parentElement?.clientWidth || 680;
    this.canvas.width = parentWidth;
    this.canvas.height = Math.round(parentWidth * 0.55);
  }

  private _getNextColor(): string {
    const color = this.palette[this.autoIndex % this.palette.length];
    this.autoIndex += 1;
    return color;
  }

  private _onPointerEvent(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const point = ('touches' in event && event.touches) ? event.touches[0] : (event as MouseEvent);
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    this.drawSplash(x, y);
  }

  private _drawCore(cx: number, cy: number, R: number, r: number, g: number, b: number): void {
    if (!this.ctx) return;
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

  private _drawTendrils(cx: number, cy: number, R: number, r: number, g: number, b: number): void {
    if (!this.ctx) return;
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

  private _drawDroplets(cx: number, cy: number, R: number, count: number, r: number, g: number, b: number): void {
    if (!this.ctx) return;
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

  private _drawFilaments(cx: number, cy: number, R: number, r: number, g: number, b: number): void {
    if (!this.ctx) return;
    const count = 10 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const startR = R * (0.85 + Math.random() * 0.15);
      const endR = R * (1.3 + Math.random() * 0.6);
      const sx = cx + Math.cos(angle) * startR;
      const sy = cy + Math.sin(angle) * startR;
      const ex = cx + Math.cos(angle + (Math.random() - 0.5) * 0.3) * endR;
      const fillY = cy + Math.sin(angle + (Math.random() - 0.5) * 0.3) * endR;
      const ctrlX = (sx + ex) / 2 + (Math.random() - 0.5) * 8;
      const ctrlY = (sy + fillY) / 2 + (Math.random() - 0.5) * 8;

      this.ctx.save();
      this.ctx.globalAlpha = 0.35 + Math.random() * 0.35;
      this.ctx.strokeStyle = `rgb(${r},${g},${b})`;
      this.ctx.lineWidth = 0.4 + Math.random() * 0.8;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy);
      this.ctx.quadraticCurveTo(ctrlX, ctrlY, ex, fillY);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private _drawRim(cx: number, cy: number, R: number, r: number, g: number, b: number): void {
    if (!this.ctx) return;
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

  private _drawSpecks(cx: number, cy: number, R: number, r: number, g: number, b: number): void {
    if (!this.ctx) return;
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
