import { ExportPlugin } from '../contracts';
import {
  buildTarArchive,
  canvasToBlob,
  createOffscreenCanvas,
  safeFilename,
  TarEntry,
  throwIfAborted,
  waitMs,
} from './helpers';

const TAR_EXPORT_FPS = 12;
const encoder = new TextEncoder();

export const pngSequenceTarExporterPlugin: ExportPlugin = {
  id: 'png-sequence-tar',
  name: '离线帧包 (FFmpeg .tar)',
  shortLabel: 'FFmpeg 帧包',
  description: '逐帧无丢帧渲染 PNG 序列与 FFmpeg 合成指令并打包为 .tar',
  isSupported() {
    return typeof document !== 'undefined';
  },
  async export(source, options) {
    throwIfAborted(options.signal);

    const width = source.aspectRatio === '9:16' ? 720 : 1280;
    const height = source.aspectRatio === '9:16' ? 1280 : 720;
    const { canvas, ctx } = createOffscreenCanvas(width, height);

    const frameIntervalMs = 1000 / TAR_EXPORT_FPS;
    const totalFrames = Math.max(
      1,
      Math.ceil((source.totalDurationMs / 1000) * TAR_EXPORT_FPS)
    );

    const entries: TarEntry[] = [];
    options.onProgress(0);

    for (let i = 0; i <= totalFrames; i++) {
      throwIfAborted(options.signal);

      const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
      source.renderFrame(ctx, width, height, tMs);

      const pngBlob = await canvasToBlob(canvas, 'image/png');
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      const frameNum = String(i + 1).padStart(5, '0');
      entries.push({
        name: `frames/frame_${frameNum}.png`,
        data: pngBytes,
      });

      options.onProgress(
        Math.min(92, Math.round((i / Math.max(1, totalFrames)) * 92))
      );
      if (i % 4 === 0) {
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
      fps: TAR_EXPORT_FPS,
      frameCount,
      totalDurationMs: source.totalDurationMs,
      ffmpegCommand: `ffmpeg -framerate ${TAR_EXPORT_FPS} -i frames/frame_%05d.png -c:v libx264 -pix_fmt yuv420p output.mp4`,
    };
    entries.push({
      name: 'manifest.json',
      data: encoder.encode(JSON.stringify(manifest, null, 2)),
    });
    entries.push({
      name: 'README-ffmpeg.txt',
      data: encoder.encode(
        [
          `Penova 离线无损帧序列包 · ${source.title}`,
          `分辨率: ${width}x${height}, 帧率: ${TAR_EXPORT_FPS} fps, 共 ${frameCount} 帧`,
          '',
          '解压后在当前目录执行以下命令即可合成高画质 MP4：',
          manifest.ffmpegCommand,
          '',
          '若需同时混入本地配音或背景音乐（例如 audio.mp3）：',
          `ffmpeg -framerate ${TAR_EXPORT_FPS} -i frames/frame_%05d.png -i audio.mp3 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest output_with_audio.mp4`,
        ].join('\n')
      ),
    });

    const tarBytes = buildTarArchive(entries);
    options.onProgress(100);

    return {
      blob: new Blob([tarBytes.slice()], { type: 'application/x-tar' }),
      filename: safeFilename(source.title, 'tar'),
      mimeType: 'application/x-tar',
      summary: `${frameCount} 帧 @ ${TAR_EXPORT_FPS}fps`,
    };
  },
};
