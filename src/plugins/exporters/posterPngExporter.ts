import { ExportPlugin } from '../contracts';
import {
  canvasToBlob,
  createOffscreenCanvas,
  safeFilename,
  throwIfAborted,
} from './helpers';

export const posterPngExporterPlugin: ExportPlugin = {
  id: 'poster-png',
  name: 'HD Poster (1080P PNG)',
  shortLabel: 'HD PNG',
  category: 'snapshot',
  description: 'Instantly export the final board frame as a lossless 1080P PNG',
  isSupported() {
    return typeof document !== 'undefined';
  },
  async export(source, options) {
    throwIfAborted(options.signal);
    options.onProgress(15);

    const { canvas, ctx } = createOffscreenCanvas(source.width, source.height);
    source.renderFrame(
      ctx,
      source.width,
      source.height,
      source.totalDurationMs
    );
    throwIfAborted(options.signal);

    options.onProgress(70);
    const blob = await canvasToBlob(canvas, 'image/png');
    options.onProgress(100);

    return {
      blob,
      filename: safeFilename(source.title, 'png'),
      mimeType: 'image/png',
      summary: `${source.width}×${source.height} PNG`,
    };
  },
};
