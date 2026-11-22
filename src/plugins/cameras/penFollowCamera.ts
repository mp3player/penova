import { CameraPlugin, CameraState } from '../contracts';
import {
  clamp01,
  findActiveStepIndex,
  fitBounds,
  lerpCamera,
} from './helpers';

export const penFollowCameraPlugin: CameraPlugin = {
  id: 'pen-follow',
  name: '跟写滚屏',
  evaluate(ctx) {
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

    const safeW = Math.max(160, ctx.viewportW - 112);
    const widthZoom = safeW / Math.max(260, ctx.fullBounds.width);
    const readingZoom = Math.max(
      0.55,
      Math.min(1.28, Math.max(overviewCam.zoom, widthZoom))
    );
    const visibleH = ctx.viewportH / readingZoom;

    const clampY = (y: number): number => {
      if (ctx.fullBounds.height <= visibleH * 0.92) {
        return ctx.fullBounds.y + ctx.fullBounds.height / 2;
      }
      const minY = ctx.fullBounds.y + visibleH * 0.44;
      const maxY = ctx.fullBounds.y + ctx.fullBounds.height - visibleH * 0.44;
      if (minY >= maxY) {
        return (minY + maxY) / 2;
      }
      return Math.max(minY, Math.min(maxY, y));
    };

    const pageCenterX = ctx.fullBounds.x + ctx.fullBounds.width / 2;
    const stepCamAt = (stepIdx: number, uDraw: number): CameraState => {
      const step = ctx.steps[stepIdx];
      const topY =
        step.focusBounds.y + Math.min(step.focusBounds.height * 0.35, 70);
      const botY =
        step.focusBounds.y +
        Math.max(step.focusBounds.height * 0.72, step.focusBounds.height - 50);
      const cy = clampY(topY + (botY - topY) * clamp01(uDraw));
      return {
        cx: pageCenterX,
        cy,
        zoom: readingZoom,
      };
    };

    const tMs = Math.max(0, Math.min(ctx.totalDurationMs, ctx.tMs));
    const steps = ctx.steps;

    if (tMs >= ctx.outroStartMs) {
      const lastCam = stepCamAt(steps.length - 1, 1);
      const outroDur = Math.max(1, ctx.totalDurationMs - ctx.outroStartMs);
      const moveDur = Math.min(outroDur * 0.72, 1100);
      const u = Math.min(1, (tMs - ctx.outroStartMs) / Math.max(1, moveDur));
      return lerpCamera(lastCam, overviewCam, u);
    }

    const idx = findActiveStepIndex(steps, tMs);
    const currentStep = steps[idx];
    const drawU = clamp01(
      (tMs - currentStep.drawStartMs) /
        Math.max(1, currentStep.drawEndMs - currentStep.drawStartMs)
    );
    const targetCam = stepCamAt(idx, drawU);

    if (
      ctx.activePen?.visible &&
      tMs >= currentStep.drawStartMs &&
      tMs <= currentStep.drawEndMs
    ) {
      const penWeight = 0.35 * Math.sin(Math.PI * drawU);
      targetCam.cy =
        targetCam.cy + (clampY(ctx.activePen.worldY) - targetCam.cy) * penWeight;
    }

    if (idx > 0) {
      const prevEndCam = stepCamAt(idx - 1, 1);
      const panEnd = Math.min(currentStep.endMs, currentStep.drawStartMs + 280);
      if (tMs <= panEnd) {
        const u =
          (tMs - currentStep.startMs) /
          Math.max(1, panEnd - currentStep.startMs);
        return lerpCamera(prevEndCam, targetCam, u);
      }
    }

    return targetCam;
  },
};
