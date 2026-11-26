import '../../plugins';
import { LessonScene, Point } from '../../model/scene';
import { CameraPenHint, ThemePalette } from '../../plugins/contracts';
import { presentationRegistry } from '../../plugins/registry';
import {
  createOffscreenCanvas,
  onOffscreenCanvasFactoryChange,
} from '../../sdk/offscreenCanvas';
import { easeGlyphProgress, StrokePath } from '../../sdk/strokePath';
import { CameraState, evaluateCameraAt } from '../camera/cameraDirector';
import { drawProgressiveGlyph } from '../sketch/textStrokes';
import { CompiledTimeline, evaluateTimelineAt } from '../timeline/timelineEngine';
import { drawWritingHand } from './chalkHand';
import { resolveColorHex } from './themes';

export interface RenderOptions {
  manualCamera?: CameraState | null;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  showUiOverlays?: boolean;
}

let sharedScratchCanvas: HTMLCanvasElement | null = null;

onOffscreenCanvasFactoryChange(() => {
  sharedScratchCanvas = null;
});

function getScratchCanvas(): HTMLCanvasElement | null {
  if (!sharedScratchCanvas) {
    sharedScratchCanvas = createOffscreenCanvas(300, 150);
  }
  return sharedScratchCanvas;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewportW: number,
  viewportH: number,
  cam: CameraState
): Point {
  return {
    x: (screenX - viewportW / 2) / cam.zoom + cam.cx,
    y: (screenY - viewportH / 2) / cam.zoom + cam.cy,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewportW: number,
  viewportH: number,
  cam: CameraState
): Point {
  return {
    x: (worldX - cam.cx) * cam.zoom + viewportW / 2,
    y: (worldY - cam.cy) * cam.zoom + viewportH / 2,
  };
}

export function getActiveCamera(
  scene: LessonScene,
  timeline: CompiledTimeline,
  tMs: number,
  viewportW: number,
  viewportH: number,
  manualCamera?: CameraState | null,
  activePen?: CameraPenHint
): CameraState {
  if (manualCamera) return manualCamera;
  return evaluateCameraAt(
    timeline,
    tMs,
    viewportW,
    viewportH,
    scene.cameraMode,
    activePen
  );
}

function drawStrokeInteriorFill(
  ctx: CanvasRenderingContext2D,
  stroke: StrokePath,
  colorHex: string,
  progress: number,
  baseFillOpacity: number,
  palette: ThemePalette,
  allowShadow: boolean,
  dimAlpha = 1
): void {
  if (!stroke.fillOpacity || stroke.fillOpacity <= 0 || stroke.points.length < 3) {
    return;
  }
  const fillReveal = Math.max(0, Math.min(1, (progress - 0.55) / 0.45));
  const isSurfaceCard = allowShadow && Boolean(stroke.surfaceShadow);
  const effectiveBaseOpacity = isSurfaceCard
    ? baseFillOpacity
    : allowShadow
    ? 0.22
    : baseFillOpacity;
  const alpha = effectiveBaseOpacity * stroke.fillOpacity * fillReveal * dimAlpha;
  if (alpha <= 0.005) return;

  const tracePath = () => {
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.closePath();
  };

  if (isSurfaceCard && palette.cardShadow) {
    ctx.save();
    ctx.translate(palette.cardShadow.dx, palette.cardShadow.dy);
    ctx.globalAlpha = fillReveal * dimAlpha;
    ctx.fillStyle = palette.cardShadow.color;
    tracePath();
    ctx.fill();
    ctx.restore();
  }

  const fillStyle =
    isSurfaceCard && palette.cardFillColors?.[stroke.color]
      ? palette.cardFillColors[stroke.color]!
      : colorHex;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillStyle;
  tracePath();
  ctx.fill();
  ctx.restore();
}

export function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: LessonScene,
  timeline: CompiledTimeline,
  tMs: number,
  options: RenderOptions = {}
): void {
  const presentation = presentationRegistry.getOrDefault(scene.theme);
  const palette = presentation.palette;
  const evalState = evaluateTimelineAt(timeline, tMs);
  const cam = getActiveCamera(
    scene,
    timeline,
    tMs,
    width,
    height,
    options.manualCamera,
    evalState.pen
  );

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Presentation surface background
  presentation.drawSurface(ctx, width, height);

  // 2. Camera transform (world space)
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.cx, -cam.cy);

  const scratch = getScratchCanvas();
  const zoneFillOpacity = palette.zoneFillOpacity ?? 0.05;
  const cardFillOpacity = palette.cardFillOpacity ?? 0.085;

  // Pass A: Group frames first so node content sits cleanly above them
  for (const item of timeline.allItems) {
    if (item.kind !== 'group-frame') continue;
    const p = evalState.itemProgress.get(item.id) ?? 0;
    if (p <= 0) continue;
    const itemAlpha = evalState.itemOpacity?.get(item.id) ?? 1;
    const strokeToDraw =
      itemAlpha < 0.999
        ? { ...item.stroke, opacity: item.stroke.opacity * itemAlpha }
        : item.stroke;
    const fillHex = palette.colors[item.stroke.color] ?? palette.colors.white;
    drawStrokeInteriorFill(
      ctx,
      item.stroke,
      fillHex,
      p,
      zoneFillOpacity,
      palette,
      false,
      itemAlpha
    );
    presentation.drawStroke(ctx, strokeToDraw, p);
  }

  // Pass B: Strokes (edges + node shapes)
  for (const item of timeline.allItems) {
    if (item.kind !== 'stroke') continue;
    const p = evalState.itemProgress.get(item.id) ?? 0;
    if (p <= 0) continue;
    const itemAlpha = evalState.itemOpacity?.get(item.id) ?? 1;
    const strokeToDraw =
      itemAlpha < 0.999
        ? { ...item.stroke, opacity: item.stroke.opacity * itemAlpha }
        : item.stroke;
    const fillHex = palette.colors[item.stroke.color] ?? palette.colors.white;
    drawStrokeInteriorFill(
      ctx,
      item.stroke,
      fillHex,
      p,
      cardFillOpacity,
      palette,
      true,
      itemAlpha
    );
    presentation.drawStroke(ctx, strokeToDraw, p);
  }

  // Pass C: Text lines (edge label pills, group titles, node titles & subtitles)
  for (const item of timeline.allItems) {
    if (item.kind !== 'text-line') continue;
    const lineProgress = evalState.itemProgress.get(item.id) ?? 0;
    if (lineProgress <= 0) continue;
    const itemAlpha = evalState.itemOpacity?.get(item.id) ?? 1;

    if (item.isEdgeLabel || item.isGroupTitle) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, lineProgress * 3.5) * itemAlpha;
      ctx.fillStyle = palette.labelPillBg;
      ctx.strokeStyle = palette.labelPillBorder;
      ctx.lineWidth = 1;
      const rx = item.centerX - item.bgWidth / 2;
      const ry = item.centerY - item.bgHeight / 2;
      ctx.beginPath();
      ctx.roundRect(rx, ry, item.bgWidth, item.bgHeight, 7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (itemAlpha < 0.999) {
      ctx.save();
      ctx.globalAlpha *= itemAlpha;
    }
    const glyphDecel = timeline.pacing?.endDecel ?? 0;
    for (const span of item.spans) {
      let charP = 0;
      if (evalState.tMs >= span.endMs) {
        charP = 1;
      } else if (evalState.tMs > span.startMs) {
        const rawCharP =
          (evalState.tMs - span.startMs) /
          Math.max(1, span.endMs - span.startMs);
        charP = easeGlyphProgress(rawCharP, glyphDecel);
      }
      if (charP <= 0) continue;
      drawProgressiveGlyph(
        ctx,
        span.glyph,
        span.boxX,
        span.boxY,
        charP,
        scratch
      );
    }
    if (itemAlpha < 0.999) {
      ctx.restore();
    }
  }

  // Pass D: Optional presentation particles (e.g. falling chalk dust)
  if (
    presentation.drawParticles &&
    scene.handStyle !== 'hidden' &&
    evalState.pen.visible &&
    evalState.pen.penDown
  ) {
    presentation.drawParticles(
      ctx,
      evalState.pen.worldX,
      evalState.pen.worldY,
      resolveColorHex(scene.theme, evalState.pen.color),
      evalState.tMs,
      evalState.pen.seed
    );
  }

  // Pass E: Subtle UI hover/selection overlays (strictly suppressed during video export)
  if (options.showUiOverlays) {
    const highlightTargets: Array<{ id: string; isSelected: boolean }> = [];
    if (options.hoveredNodeId && options.hoveredNodeId !== options.selectedNodeId) {
      highlightTargets.push({ id: options.hoveredNodeId, isSelected: false });
    }
    if (options.selectedNodeId) {
      highlightTargets.push({ id: options.selectedNodeId, isSelected: true });
    }

    for (const target of highlightTargets) {
      const pNode = timeline.layout.nodeMap.get(target.id);
      if (!pNode) continue;

      ctx.save();
      ctx.strokeStyle = target.isSelected
        ? 'rgba(243, 201, 105, 0.85)'
        : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = (target.isSelected ? 2.2 : 1.5) / cam.zoom;
      ctx.setLineDash([6 / cam.zoom, 5 / cam.zoom]);
      const pad = 10;
      ctx.beginPath();
      ctx.roundRect(
        pNode.cx - pNode.width / 2 - pad,
        pNode.cy - pNode.height / 2 - pad,
        pNode.width + pad * 2,
        pNode.height + pad * 2,
        12
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore(); // exit world transform

  // 3. Screen-space writing hand anchored to transformed pen tip
  if (evalState.pen.visible) {
    const tipScreen = worldToScreen(
      evalState.pen.worldX,
      evalState.pen.worldY,
      width,
      height,
      cam
    );
    drawWritingHand(
      ctx,
      tipScreen.x,
      tipScreen.y,
      presentation,
      resolveColorHex(scene.theme, evalState.pen.color),
      evalState.pen.lift,
      evalState.pen.alpha,
      scene.handStyle,
      {
        penDown: evalState.pen.penDown,
        velocity: evalState.pen.velocity,
        tMs: evalState.tMs,
      }
    );
  }

  ctx.restore();
}
