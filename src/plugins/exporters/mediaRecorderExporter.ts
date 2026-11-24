import { ExportPlugin } from '../contracts';
import {
  createOffscreenCanvas,
  safeFilename,
  throwIfAborted,
  waitMs,
} from './helpers';

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('当前浏览器不支持 MediaRecorder 视频录制');
  }

  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export const mediaRecorderExporterPlugin: ExportPlugin = {
  id: 'mediarecorder-video',
  name: '1080P Video (WebM/MP4)',
  shortLabel: '1080P Video',
  category: 'sequence',
  description: 'Encode 1080P animation video in browser via MediaRecorder',
  isSupported() {
    return (
      typeof document !== 'undefined' && typeof MediaRecorder !== 'undefined'
    );
  },
  async export(source, options) {
    throwIfAborted(options.signal);

    const mimeType = pickSupportedMimeType();
    const { canvas, ctx } = createOffscreenCanvas(source.width, source.height);

    // Paint initial frame before captureStream begins recording
    source.renderFrame(ctx, source.width, source.height, 0);

    const stream = canvas.captureStream(source.fps);
    const videoTrack = stream.getVideoTracks()[0] as
      | (MediaStreamTrack & { requestFrame?: () => void })
      | undefined;

    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: 8_000_000,
    };
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    const recorder = new MediaRecorder(stream, recorderOptions);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const stopPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const resolvedMime = recorder.mimeType || mimeType || 'video/webm';
        resolve(new Blob(chunks, { type: resolvedMime }));
      };
      recorder.onerror = () => {
        reject(new Error('视频编码过程中出现错误'));
      };
    });

    const totalFrames = Math.max(
      1,
      Math.ceil((source.totalDurationMs / 1000) * source.fps)
    );
    const frameIntervalMs = 1000 / source.fps;

    recorder.start(250);
    options.onProgress(0);
    const startWall = performance.now();

    try {
      for (let frameIdx = 0; frameIdx <= totalFrames; frameIdx++) {
        if (options.signal?.aborted) {
          if (recorder.state !== 'inactive') recorder.stop();
          stream.getTracks().forEach((t) => t.stop());
          throw new DOMException('导出已取消', 'AbortError');
        }

        const tMs = Math.min(
          source.totalDurationMs,
          frameIdx * frameIntervalMs
        );
        source.renderFrame(ctx, source.width, source.height, tMs);

        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          videoTrack.requestFrame();
        }

        options.onProgress(
          Math.min(99, Math.round((frameIdx / totalFrames) * 100))
        );
        const targetWall = startWall + (frameIdx + 1) * frameIntervalMs;
        const remain = targetWall - performance.now();
        if (remain > 1) {
          await waitMs(remain);
        } else if (frameIdx % 4 === 0) {
          await waitMs(0);
        }
      }

      // Hold final frame slightly so recorder flushes tail buffer cleanly
      await waitMs(120);
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }

      const blob = await stopPromise;
      options.onProgress(100);

      const finalMime = blob.type || mimeType || 'video/webm';
      const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
      return {
        blob,
        filename: safeFilename(source.title, ext),
        mimeType: finalMime,
        summary: `${source.width}×${source.height} @ ${source.fps}fps`,
      };
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  },
};
