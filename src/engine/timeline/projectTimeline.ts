import '../../plugins';
import { LessonProject } from '../../model/project';
import { LessonScene, TransitionId } from '../../model/scene';
import {
  glyphProviderRegistry,
  layoutRegistry,
  presentationRegistry,
  sceneNodeRegistry,
  shapeRegistry,
  transitionRegistry,
} from '../../plugins/registry';
import { computeDiagramLayout } from '../layout/diagramLayout';
import { CompiledTimeline, compileTimeline } from './timelineEngine';

let sceneCompileCache = new WeakMap<LessonScene, CompiledTimeline>();

export function clearSceneCompileCache(): void {
  sceneCompileCache = new WeakMap<LessonScene, CompiledTimeline>();
}

layoutRegistry.subscribe(clearSceneCompileCache);
shapeRegistry.subscribe(clearSceneCompileCache);
presentationRegistry.subscribe(clearSceneCompileCache);
glyphProviderRegistry.subscribe(clearSceneCompileCache);
sceneNodeRegistry.subscribe(clearSceneCompileCache);
transitionRegistry.subscribe(clearSceneCompileCache);

export interface CompiledTransitionWindow {
  id: TransitionId;
  name: string;
  durationMs: number;
  startMs: number;
  endMs: number;
  fromSceneIndex: number;
  toSceneIndex: number;
}

export interface CompiledSceneSegment {
  sceneIndex: number;
  scene: LessonScene;
  timeline: CompiledTimeline;
  startMs: number;
  endMs: number;
  transitionOut?: CompiledTransitionWindow;
}

export interface CompiledProjectTimeline {
  project: LessonProject;
  segments: CompiledSceneSegment[];
  totalDurationMs: number;
}

export type ProjectEvalState =
  | {
      kind: 'scene';
      sceneIndex: number;
      segment: CompiledSceneSegment;
      localTMs: number;
      globalTMs: number;
    }
  | {
      kind: 'transition';
      fromSegment: CompiledSceneSegment;
      toSegment: CompiledSceneSegment;
      transitionId: TransitionId;
      transitionName: string;
      progress: number;
      globalTMs: number;
    };

export function compileProjectTimeline(
  project: LessonProject
): CompiledProjectTimeline {
  const segments: CompiledSceneSegment[] = [];
  let cursorMs = 0;

  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    let timeline = sceneCompileCache.get(scene);
    if (!timeline) {
      const layout = computeDiagramLayout(scene);
      timeline = compileTimeline(scene, layout);
      sceneCompileCache.set(scene, timeline);
    }
    const startMs = cursorMs;
    const endMs = startMs + timeline.totalDurationMs;
    cursorMs = endMs;

    let transitionOut: CompiledTransitionWindow | undefined;
    if (i < project.scenes.length - 1) {
      const configuredId = scene.transitionOut?.type ?? 'chalkboard-eraser';
      const plugin = transitionRegistry.getOrDefault(configuredId);
      const durationMs = Math.max(
        0,
        scene.transitionOut?.durationMs ?? plugin.defaultDurationMs
      );
      if (durationMs > 0) {
        transitionOut = {
          id: plugin.id,
          name: plugin.name,
          durationMs,
          startMs: cursorMs,
          endMs: cursorMs + durationMs,
          fromSceneIndex: i,
          toSceneIndex: i + 1,
        };
        cursorMs += durationMs;
      }
    }

    segments.push({
      sceneIndex: i,
      scene,
      timeline,
      startMs,
      endMs,
      transitionOut,
    });
  }

  return {
    project,
    segments,
    totalDurationMs: cursorMs,
  };
}

export function evaluateProjectAt(
  compiled: CompiledProjectTimeline,
  rawGlobalTMs: number
): ProjectEvalState {
  const globalTMs = Math.max(
    0,
    Math.min(compiled.totalDurationMs, rawGlobalTMs)
  );
  const { segments } = compiled;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1;

    if (globalTMs < seg.endMs || (isLast && globalTMs <= seg.endMs)) {
      return {
        kind: 'scene',
        sceneIndex: i,
        segment: seg,
        localTMs: Math.max(
          0,
          Math.min(seg.timeline.totalDurationMs, globalTMs - seg.startMs)
        ),
        globalTMs,
      };
    }

    if (seg.transitionOut && globalTMs < seg.transitionOut.endMs) {
      const nextSeg = segments[i + 1];
      if (nextSeg) {
        const progress =
          (globalTMs - seg.transitionOut.startMs) /
          Math.max(1, seg.transitionOut.durationMs);
        return {
          kind: 'transition',
          fromSegment: seg,
          toSegment: nextSeg,
          transitionId: seg.transitionOut.id,
          transitionName: seg.transitionOut.name,
          progress: Math.max(0, Math.min(1, progress)),
          globalTMs,
        };
      }
    }
  }

  // Fallback (unreachable when segments.length > 0)
  const fallback = segments[Math.max(0, segments.length - 1)];
  return {
    kind: 'scene',
    sceneIndex: Math.max(0, segments.length - 1),
    segment: fallback,
    localTMs: fallback ? fallback.timeline.totalDurationMs : 0,
    globalTMs,
  };
}

export function collectGlobalStepStarts(
  compiled: CompiledProjectTimeline
): number[] {
  const starts: number[] = [];
  for (const seg of compiled.segments) {
    if (seg.timeline.steps.length === 0) {
      starts.push(seg.startMs);
    } else {
      for (const s of seg.timeline.steps) {
        starts.push(seg.startMs + s.startMs);
      }
    }
  }
  return starts;
}
