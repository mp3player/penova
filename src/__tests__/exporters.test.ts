import { describe, expect, it } from 'vitest';
import { buildTarArchive, safeFilename } from '../plugins/exporters/helpers';
import { createHttpBridgeExportPlugin, exportRegistry } from '../plugins';
import {
  createProjectFrameSource,
  exportProjectVideo,
  exportScriptToVideo,
} from '../engine/export/videoExporter';
import { renderProjectFrameSvg } from '../engine/render/frameSnapshot';
import {
  clearGlyphCache,
  getGlyphStrokeData,
} from '../engine/sketch/textStrokes';
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

  it('exports SVG posters, SVG frame tar bundles, snapshots, and HTTP bridge payloads without browser Canvas or document', async () => {
    const script = [
      '---',
      'title: Headless Pipeline Demo',
      'aspectRatio: 16:9',
      'subtitles: auto',
      '---',
      '=== scene ===',
      'title: Scene 1',
      'theme: chalkboard',
      'layout: flow-horizontal',
      '---',
      '[root] Plain Text | Pure SVG {color: yellow, shape: circle, say: "Writing text cleanly"}',
      '[step] Target | Output {color: cyan, shape: rounded}',
      'Plain Text -> Target : Render',
    ].join('\n');

    // 1. Direct script -> poster-svg export
    const svgPoster = await exportScriptToVideo(script, {
      exporterId: 'poster-svg',
    });
    expect(svgPoster.mimeType).toContain('image/svg+xml');
    expect(svgPoster.filename).toBe('Headless_Pipeline_Demo.svg');
    const svgText = await svgPoster.blob.text();
    expect(svgText).toContain('<svg');
    expect(svgText).toContain('Plain Text');

    // 2. Direct script -> svg-sequence-tar export (headless default when MediaRecorder is unavailable)
    const svgTar = await exportScriptToVideo(script);
    expect(svgTar.mimeType).toBe('application/x-tar');
    expect(svgTar.warnings).toEqual([]);
    expect(svgTar.subtitlesSrt).toContain('Writing text cleanly');
    const tarBytes = new Uint8Array(await svgTar.blob.arrayBuffer());
    expect(tarBytes.length % 512).toBe(0);
    expect(decoder.decode(tarBytes.subarray(0, 22))).toContain(
      'frames/frame_00001.svg'
    );

    // 3. Platform-agnostic evaluateFrame & HTTP bridge auto-selecting SVG without createCanvas
    const compiled = compileProjectTimeline(svgPoster.project);
    const source = createProjectFrameSource(compiled, 2);
    const snap = source.evaluateFrame!(compiled.totalDurationMs * 0.5);
    expect(snap.kind).toBe('scene');
    expect(snap.width).toBe(1920);
    expect(snap.height).toBe(1080);

    let capturedFormat = '';
    let capturedFrames: string[] = [];
    const headlessBridge = createHttpBridgeExportPlugin({
      id: 'headless-svg-bridge',
      name: 'Headless SVG Bridge',
      endpointUrl: 'http://localhost:8787/svg-render',
      fps: 2,
      fetchImpl: async (_url, init) => {
        const payload = JSON.parse(String(init?.body ?? '{}')) as {
          frameFormat: string;
          frames: string[];
        };
        capturedFormat = payload.frameFormat;
        capturedFrames = payload.frames;
        return new Response(new Uint8Array([9, 8, 7]), {
          status: 200,
          headers: { 'Content-Type': 'video/mp4' },
        });
      },
    });
    exportRegistry.register(headlessBridge);
    try {
      const bridgeOut = await exportProjectVideo(compiled, {
        exporterId: 'headless-svg-bridge',
        onProgress: () => {},
      });
      expect(bridgeOut.mimeType).toBe('video/mp4');
      expect(capturedFormat).toBe('svg');
      expect(capturedFrames.length).toBeGreaterThan(2);
      expect(capturedFrames[0]).toContain('<svg');
    } finally {
      exportRegistry.unregister('headless-svg-bridge');
    }
  });

  it('caches headless fallback glyphs with multi-stroke geometry and renders theme-specific SVG surfaces', () => {
    clearGlyphCache();
    const g1 = getGlyphStrokeData('龍', '20px sans-serif', 20, '#ffffff', 'chalkboard');
    const g2 = getGlyphStrokeData('龍', '20px sans-serif', 20, '#ffffff', 'chalkboard');
    expect(g1).toBe(g2);
    expect(g1.segments.length).toBeGreaterThanOrEqual(3);

    const blueprintProj = createProjectFromScene({
      ...PRESET_SCENES[0],
      theme: 'blueprint',
    });
    const bpCompiled = compileProjectTimeline(blueprintProj);
    const bpSvg = renderProjectFrameSvg(bpCompiled, 500, 1280, 720);
    expect(bpSvg).toContain('-grid-minor');
    expect(bpSvg).toContain('-grid-major');

    const letterProj = createProjectFromScene({
      ...PRESET_SCENES[0],
      theme: 'letter-paper',
    });
    const lpCompiled = compileProjectTimeline(letterProj);
    const lpSvg = renderProjectFrameSvg(lpCompiled, 500, 1280, 720);
    expect(lpSvg).toContain('rgba(196, 104, 94, 0.26)');
  });
});
