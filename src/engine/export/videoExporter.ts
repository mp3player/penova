import '../../plugins';
import { LessonProject } from '../../model/project';
import { LessonScene } from '../../model/scene';
import {
  ExportFrameSource,
  ExportOutput,
} from '../../plugins/contracts';
import { exportRegistry } from '../../plugins/registry';
import {
  parseProjectScript,
  ParseProjectScriptOptions,
} from '../parser/projectScript';
import {
  evaluateProjectFrameSnapshot,
  evaluateSceneFrameSnapshot,
  renderProjectFrameSvg,
  renderSceneFrameSvg,
} from '../render/frameSnapshot';
import { renderProjectFrame } from '../render/projectRenderer';
import { renderSceneFrame } from '../render/sceneRenderer';
import { serializeSubtitlesToSrt } from '../subtitle/subtitleEngine';
import {
  CompiledProjectTimeline,
  compileProjectTimeline,
} from '../timeline/projectTimeline';
import { CompiledTimeline } from '../timeline/timelineEngine';

export interface ExportVideoOptions {
  fps?: number;
  exporterId?: string;
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
}

export interface ExportScriptOptions extends ParseProjectScriptOptions {
  fps?: number;
  exporterId?: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

export interface ExportScriptResult extends ExportOutput {
  project: LessonProject;
  warnings: string[];
  subtitlesSrt: string;
}

export type ExportVideoResult = ExportOutput;

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function createSceneFrameSource(
  scene: LessonScene,
  timeline: CompiledTimeline,
  fps = 30
): ExportFrameSource {
  const width = scene.aspectRatio === '9:16' ? 1080 : 1920;
  const height = scene.aspectRatio === '9:16' ? 1920 : 1080;

  return {
    title: scene.title,
    aspectRatio: scene.aspectRatio,
    totalDurationMs: timeline.totalDurationMs,
    width,
    height,
    fps,
    renderFrame(ctx, w, h, tMs) {
      renderSceneFrame(ctx, w, h, scene, timeline, tMs, {
        showUiOverlays: false,
      });
    },
    evaluateFrame(tMs, w = width, h = height) {
      return evaluateSceneFrameSnapshot(scene, timeline, tMs, w, h);
    },
    renderSvgFrame(tMs, w = width, h = height) {
      return renderSceneFrameSvg(scene, timeline, tMs, w, h);
    },
  };
}

export function createProjectFrameSource(
  compiledProject: CompiledProjectTimeline,
  fps = 30
): ExportFrameSource {
  const aspectRatio = compiledProject.project.aspectRatio;
  const width = aspectRatio === '9:16' ? 1080 : 1920;
  const height = aspectRatio === '9:16' ? 1920 : 1080;

  return {
    title: compiledProject.project.title,
    aspectRatio,
    totalDurationMs: compiledProject.totalDurationMs,
    width,
    height,
    fps,
    renderFrame(ctx, w, h, tMs) {
      renderProjectFrame(ctx, w, h, compiledProject, tMs, {
        showUiOverlays: false,
        dpr: 1,
      });
    },
    evaluateFrame(tMs, w = width, h = height) {
      return evaluateProjectFrameSnapshot(compiledProject, tMs, w, h);
    },
    renderSvgFrame(tMs, w = width, h = height) {
      return renderProjectFrameSvg(compiledProject, tMs, w, h);
    },
  };
}

export async function exportSceneVideo(
  scene: LessonScene,
  timeline: CompiledTimeline,
  options: ExportVideoOptions
): Promise<ExportVideoResult> {
  const source = createSceneFrameSource(scene, timeline, options.fps ?? 30);
  const plugin = exportRegistry.getOrDefault(
    options.exporterId ?? 'mediarecorder-video'
  );
  return plugin.export(source, {
    onProgress: options.onProgress,
    signal: options.signal,
  });
}

export async function exportProjectVideo(
  compiledProject: CompiledProjectTimeline,
  options: ExportVideoOptions
): Promise<ExportVideoResult> {
  const source = createProjectFrameSource(compiledProject, options.fps ?? 30);
  const plugin = exportRegistry.getOrDefault(
    options.exporterId ?? 'mediarecorder-video'
  );
  return plugin.export(source, {
    onProgress: options.onProgress,
    signal: options.signal,
  });
}

export async function exportScriptToVideo(
  scriptText: string,
  options: ExportScriptOptions = {}
): Promise<ExportScriptResult> {
  const parsed = parseProjectScript(scriptText, {
    fallbackTitle: options.fallbackTitle,
    fallbackAspectRatio: options.fallbackAspectRatio,
  });
  const compiled = compileProjectTimeline(parsed.project);
  const mediaSupported =
    exportRegistry.get('mediarecorder-video')?.isSupported?.() ?? false;
  const exporterId =
    options.exporterId ??
    (mediaSupported ? 'mediarecorder-video' : 'svg-sequence-tar');

  const out = await exportProjectVideo(compiled, {
    fps: options.fps,
    exporterId,
    onProgress: options.onProgress ?? (() => {}),
    signal: options.signal,
  });

  return {
    ...out,
    project: parsed.project,
    warnings: parsed.warnings,
    subtitlesSrt: parsed.project.subtitles
      ? serializeSubtitlesToSrt(parsed.project.subtitles)
      : '',
  };
}
