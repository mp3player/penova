import {
  createOffscreenCanvas,
  hasOffscreenCanvasSupport,
  onOffscreenCanvasFactoryChange,
} from './offscreenCanvas';

const surfaceCache = new Map<string, HTMLCanvasElement>();
const MAX_SURFACE_CACHE = 8;

onOffscreenCanvasFactoryChange(() => {
  surfaceCache.clear();
});

export type SurfacePainter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => void;

export function paintRadialBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: { bgPrimary: string; bgSecondary: string }
): void {
  const grad = ctx.createRadialGradient(
    width * 0.48,
    height * 0.44,
    Math.min(width, height) * 0.1,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78
  );
  grad.addColorStop(0, palette.bgPrimary);
  grad.addColorStop(1, palette.bgSecondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

export function drawCachedSurface(
  ctx: CanvasRenderingContext2D,
  cacheKey: string,
  width: number,
  height: number,
  painter: SurfacePainter
): void {
  if (!hasOffscreenCanvasSupport()) {
    painter(ctx, width, height);
    return;
  }

  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const fullKey = `${cacheKey}:${w}x${h}`;

  let cached = surfaceCache.get(fullKey);
  if (!cached) {
    const canvas = createOffscreenCanvas(w, h);
    if (!canvas) {
      painter(ctx, width, height);
      return;
    }
    const cCtx = canvas.getContext('2d');
    if (cCtx) {
      painter(cCtx, w, h);
    }
    if (surfaceCache.size >= MAX_SURFACE_CACHE) {
      const oldest = surfaceCache.keys().next().value;
      if (oldest !== undefined) surfaceCache.delete(oldest);
    }
    surfaceCache.set(fullKey, canvas);
    cached = canvas;
  }

  ctx.drawImage(cached, 0, 0, width, height);
}
