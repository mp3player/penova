import { ExportPlugin } from '../contracts';
import {
  buildTarArchive,
  safeFilename,
  TarEntry,
  throwIfAborted,
  waitMs,
} from './helpers';

const SVG_TAR_EXPORT_FPS = 12;
const encoder = new TextEncoder();

export const svgSequenceTarExporterPlugin: ExportPlugin = {
  id: 'svg-sequence-tar',
  name: 'Vector Frames (SVG .tar)',
  shortLabel: 'SVG Tar',
  description:
    'Render platform-agnostic SVG frame sequence and FFmpeg script into a .tar bundle without Canvas',
  isSupported() {
    return true;
  },
  async export(source, options) {
    throwIfAborted(options.signal);
    if (!source.renderSvgFrame) {
      throw new Error('当前导出源不支持 SVG 矢量帧渲染');
    }

    const width = source.width;
    const height = source.height;
    const frameIntervalMs = 1000 / SVG_TAR_EXPORT_FPS;
    const totalFrames = Math.max(
      1,
      Math.ceil((source.totalDurationMs / 1000) * SVG_TAR_EXPORT_FPS)
    );

    const entries: TarEntry[] = [];
    options.onProgress(0);

    for (let i = 0; i <= totalFrames; i++) {
      throwIfAborted(options.signal);
      const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
      const svg = source.renderSvgFrame(tMs, width, height);
      const frameNum = String(i + 1).padStart(5, '0');
      entries.push({
        name: `frames/frame_${frameNum}.svg`,
        data: encoder.encode(svg),
      });

      options.onProgress(
        Math.min(92, Math.round((i / Math.max(1, totalFrames)) * 92))
      );
      if (i % 10 === 0) {
        await waitMs(0);
      }
    }

    throwIfAborted(options.signal);
    const frameCount = entries.length;
    const manifest = {
      title: source.title,
      aspectRatio: source.aspectRatio,
      width,
      height,
      fps: SVG_TAR_EXPORT_FPS,
      frameFormat: 'svg',
      frameCount,
      totalDurationMs: source.totalDurationMs,
      ffmpegCommand: `for f in frames/*.svg; do rsvg-convert "$f" -o "\${f%.svg}.png"; done && ffmpeg -framerate ${SVG_TAR_EXPORT_FPS} -i frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p output.mp4`,
    };
    entries.push({
      name: 'manifest.json',
      data: encoder.encode(JSON.stringify(manifest, null, 2)),
    });
    entries.push({
      name: 'README-ffmpeg.txt',
      data: encoder.encode(
        [
          `Penova Platform-Agnostic Vector Frame Bundle · ${source.title}`,
          `Resolution: ${width}x${height}, FPS: ${SVG_TAR_EXPORT_FPS} fps, Frames: ${frameCount}`,
          '',
          'Rasterize SVG frames (e.g. via rsvg-convert / resvg / Inkscape) and encode MP4 with FFmpeg:',
          manifest.ffmpegCommand,
        ].join('\n')
      ),
    });

    const tarBytes = buildTarArchive(entries);
    options.onProgress(100);

    return {
      blob: new Blob([tarBytes.slice()], { type: 'application/x-tar' }),
      filename: safeFilename(source.title, 'tar'),
      mimeType: 'application/x-tar',
      summary: `${frameCount} SVG frames @ ${SVG_TAR_EXPORT_FPS}fps`,
    };
  },
};
