import '../../plugins';
import { LessonScene } from '../../model/scene';
import {
  cameraRegistry,
  glyphProviderRegistry,
  handRegistry,
  layoutRegistry,
  presentationRegistry,
  sceneNodeRegistry,
  shapeRegistry,
  transitionRegistry,
} from '../../plugins/registry';
import {
  drawSubtitleOverlay,
  getActiveSubtitleAt,
} from '../subtitle/subtitleEngine';
import {
  CompiledProjectTimeline,
  evaluateProjectAt,
} from '../timeline/projectTimeline';
import { CompiledTimeline } from '../timeline/timelineEngine';
import {
  createOffscreenCanvas,
  onOffscreenCanvasFactoryChange,
} from '../../sdk/offscreenCanvas';
import { RenderOptions, renderSceneFrame } from './sceneRenderer';

interface EndpointCacheKey {
  timeline: CompiledTimeline;
  scene: LessonScene;
  pixelW: number;
  pixelH: number;
  dpr: number;
}

interface EndpointBufferSlot {
  canvas: HTMLCanvasElement | null;
  key: EndpointCacheKey | null;
}

const fromBufferSlot: EndpointBufferSlot = { canvas: null, key: null };
const toBufferSlot: EndpointBufferSlot = { canvas: null, key: null };

export function clearTransitionBufferCache(): void {
  fromBufferSlot.key = null;
  toBufferSlot.key = null;
}

onOffscreenCanvasFactoryChange(() => {
  fromBufferSlot.canvas = null;
  fromBufferSlot.key = null;
  toBufferSlot.canvas = null;
  toBufferSlot.key = null;
});

presentationRegistry.subscribe(clearTransitionBufferCache);
handRegistry.subscribe(clearTransitionBufferCache);
cameraRegistry.subscribe(clearTransitionBufferCache);
shapeRegistry.subscribe(clearTransitionBufferCache);
glyphProviderRegistry.subscribe(clearTransitionBufferCache);
layoutRegistry.subscribe(clearTransitionBufferCache);
sceneNodeRegistry.subscribe(clearTransitionBufferCache);

function matchesCacheKey(
  cached: EndpointCacheKey | null,
  timeline: CompiledTimeline,
  scene: LessonScene,
  pixelW: number,
  pixelH: number,
  dpr: number
): boolean {
  return (
    cached !== null &&
    cached.timeline === timeline &&
    cached.scene === scene &&
    cached.pixelW === pixelW &&
    cached.pixelH === pixelH &&
    cached.dpr === dpr
  );
}

function getOrRenderEndpointBuffer(
  slot: EndpointBufferSlot,
  scene: LessonScene,
  timeline: CompiledTimeline,
  localTMs: number,
  width: number,
  height: number,
  pixelW: number,
  pixelH: number,
  dpr: number
): HTMLCanvasElement | null {
  const safeW = Math.max(1, Math.round(pixelW));
  const safeH = Math.max(1, Math.round(pixelH));
  if (!slot.canvas) {
    slot.canvas = createOffscreenCanvas(safeW, safeH);
    if (!slot.canvas) return null;
  }
  const sizeChanged =
    slot.canvas.width !== safeW || slot.canvas.height !== safeH;
  if (sizeChanged) {
    slot.canvas.width = safeW;
    slot.canvas.height = safeH;
    slot.key = null;
  }

  if (!matchesCacheKey(slot.key, timeline, scene, safeW, safeH, dpr)) {
    const bufCtx = slot.canvas.getContext('2d');
    if (bufCtx) {
      bufCtx.save();
      bufCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderSceneFrame(bufCtx, width, height, scene, timeline, localTMs, {
        showUiOverlays: false,
      });
      bufCtx.restore();
    }
    slot.key = { timeline, scene, pixelW: safeW, pixelH: safeH, dpr };
  }

  return slot.canvas;
}

export interface ProjectRenderOptions extends RenderOptions {
  dpr?: number;
}

export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  compiledProject: CompiledProjectTimeline,
  globalTMs: number,
  options: ProjectRenderOptions = {}
): void {
  if (compiledProject.segments.length === 0) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const evalState = evaluateProjectAt(compiledProject, globalTMs);
  if (evalState.kind === 'scene') {
    renderSceneFrame(
      ctx,
      width,
      height,
      evalState.segment.scene,
      evalState.segment.timeline,
      evalState.localTMs,
      options
    );
  } else {
    const dpr = Math.max(1, options.dpr ?? 1);
    const pixelW = Math.max(1, Math.round(width * dpr));
    const pixelH = Math.max(1, Math.round(height * dpr));

    const fromCanvas = getOrRenderEndpointBuffer(
      fromBufferSlot,
      evalState.fromSegment.scene,
      evalState.fromSegment.timeline,
      evalState.fromSegment.timeline.totalDurationMs,
      width,
      height,
      pixelW,
      pixelH,
      dpr
    );
    const toCanvas = getOrRenderEndpointBuffer(
      toBufferSlot,
      evalState.toSegment.scene,
      evalState.toSegment.timeline,
      0,
      width,
      height,
      pixelW,
      pixelH,
      dpr
    );

    if (!fromCanvas || !toCanvas) {
      const fallbackSeg =
        evalState.progress < 0.5 ? evalState.fromSegment : evalState.toSegment;
      const fallbackT =
        evalState.progress < 0.5
          ? evalState.fromSegment.timeline.totalDurationMs
          : 0;
      renderSceneFrame(
        ctx,
        width,
        height,
        fallbackSeg.scene,
        fallbackSeg.timeline,
        fallbackT,
        options
      );
    } else {
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      const transitionPlugin = transitionRegistry.getOrDefault(
        evalState.transitionId
      );
      transitionPlugin.render({
        ctx,
        width,
        height,
        progress: evalState.progress,
        fromCanvas,
        toCanvas,
        fromScene: evalState.fromSegment.scene,
        toScene: evalState.toSegment.scene,
      });
      ctx.restore();
    }
  }

  if (compiledProject.project.showSubtitles !== false) {
    const activeCue = getActiveSubtitleAt(
      compiledProject.project.subtitles,
      globalTMs
    );
    if (activeCue) {
      const activeTheme =
        evalState.kind === 'scene'
          ? evalState.segment.scene.theme
          : evalState.progress < 0.5
          ? evalState.fromSegment.scene.theme
          : evalState.toSegment.scene.theme;
      drawSubtitleOverlay(ctx, width, height, activeCue.text, activeTheme);
    }
  }
}
