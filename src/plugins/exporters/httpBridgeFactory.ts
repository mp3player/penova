import { ExportPlugin } from '../contracts';
import {
  bytesToBase64,
  canvasToBlob,
  createOffscreenCanvas,
  safeFilename,
  throwIfAborted,
} from './helpers';

export interface HttpBridgeExportConfig {
  id: string;
  name: string;
  shortLabel?: string;
  description?: string;
  endpointUrl: string;
  fps?: number;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  mimeType?: string;
  ext?: string;
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  encodeFrame?: (canvas: HTMLCanvasElement) => Promise<string>;
}

/**
 * Factory helper for wiring a local FFmpeg service or cloud encoding endpoint
 * as a first-class ExportPlugin.
 */
export function createHttpBridgeExportPlugin(
  config: HttpBridgeExportConfig
): ExportPlugin {
  return {
    id: config.id,
    name: config.name,
    shortLabel: config.shortLabel ?? config.name,
    description:
      config.description ?? `通过服务端接口 (${config.endpointUrl}) 合成成片`,
    isSupported() {
      return typeof (config.fetchImpl ?? globalThis.fetch) === 'function';
    },
    async export(source, options) {
      throwIfAborted(options.signal);

      const fps = Math.max(1, config.fps ?? source.fps);
      const frameIntervalMs = 1000 / fps;
      const totalFrames = Math.max(
        1,
        Math.ceil((source.totalDurationMs / 1000) * fps)
      );

      const canvas = config.createCanvas
        ? config.createCanvas(source.width, source.height)
        : createOffscreenCanvas(source.width, source.height).canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法获取离屏画布上下文');
      }

      const frames: string[] = [];
      options.onProgress(0);

      for (let i = 0; i <= totalFrames; i++) {
        throwIfAborted(options.signal);
        const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
        source.renderFrame(ctx, source.width, source.height, tMs);

        if (config.encodeFrame) {
          frames.push(await config.encodeFrame(canvas));
        } else {
          const blob = await canvasToBlob(canvas, 'image/png');
          frames.push(bytesToBase64(new Uint8Array(await blob.arrayBuffer())));
        }

        options.onProgress(
          Math.min(80, Math.round((i / Math.max(1, totalFrames)) * 80))
        );
      }

      throwIfAborted(options.signal);
      const fetcher = config.fetchImpl ?? fetch;
      const resp = await fetcher(config.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers ?? {}),
        },
        signal: options.signal,
        body: JSON.stringify({
          title: source.title,
          aspectRatio: source.aspectRatio,
          width: source.width,
          height: source.height,
          fps,
          totalDurationMs: source.totalDurationMs,
          frames,
        }),
      });

      if (!resp.ok) {
        throw new Error(`远端导出服务返回错误 (${resp.status})`);
      }

      const blob = await resp.blob();
      options.onProgress(100);
      const mimeType =
        config.mimeType ?? (blob.type || 'video/mp4');
      const ext = config.ext ?? (mimeType.includes('webm') ? 'webm' : 'mp4');

      return {
        blob,
        filename: safeFilename(source.title, ext),
        mimeType,
        summary: `${frames.length} 帧服务端编码`,
      };
    },
  };
}
