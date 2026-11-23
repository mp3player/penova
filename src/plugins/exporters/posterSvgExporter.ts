import { ExportPlugin } from '../contracts';
import { safeFilename, throwIfAborted } from './helpers';

const encoder = new TextEncoder();

export const posterSvgExporterPlugin: ExportPlugin = {
  id: 'poster-svg',
  name: 'Vector Poster (1080P SVG)',
  shortLabel: 'HD SVG',
  description:
    'Export the final board frame as a resolution-independent 1080P SVG without Canvas',
  isSupported() {
    return true;
  },
  async export(source, options) {
    throwIfAborted(options.signal);
    if (!source.renderSvgFrame) {
      throw new Error('当前导出源不支持 SVG 矢量帧渲染');
    }
    options.onProgress(20);

    const svg = source.renderSvgFrame(
      source.totalDurationMs,
      source.width,
      source.height
    );
    throwIfAborted(options.signal);
    options.onProgress(100);

    const bytes = encoder.encode(svg);
    return {
      blob: new Blob([bytes], { type: 'image/svg+xml;charset=utf-8' }),
      filename: safeFilename(source.title, 'svg'),
      mimeType: 'image/svg+xml;charset=utf-8',
      summary: `${source.width}×${source.height} SVG`,
    };
  },
};
