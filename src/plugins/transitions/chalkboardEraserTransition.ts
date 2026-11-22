import { Point } from '../../model/scene';
import { TransitionPlugin } from '../contracts';

let cachedEraseCanvas: HTMLCanvasElement | null = null;

function getEraseCanvas(w: number, h: number): HTMLCanvasElement {
  if (!cachedEraseCanvas) {
    cachedEraseCanvas = document.createElement('canvas');
  }
  const safeW = Math.max(1, w);
  const safeH = Math.max(1, h);
  if (cachedEraseCanvas.width !== safeW || cachedEraseCanvas.height !== safeH) {
    cachedEraseCanvas.width = safeW;
    cachedEraseCanvas.height = safeH;
  }
  return cachedEraseCanvas;
}

function buildSweepWaypoints(width: number, height: number): Point[] {
  const padX = Math.max(70, width * 0.11);
  return [
    { x: -padX, y: height * 0.13 },
    { x: width + padX, y: height * 0.21 },
    { x: -padX, y: height * 0.46 },
    { x: width + padX, y: height * 0.56 },
    { x: -padX, y: height * 0.81 },
    { x: width + padX, y: height * 0.91 },
  ];
}

function samplePolylinePrefix(
  waypoints: Point[],
  fraction: number
): { points: Point[]; tip: Point; angleRad: number } {
  if (waypoints.length < 2) {
    const p = waypoints[0] ?? { x: 0, y: 0 };
    return { points: [p], tip: p, angleRad: 0 };
  }

  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const len = Math.hypot(
      waypoints[i].x - waypoints[i - 1].x,
      waypoints[i].y - waypoints[i - 1].y
    );
    segLengths.push(len);
    total += len;
  }

  const targetLen = Math.max(0, Math.min(1, fraction)) * total;
  const points: Point[] = [waypoints[0]];
  let acc = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (acc + segLen >= targetLen || i === segLengths.length - 1) {
      const local = segLen > 1e-4 ? (targetLen - acc) / segLen : 1;
      const clamped = Math.max(0, Math.min(1, local));
      const tip = {
        x: a.x + (b.x - a.x) * clamped,
        y: a.y + (b.y - a.y) * clamped,
      };
      points.push(tip);
      return {
        points,
        tip,
        angleRad: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    points.push(b);
    acc += segLen;
  }

  const last = waypoints[waypoints.length - 1];
  return { points, tip: last, angleRad: 0 };
}

function drawFeltEraser(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  scale: number,
  alpha: number
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  // Keep eraser handle comfortably tilted regardless of L->R or R->L swipe direction
  const gentleTilt = Math.sin(angleRad) * 0.16 - 0.14;
  ctx.rotate(gentleTilt);
  ctx.scale(scale, scale);

  // Drop shadow on board
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.roundRect(-48, -19, 100, 48, 8);
  ctx.fill();

  // Dark chalk-dusted felt pad
  ctx.fillStyle = '#2c3138';
  ctx.beginPath();
  ctx.roundRect(-50, -8, 100, 31, 6);
  ctx.fill();

  // Subtle dusty chalk residue along wiping base
  const dustGrad = ctx.createLinearGradient(0, 8, 0, 23);
  dustGrad.addColorStop(0, 'rgba(226, 232, 224, 0.08)');
  dustGrad.addColorStop(1, 'rgba(226, 232, 224, 0.42)');
  ctx.fillStyle = dustGrad;
  ctx.fillRect(-46, 10, 92, 12);

  // Warm hardwood eraser block handle
  const woodGrad = ctx.createLinearGradient(0, -25, 0, -2);
  woodGrad.addColorStop(0, '#c08552');
  woodGrad.addColorStop(0.55, '#9b6336');
  woodGrad.addColorStop(1, '#784823');
  ctx.fillStyle = woodGrad;
  ctx.strokeStyle = '#5a3417';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-48, -25, 96, 21, 5);
  ctx.fill();
  ctx.stroke();

  // Top finger-grip bevel highlight
  ctx.fillStyle = 'rgba(255, 235, 205, 0.22)';
  ctx.fillRect(-42, -21, 84, 3);

  ctx.restore();
}

export const chalkboardEraserTransitionPlugin: TransitionPlugin = {
  id: 'chalkboard-eraser',
  name: 'Chalkboard Eraser',
  defaultDurationMs: 1150,
  render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
    const p = Math.max(0, Math.min(1, progress));
    const sweepU = Math.min(1, p / 0.88);

    // Draw incoming scene cleanly underneath
    ctx.drawImage(toCanvas, 0, 0, width, height);

    const eraseCanvas = getEraseCanvas(fromCanvas.width, fromCanvas.height);
    const eCtx = eraseCanvas.getContext('2d');
    if (eCtx) {
      eCtx.save();
      eCtx.setTransform(1, 0, 0, 1, 0, 0);
      eCtx.clearRect(0, 0, eraseCanvas.width, eraseCanvas.height);
      eCtx.drawImage(fromCanvas, 0, 0);

      const sx = eraseCanvas.width / Math.max(1, width);
      const sy = eraseCanvas.height / Math.max(1, height);
      eCtx.setTransform(sx, 0, 0, sy, 0, 0);

      const waypoints = buildSweepWaypoints(width, height);
      const { points, tip, angleRad } = samplePolylinePrefix(waypoints, sweepU);
      const brushWidth = Math.max(height * 0.44, 165);

      if (points.length >= 2 && sweepU > 0.001) {
        eCtx.globalCompositeOperation = 'destination-out';
        eCtx.lineCap = 'round';
        eCtx.lineJoin = 'round';

        const tracePath = () => {
          eCtx.beginPath();
          eCtx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            eCtx.lineTo(points[i].x, points[i].y);
          }
        };

        // Soft outer feather pass
        eCtx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
        eCtx.lineWidth = brushWidth * 1.16;
        tracePath();
        eCtx.stroke();

        // Crisp core eraser pass
        eCtx.strokeStyle = 'rgba(0, 0, 0, 1)';
        eCtx.lineWidth = brushWidth;
        tracePath();
        eCtx.stroke();
      }
      eCtx.restore();

      ctx.drawImage(eraseCanvas, 0, 0, width, height);

      // Draw translucent chalk cloud puffs & chalkboard eraser tool on top
      const eraserAlpha =
        p <= 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
      if (eraserAlpha > 0.01) {
        const uiScale = Math.max(0.85, Math.min(1.45, height / 560));
        ctx.save();
        ctx.globalAlpha = eraserAlpha * 0.24;
        ctx.fillStyle = '#e8ece6';
        for (let i = 0; i < 4; i++) {
          const offset = (i + 1) * 18 * uiScale;
          const puffX = tip.x - Math.cos(angleRad) * offset;
          const puffY = tip.y - Math.sin(angleRad) * offset + i * 5 * uiScale;
          ctx.beginPath();
          ctx.arc(puffX, puffY, (22 + i * 7) * uiScale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        drawFeltEraser(ctx, tip.x, tip.y, angleRad, uiScale, eraserAlpha);
      }
    }
  },
};
