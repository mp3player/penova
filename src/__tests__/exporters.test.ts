import { describe, expect, it } from 'vitest';
import { buildTarArchive, safeFilename } from '../plugins/exporters/helpers';
import { createHttpBridgeExportPlugin } from '../plugins';
import { createProjectFrameSource } from '../engine/export/videoExporter';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import { PRESET_SCENES } from '../model/presets';
import { createProjectFromScene } from '../model/project';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

describe('exporters infrastructure & plugins', () => {
  it('builds valid 512-byte aligned POSIX ustar archives with verified header checksums', () => {
    const fileA = encoder.encode('{"fps":12}');
    const fileB = encoder.encode('hello-frame-payload');
    const tar = buildTarArchive([
      { name: 'manifest.json', data: fileA },
      { name: 'frames/frame_00001.png', data: fileB },
    ]);

    expect(tar.length % 512).toBe(0);
    // 2 headers (1024) + 2 padded 512 data blocks (1024) + 2 EOF zero blocks (1024) = 3072
    expect(tar.length).toBe(3072);

    // Check first file header
    const magic0 = decoder.decode(tar.subarray(257, 262));
    expect(magic0).toBe('ustar');
    const name0 = decoder.decode(tar.subarray(0, 13));
    expect(name0).toBe('manifest.json');
    const sizeOctal0 = decoder.decode(tar.subarray(124, 135));
    expect(parseInt(sizeOctal0, 8)).toBe(fileA.length);
    const storedChecksum0 = parseInt(
      decoder.decode(tar.subarray(148, 154)),
      8
    );

    // Recompute POSIX unsigned byte sum with spaces (0x20) in checksum field 148..155
    let computedSum = 0;
    for (let i = 0; i < 512; i++) {
      computedSum += i >= 148 && i < 156 ? 0x20 : tar[i];
    }
    expect(storedChecksum0).toBe(computedSum);
    expect(decoder.decode(tar.subarray(512, 512 + fileA.length))).toBe(
      '{"fps":12}'
    );

    // Check second file payload at offset 1024 + 512 = 1536
    expect(decoder.decode(tar.subarray(1536, 1536 + fileB.length))).toBe(
      'hello-frame-payload'
    );

    // Check 1024 zero trailer blocks at the end
    const trailer = tar.subarray(tar.length - 1024);
    expect(trailer.every((b) => b === 0)).toBe(true);
  });

  it('computes 16:9 and 9:16 ExportFrameSource dimensions cleanly from compiled projects', () => {
    const landscapeProj = createProjectFromScene(PRESET_SCENES[0]);
    const landscapeCompiled = compileProjectTimeline(landscapeProj);
    const landscapeSrc = createProjectFrameSource(landscapeCompiled, 30);
    expect(landscapeSrc.width).toBe(1920);
    expect(landscapeSrc.height).toBe(1080);
    expect(landscapeSrc.fps).toBe(30);
    expect(landscapeSrc.totalDurationMs).toBe(landscapeCompiled.totalDurationMs);

    const portraitProj = createProjectFromScene({
      ...PRESET_SCENES[0],
      aspectRatio: '9:16',
    });
    const portraitCompiled = compileProjectTimeline(portraitProj);
    const portraitSrc = createProjectFrameSource(portraitCompiled, 24);
    expect(portraitSrc.width).toBe(1080);
    expect(portraitSrc.height).toBe(1920);
    expect(portraitSrc.fps).toBe(24);
  });

  it('invokes createHttpBridgeExportPlugin against mocked fetchImpl and respects AbortSignal', async () => {
    let postedBody: Record<string, unknown> | null = null;
    let renderedFrames = 0;

    const fakeFetch: typeof fetch = async (_url, init) => {
      postedBody = JSON.parse(String(init?.body ?? '{}'));
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { 'Content-Type': 'video/mp4' },
      });
    };

    const bridge = createHttpBridgeExportPlugin({
      id: 'ffmpeg-bridge-test',
      name: 'FFmpeg 本地桥接',
      endpointUrl: 'http://localhost:8787/render',
      fps: 2,
      fetchImpl: fakeFetch,
      createCanvas() {
        return {
          getContext() {
            return {} as CanvasRenderingContext2D;
          },
        } as unknown as HTMLCanvasElement;
      },
      async encodeFrame() {
        return 'ZmFrZQ==';
      },
    });

    const progressMarks: number[] = [];
    const output = await bridge.export(
      {
        title: 'HTTP/讲解:Demo',
        aspectRatio: '16:9',
        totalDurationMs: 1000,
        width: 1280,
        height: 720,
        fps: 30,
        renderFrame() {
          renderedFrames++;
        },
      },
      { onProgress: (pct) => progressMarks.push(pct) }
    );

    expect(renderedFrames).toBe(3); // t = 0, 500, 1000 at 2fps
    expect(postedBody).not.toBeNull();
    expect((postedBody as unknown as { frames: string[] }).frames).toHaveLength(3);
    expect(output.filename).toBe(safeFilename('HTTP/讲解:Demo', 'mp4'));
    expect(output.mimeType).toBe('video/mp4');
    expect(progressMarks[progressMarks.length - 1]).toBe(100);

    // Pre-aborted signal rejects cleanly with AbortError
    const controller = new AbortController();
    controller.abort();
    await expect(
      bridge.export(
        {
          title: 'Aborted',
          aspectRatio: '16:9',
          totalDurationMs: 500,
          width: 1280,
          height: 720,
          fps: 2,
          renderFrame() {},
        },
        { onProgress: () => {}, signal: controller.signal }
      )
    ).rejects.toThrow();
  });
});
