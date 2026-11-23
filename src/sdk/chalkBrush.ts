import { hashString, mulberry32 } from './random';
import { StrokePath } from './strokePath';

const dabCache = new Map<string, HTMLCanvasElement>();

function getChalkDab(colorHex: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = dabCache.get(colorHex);
  if (cached) return cached;

  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    const rand = mulberry32(hashString(colorHex));

    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, cx - 1);
    grad.addColorStop(0, colorHex);
    grad.addColorStop(0.55, colorHex);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 24; i++) {
      const rx = 3 + rand() * (size - 6);
      const ry = 3 + rand() * (size - 6);
      const r = 0.7 + rand() * 1.4;
      ctx.fillStyle = `rgba(0,0,0,${0.18 + rand() * 0.32})`;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  dabCache.set(colorHex, canvas);
  return canvas;
}

export function drawPowderyStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokePath,
  progress: number,
  colorHex: string
): void {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped <= 0 || stroke.points.length < 2) return;

  const targetLen = clamped * stroke.totalLength;
  const pts = stroke.points;
  const cum = stroke.cumLengths;
  const dab = getChalkDab(colorHex);
  const stepSize = Math.max(1.4, stroke.width * 0.42);
  const dashPeriod = 22;
  const dashOn = 13;
  let segIdx = 0;
  const seedBase = hashString(stroke.id);

  ctx.save();
  ctx.globalAlpha *= stroke.opacity;

  for (let d = 0; d <= targetLen; d += stepSize) {
    if (stroke.dashed && d % dashPeriod > dashOn) {
      continue;
    }

    while (segIdx < cum.length - 2 && cum[segIdx + 1] < d) {
      segIdx++;
    }

    const segLen = cum[segIdx + 1] - cum[segIdx];
    const frac = segLen > 1e-4 ? (d - cum[segIdx]) / segLen : 0;
    const p0 = pts[segIdx];
    const p1 = pts[segIdx + 1];
    const px = p0.x + (p1.x - p0.x) * frac;
    const py = p0.y + (p1.y - p0.y) * frac;

    const u = stroke.totalLength > 1 ? d / stroke.totalLength : 0.5;
    const endTaper =
      u < 0.06
        ? 0.74 + (u / 0.06) * 0.26
        : u > 0.94
        ? 0.74 + ((1 - u) / 0.06) * 0.26
        : 1;

    const h = ((Math.round(d * 3) * 2654435761) ^ seedBase) >>> 0;
    const jx = ((h & 255) / 255 - 0.5) * 0.85;
    const jy = (((h >> 8) & 255) / 255 - 0.5) * 0.85;
    const radius =
      stroke.width * endTaper * (0.9 + (((h >> 16) & 31) / 31) * 0.22);

    if (dab) {
      ctx.drawImage(
        dab,
        px + jx - radius,
        py + jy - radius,
        radius * 2,
        radius * 2
      );
    } else {
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(px + jx, py + jy, Math.max(0.8, radius * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawSmoothLineStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokePath,
  progress: number,
  colorHex: string,
  options?: { glow?: boolean }
): void {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped <= 0 || stroke.points.length < 2) return;

  const targetLen = clamped * stroke.totalLength;
  const pts = stroke.points;
  const cum = stroke.cumLengths;

  ctx.save();
  ctx.globalAlpha *= stroke.opacity;
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (stroke.dashed) {
    ctx.setLineDash([12, 9]);
  }
  if (options?.glow) {
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 4;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    if (cum[i] <= targetLen) {
      ctx.lineTo(pts[i].x, pts[i].y);
    } else {
      const prevLen = cum[i - 1];
      const segLen = cum[i] - prevLen;
      const frac = segLen > 1e-4 ? (targetLen - prevLen) / segLen : 0;
      ctx.lineTo(
        pts[i - 1].x + (pts[i].x - pts[i - 1].x) * frac,
        pts[i - 1].y + (pts[i].y - pts[i - 1].y) * frac
      );
      break;
    }
  }

  ctx.stroke();
  ctx.restore();
}

export function drawFallingDustParticles(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  colorHex: string,
  tMs: number,
  seed: number
): void {
  ctx.save();
  ctx.fillStyle = colorHex;
  const phase = (tMs % 320) / 320;

  for (let i = 0; i < 7; i++) {
    const h = ((seed + i * 7919) * 2654435761) >>> 0;
    const life = (phase + (h & 255) / 255) % 1;
    const vx = (((h >> 8) & 255) / 255 - 0.5) * 18;
    const vy = 8 + (((h >> 16) & 255) / 255) * 24;
    const px = tipX + vx * life;
    const py = tipY + vy * life + life * life * 12;
    const r = 0.8 + (1 - life) * 1.1;

    ctx.globalAlpha = (1 - life) * 0.42;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
