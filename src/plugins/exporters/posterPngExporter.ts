import { ExportPlugin } from '../contracts';
import {
  canvasToBlob,
  createOffscreenCanvas,
  safeFilename,
  throwIfAborted,
} from './helpers';

export const posterPngExporterPlugin: ExportPlugin = {
  id: 'poster-png',
  name: '高清成品图 (1080P PNG)',
  shortLabel: '高清 PNG',
  description: '瞬时导出最终板书高清无损 PNG 静态海报',
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
