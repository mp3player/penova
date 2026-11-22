import { Rect } from '../../model/scene';
import { CameraEvalContext, CameraState } from '../contracts';

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function lerpCamera(
  a: CameraState,
  b: CameraState,
  t: number
): CameraState {
  const u = easeInOutCubic(t);
  return {
    cx: a.cx + (b.cx - a.cx) * u,
    cy: a.cy + (b.cy - a.cy) * u,
    zoom: a.zoom + (b.zoom - a.zoom) * u,
  };
}

export function fitBounds(
  bounds: Rect,
  viewportW: number,
  viewportH: number,
  padding = 64,
  minZoom = 0.28,
  maxZoom = 1.65
): CameraState {
  const effPad = Math.min(padding, Math.round(Math.min(viewportW, viewportH) * 0.085));
  const safeW = Math.max(100, viewportW - effPad * 2);
  const safeH = Math.max(100, viewportH - effPad * 2);
  const bw = Math.max(40, bounds.width);
  const bh = Math.max(40, bounds.height);

  const rawZoom = Math.min(safeW / bw, safeH / bh);
  const zoom = Math.max(minZoom, Math.min(maxZoom, rawZoom));

  return {
    cx: bounds.x + bounds.width / 2,
    cy: bounds.y + bounds.height / 2,
    zoom,
  };
}

export function findActiveStepIndex(
  steps: CameraEvalContext['steps'],
  tMs: number
): number {
  for (let i = 0; i < steps.length; i++) {
    if (tMs < steps[i].endMs) {
      return i;
    }
  }
  return Math.max(0, steps.length - 1);
}

export function evaluateStepCamera(
  ctx: CameraEvalContext,
  options: {
    boundsMode: 'focus' | 'cumulative';
    padding: number;
    maxZoom: number;
  }
): CameraState {
  const overviewCam = fitBounds(
    ctx.fullBounds,
    ctx.viewportW,
    ctx.viewportH,
    56,
    0.22,
    1.35
  );

  if (ctx.steps.length === 0) {
    return overviewCam;
  }

  const tMs = Math.max(0, Math.min(ctx.totalDurationMs, ctx.tMs));
  const steps = ctx.steps;

  const stepCameras: CameraState[] = steps.map((s) =>
    fitBounds(
      options.boundsMode === 'focus' ? s.focusBounds : s.cumulativeBounds,
      ctx.viewportW,
      ctx.viewportH,
      options.padding,
      0.26,
      options.maxZoom
    )
  );

  if (tMs >= ctx.outroStartMs) {
    const lastCam = stepCameras[stepCameras.length - 1];
    const outroDur = Math.max(1, ctx.totalDurationMs - ctx.outroStartMs);
    const moveDur = Math.min(outroDur * 0.72, 1100);
    const u = Math.min(1, (tMs - ctx.outroStartMs) / Math.max(1, moveDur));
    return lerpCamera(lastCam, overviewCam, u);
  }

  const idx = findActiveStepIndex(steps, tMs);
  const currentStep = steps[idx];
  const targetCam = stepCameras[idx];

  if (idx === 0) {
    const initialWide: CameraState = {
      cx: targetCam.cx,
      cy: targetCam.cy,
      zoom: Math.max(0.28, targetCam.zoom * 0.88),
    };
    const panEnd = Math.min(currentStep.endMs, currentStep.drawStartMs + 220);
    const u = Math.min(
      1,
      (tMs - currentStep.startMs) / Math.max(1, panEnd - currentStep.startMs)
    );
    return lerpCamera(initialWide, targetCam, u);
  }

  const prevCam = stepCameras[idx - 1];
  const panEnd = Math.min(currentStep.endMs, currentStep.drawStartMs + 250);
  if (tMs <= panEnd) {
    const u =
      (tMs - currentStep.startMs) / Math.max(1, panEnd - currentStep.startMs);
    return lerpCamera(prevCam, targetCam, u);
  }

  return targetCam;
}
