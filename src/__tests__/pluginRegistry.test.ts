import { describe, expect, it } from 'vitest';
import {
  cameraRegistry,
  CameraPlugin,
  exportRegistry,
  ExportPlugin,
  glyphProviderRegistry,
  GlyphProviderPlugin,
  handRegistry,
  HandPlugin,
  layoutRegistry,
  LayoutPlugin,
  presentationRegistry,
  PresentationPlugin,
  registerStrokeOrderGlyphs,
  sceneNodeRegistry,
  SceneNodePlugin,
  shapeRegistry,
  ShapePlugin,
  transitionRegistry,
  TransitionPlugin,
} from '../plugins';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import { buildStrokePath } from '../engine/sketch/handDrawnGeometry';
import { getGlyphStrokeData } from '../engine/sketch/textStrokes';
import {
  compileTimeline,
  evaluateTimelineAt,
} from '../engine/timeline/timelineEngine';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import { exportProjectVideo } from '../engine/export/videoExporter';
import { evaluateCameraAt } from '../engine/camera/cameraDirector';
import { generateScriptSpec } from '../engine/parser/projectScript';
import { clipRayToRect } from '../plugins/shapes/clipHelpers';
import { finalizeLayout, makePositionedNode } from '../plugins/layouts/shared';
import {
  createCardNode,
  createConnectorNode,
  createCustomNode,
  createTextNode,
} from '../model/builders';
import { PRESET_SCENES } from '../model/presets';
import { createProjectFromScene } from '../model/project';
import { isCustomSceneNode, LessonScene } from '../model/scene';

describe('pluginRegistry & extensibility contracts', () => {
  it('registers all built-in shapes, layouts, presentations, glyphs, hands, and cameras', () => {
    expect(shapeRegistry.list().map((p) => p.id)).toEqual([
      'rounded',
      'circle',
      'cloud',
      'underline',
      'diamond',
      'divider',
    ]);

    expect(layoutRegistry.list().map((p) => p.id)).toEqual([
      'flow-horizontal',
      'flow-vertical',
      'mindmap',
      'concept-graph',
      'document',
      'freeform',
    ]);

    expect(presentationRegistry.list().map((p) => p.id)).toEqual([
      'chalkboard',
      'whiteboard',
      'blueprint',
      'letter-paper',
    ]);

    expect(glyphProviderRegistry.list().map((p) => p.id)).toEqual([
      'cjk-stroke-order',
      'stroke-order-dict',
      'ink-grid-fallback',
    ]);

    expect(handRegistry.list().map((p) => p.id)).toEqual([
      'hand-chalk',
      'hand-minimal',
      'tip-only',
      'hidden',
    ]);

    expect(cameraRegistry.list().map((p) => p.id)).toEqual([
      'auto-follow',
      'progressive-fit',
      'static-overview',
      'pen-follow',
    ]);

    expect(transitionRegistry.list().map((p) => p.id)).toEqual([
      'chalkboard-eraser',
      'page-turn',
      'crossfade',
      'cut',
    ]);

    expect(exportRegistry.list().map((p) => p.id)).toEqual([
      'mediarecorder-video',
      'poster-png',
      'png-sequence-tar',
      'poster-svg',
      'svg-sequence-tar',
      'node-mp4',
    ]);
  });

  it('resolves textbook stroke-order paths and respects priority overrides & cache invalidation', () => {
    const hGlyph = getGlyphStrokeData('H', '700 20px sans-serif', 20, '#ffffff', 'chalkboard');
    expect(hGlyph.segments).toHaveLength(3);

    const aGlyph = getGlyphStrokeData('A', '700 20px sans-serif', 20, '#ffffff', 'chalkboard');
    expect(aGlyph.segments).toHaveLength(3);

    const zhongGlyph = getGlyphStrokeData('中', '700 20px sans-serif', 20, '#ffffff', 'chalkboard');
    expect(zhongGlyph.segments).toHaveLength(4);

    const renGlyph = getGlyphStrokeData('人', '700 20px sans-serif', 20, '#ffffff', 'chalkboard');
    expect(renGlyph.segments).toHaveLength(2);

    // Custom bulk stroke dictionary injection
    registerStrokeOrderGlyphs({
      測: [[[0.1, 0.2], [0.9, 0.2]], [[0.5, 0.2], [0.5, 0.9]], [[0.2, 0.8], [0.8, 0.8]]],
    });
    const customDictGlyph = getGlyphStrokeData('測', '700 20px sans-serif', 20, '#ffffff', 'chalkboard');
    expect(customDictGlyph.segments).toHaveLength(3);

    // Higher-priority provider overrides even existing characters
    const overrideProvider: GlyphProviderPlugin = {
      id: 'test-high-priority-glyph',
      name: '测试高优字形源',
      priority: 120,
      resolveStrokes(ctx) {
        if (ctx.char !== 'H') return null;
        return [{ points: [{ x: 2, y: 2 }, { x: 14, y: 14 }], length: 17 }];
      },
    };

    glyphProviderRegistry.register(overrideProvider);
    try {
      const overridden = getGlyphStrokeData('H', '700 20px sans-serif', 20, '#ffffff', 'chalkboard');
      expect(overridden.segments).toHaveLength(1);
    } finally {
      glyphProviderRegistry.unregister(overrideProvider.id);
    }

    // Cache invalidation restores standard 3-stroke 'H' cleanly after unregister
    const restored = getGlyphStrokeData('H', '700 20px sans-serif', 20, '#ffffff', 'chalkboard');
    expect(restored.segments).toHaveLength(3);
  });

  it('registers and invokes custom HandPlugin cleanly', () => {
    let drawnAt: { x: number; y: number } | null = null;
    const customHand: HandPlugin = {
      id: 'test-hand-pointer',
      name: '测试手型',
      draw({ screenX, screenY }) {
        drawnAt = { x: screenX, y: screenY };
      },
    };

    handRegistry.register(customHand);
    try {
      const presentation = presentationRegistry.getOrDefault('chalkboard');
      handRegistry.getOrDefault('test-hand-pointer').draw({
        ctx: {} as CanvasRenderingContext2D,
        screenX: 120,
        screenY: 240,
        presentation,
        colorHex: '#ffffff',
        lift: 0,
        alpha: 1,
        penDown: true,
        velocity: 1,
        tMs: 500,
      });
      expect(drawnAt).toEqual({ x: 120, y: 240 });
    } finally {
      handRegistry.unregister(customHand.id);
    }
  });

  it('executes custom pure-text letter LayoutPlugin, ShapePlugin, and PresentationPlugin end-to-end', () => {
    const customShape: ShapePlugin = {
      id: 'test-divider-box',
      name: '测试装饰框',
      measureBox(contentW, contentH) {
        return {
          padX: 16,
          padY: 10,
          width: Math.max(80, Math.ceil(contentW + 32)),
          height: Math.max(36, Math.ceil(contentH + 20)),
        };
      },
      clipRay: clipRayToRect,
      generateStrokes() {
        return [];
      },
    };

    const customLayout: LayoutPlugin = {
      id: 'test-letter-flow',
      name: '测试信纸文稿',
      category: 'basic',
      icon: 'document',
      dragMode: 'offset',
      supportsEdges: false,
      compute(scene, helpers) {
        let cursorY = 0;
        const nodes = scene.nodes.map((n) => {
          const m = helpers.measureNode(n);
          const pNode = makePositionedNode(
            n,
            0,
            cursorY + m.height / 2,
            m,
            helpers
          );
          cursorY += m.height + 28;
          return pNode;
        });
        return finalizeLayout(nodes, []);
      },
      deriveSteps(scene) {
        return scene.nodes.map((n, idx) => ({
          id: `letter-step-${idx}-${n.id}`,
          title: n.name,
          nodeIds: [n.id],
        }));
      },
    };

    const customPresentation: PresentationPlugin = {
      id: 'test-paper',
      name: '测试信纸',
      fontFamily: 'serif',
      shadowColor: 'rgba(0,0,0,0.1)',
      soundProfile: {
        baseFreqHz: 1800,
        velocityFreqBoostHz: 200,
        baseGain: 0.02,
      },
      palette: {
        id: 'test-paper',
        label: '测试信纸',
        bgPrimary: '#fdf6e3',
        bgSecondary: '#f5ebd1',
        vignetteColor: 'rgba(0,0,0,0.08)',
        subtitleColor: '#5c4b37',
        labelPillBg: '#fffaf0',
        labelPillBorder: '#d6c7a9',
        colors: {
          white: '#2b2118',
          yellow: '#b45309',
          cyan: '#0369a1',
          pink: '#be123c',
          green: '#15803d',
          orange: '#c2410c',
        },
      },
      drawSurface() {},
      drawStroke() {},
      drawInstrument() {},
    };

    shapeRegistry.register(customShape);
    layoutRegistry.register(customLayout);
    presentationRegistry.register(customPresentation);

    try {
      // Pure TextSceneNode letter with left/indent/right alignment — zero shapes or connectors!
      const scene: LessonScene = {
        id: 'custom-letter-test',
        title: '手写一封信测试',
        theme: 'test-paper',
        layoutMode: 'test-letter-flow',
        cameraMode: 'auto-follow',
        aspectRatio: '16:9',
        handStyle: 'hand-chalk',
        nodes: [
          createTextNode({
            id: 'salutation',
            text: '见字如面：',
            align: 'left',
            maxWidth: 520,
            fontSize: 22,
            fontWeight: 700,
            color: 'white',
          }),
          createTextNode({
            id: 'body',
            text: '这是一段通过通用场景节点直接驱动核心引擎逐字书写的信件正文内容，没有任何硬编码外框或连线。',
            align: 'left',
            indentChars: 2,
            maxWidth: 520,
            fontSize: 19,
            color: 'cyan',
          }),
          createTextNode({
            id: 'signoff',
            text: '此致 敬礼\nPenova 工作室',
            align: 'right',
            maxWidth: 520,
            fontSize: 19,
            color: 'orange',
          }),
        ],
      };

      const layout = computeDiagramLayout(scene);
      expect(layout.nodes).toHaveLength(3);

      // Verify zero vertical overlaps in custom vertical stack
      for (let i = 1; i < layout.nodes.length; i++) {
        const prev = layout.nodes[i - 1];
        const curr = layout.nodes[i];
        expect(curr.cy - curr.height / 2).toBeGreaterThan(
          prev.cy + prev.height / 2
        );
      }

      const timeline = compileTimeline(scene, layout);
      expect(timeline.steps).toHaveLength(3);
      expect(timeline.steps[0].step.id).toBe('letter-step-0-salutation');

      // Verify left vs right alignment coordinates in compiled text lines
      const firstLine = timeline.steps[0].items.find(
        (i) => i.kind === 'text-line'
      )!;
      const signoffLine = timeline.steps[2].items.find(
        (i) => i.kind === 'text-line'
      )!;
      if (
        firstLine.kind === 'text-line' &&
        signoffLine.kind === 'text-line'
      ) {
        expect(firstLine.centerX).toBeLessThan(0);
        expect(signoffLine.centerX).toBeGreaterThan(0);
      }

      const midEval = evaluateTimelineAt(timeline, timeline.outroStartMs * 0.5);
      expect(Number.isFinite(midEval.pen.worldX)).toBe(true);
      expect(Number.isFinite(midEval.pen.worldY)).toBe(true);

      const endEval = evaluateTimelineAt(timeline, timeline.totalDurationMs);
      for (const item of timeline.allItems) {
        expect(endEval.itemProgress.get(item.id)).toBe(1);
      }

      const cam = evaluateCameraAt(
        timeline,
        timeline.outroStartMs * 0.5,
        1920,
        1080,
        'auto-follow'
      );
      expect(Number.isFinite(cam.cx)).toBe(true);
      expect(Number.isFinite(cam.cy)).toBe(true);
      expect(cam.zoom).toBeGreaterThan(0.1);
    } finally {
      shapeRegistry.unregister(customShape.id);
      layoutRegistry.unregister(customLayout.id);
      presentationRegistry.unregister(customPresentation.id);
    }
  });

  it('registers custom CameraPlugin and tracks vertical pen-follow progression on handwritten-letter', () => {
    const letterScene = PRESET_SCENES.find((p) => p.id === 'handwritten-letter')!;
    expect(letterScene).toBeDefined();

    const layout = computeDiagramLayout(letterScene);
    const timeline = compileTimeline(letterScene, layout);

    const camStart = evaluateCameraAt(timeline, 50, 960, 540, 'pen-follow');
    const camLate = evaluateCameraAt(
      timeline,
      timeline.outroStartMs - 150,
      960,
      540,
      'pen-follow'
    );
    const camOutro = evaluateCameraAt(
      timeline,
      timeline.totalDurationMs,
      960,
      540,
      'pen-follow'
    );
    const overviewCam = evaluateCameraAt(
      timeline,
      timeline.outroStartMs * 0.5,
      960,
      540,
      'static-overview'
    );

    expect(camStart.cy).toBeLessThanOrEqual(camLate.cy);
    expect(Math.abs(camStart.cx - camLate.cx)).toBeLessThan(1e-3);
    expect(camOutro.cx).toBeCloseTo(overviewCam.cx, 2);
    expect(camOutro.cy).toBeCloseTo(overviewCam.cy, 2);
    expect(camOutro.zoom).toBeCloseTo(overviewCam.zoom, 3);

    const customCam: CameraPlugin = {
      id: 'test-fixed-closeup',
      name: '测试固定特写',
      evaluate(ctx) {
        return {
          cx: ctx.activePen?.worldX ?? ctx.fullBounds.x,
          cy: ctx.activePen?.worldY ?? ctx.fullBounds.y,
          zoom: 1.42,
        };
      },
    };

    cameraRegistry.register(customCam);
    try {
      const evaluated = evaluateCameraAt(
        timeline,
        timeline.outroStartMs * 0.4,
        1920,
        1080,
        'test-fixed-closeup'
      );
      expect(evaluated.zoom).toBe(1.42);
      expect(Number.isFinite(evaluated.cx)).toBe(true);
      expect(Number.isFinite(evaluated.cy)).toBe(true);
    } finally {
      cameraRegistry.unregister(customCam.id);
    }
  });

  it('registers and invokes custom TransitionPlugin cleanly', () => {
    let seenProgress = -1;
    const customTransition: TransitionPlugin = {
      id: 'test-wipe-left',
      name: '测试左滑擦除',
      defaultDurationMs: 500,
      render(context) {
        seenProgress = context.progress;
      },
    };

    transitionRegistry.register(customTransition);
    try {
      const plugin = transitionRegistry.getOrDefault('test-wipe-left');
      expect(plugin.defaultDurationMs).toBe(500);
      plugin.render({
        ctx: {} as CanvasRenderingContext2D,
        width: 1920,
        height: 1080,
        progress: 0.62,
        fromCanvas: {} as HTMLCanvasElement,
        toCanvas: {} as HTMLCanvasElement,
        fromScene: PRESET_SCENES[0],
        toScene: PRESET_SCENES[1],
      });
      expect(seenProgress).toBeCloseTo(0.62, 5);
    } finally {
      transitionRegistry.unregister(customTransition.id);
    }
  });

  it('registers and invokes custom ExportPlugin via exportProjectVideo facade', async () => {
    const customExporter: ExportPlugin = {
      id: 'test-custom-exporter',
      name: '测试 JSON 清单导出',
      shortLabel: '测试导出',
      async export(source, options) {
        options.onProgress(50);
        options.onProgress(100);
        const payload = JSON.stringify({
          title: source.title,
          width: source.width,
          height: source.height,
          duration: source.totalDurationMs,
        });
        return {
          blob: new Blob([payload], { type: 'application/json' }),
          filename: 'custom-export.json',
          mimeType: 'application/json',
          summary: '测试自定义导出',
        };
      },
    };

    exportRegistry.register(customExporter);
    try {
      const proj = createProjectFromScene(PRESET_SCENES[0]);
      const compiled = compileProjectTimeline(proj);
      const progressCalls: number[] = [];

      const out = await exportProjectVideo(compiled, {
        exporterId: 'test-custom-exporter',
        onProgress: (p) => progressCalls.push(p),
      });

      expect(out.filename).toBe('custom-export.json');
      expect(out.summary).toBe('测试自定义导出');
      expect(progressCalls).toEqual([50, 100]);
      const text = await out.blob.text();
      expect(JSON.parse(text)).toMatchObject({
        title: PRESET_SCENES[0].title,
        width: 1920,
        height: 1080,
      });
    } finally {
      exportRegistry.unregister(customExporter.id);
    }
  });

  it('maintains referentially stable list() snapshots for useSyncExternalStore until mutation', () => {
    const snap1 = shapeRegistry.list();
    const snap2 = shapeRegistry.list();
    expect(snap1).toBe(snap2);

    const tempShape: ShapePlugin = {
      id: 'test-snapshot-shape',
      name: '快照测试框',
      measureBox: () => ({ width: 80, height: 40, padX: 8, padY: 8 }),
      clipRay: clipRayToRect,
      generateStrokes: () => [],
    };
    shapeRegistry.register(tempShape);
    try {
      const snapAfterAdd = shapeRegistry.list();
      expect(snapAfterAdd).not.toBe(snap1);
      expect(shapeRegistry.list()).toBe(snapAfterAdd);
    } finally {
      shapeRegistry.unregister(tempShape.id);
    }

    const snapAfterRemove = shapeRegistry.list();
    expect(snapAfterRemove).toHaveLength(snap1.length);
    expect(shapeRegistry.list()).toBe(snapAfterRemove);
  });

  it('supports custom SceneNodePlugin in both composite (compose) and primitive (measure + compile) modes', () => {
    const kvPlugin: SceneNodePlugin = {
      id: 'key-value',
      name: 'Key-Value Card',
      compose(node) {
        return {
          id: `${node.id}-composed`,
          type: 'group',
          name: node.name,
          color: node.color,
          arrange: 'card',
          gap: 6,
          children: [
            {
              id: `${node.id}-frame`,
              type: 'shape',
              name: 'Frame',
              color: node.color,
              shape: 'rounded',
              fitMode: 'auto-group',
            },
            createTextNode({
              id: `${node.id}-key`,
              text: String(node.props?.key ?? node.name),
              color: node.color,
              fontSize: 20,
              fontWeight: 700,
            }),
            createTextNode({
              id: `${node.id}-val`,
              text: String(node.props?.value ?? ''),
              color: 'white',
              fontSize: 15,
            }),
          ],
        };
      },
    };

    const waveAxisPlugin: SceneNodePlugin = {
      id: 'wave-axis',
      name: 'Wave Axis Diagram',
      measure() {
        return { width: 220, height: 120 };
      },
      compile(positioned, helpers) {
        const left = positioned.cx - positioned.width / 2 + 16;
        const right = positioned.cx + positioned.width / 2 - 16;
        const bottom = positioned.cy + positioned.height / 2 - 20;
        const top = positioned.cy - positioned.height / 2 + 16;

        helpers.pushStroke(
          buildStrokePath(
            `${positioned.id}-x-axis`,
            [
              { x: left, y: bottom },
              { x: right, y: bottom },
            ],
            { width: 2.4, color: positioned.node.color, opacity: 0.9 }
          ),
          35
        );
        helpers.pushStroke(
          buildStrokePath(
            `${positioned.id}-y-axis`,
            [
              { x: left, y: bottom },
              { x: left, y: top },
            ],
            { width: 2.4, color: positioned.node.color, opacity: 0.9 }
          ),
          45
        );
        const title = isCustomSceneNode(positioned.node)
          ? String(positioned.node.props?.title ?? positioned.node.name)
          : positioned.node.name;
        helpers.pushTextLine({
          text: title,
          boxLeftX: positioned.cx - positioned.width / 2,
          boxWidth: positioned.width,
          centerY: positioned.cy,
          fontSize: 16,
          color: positioned.node.color,
        });
      },
    };

    sceneNodeRegistry.register(kvPlugin);
    sceneNodeRegistry.register(waveAxisPlugin);

    try {
      const spec = generateScriptSpec();
      expect(spec).toContain('**scene-node**');
      expect(spec).toContain('`key-value`');
      expect(spec).toContain('`wave-axis`');

      const scene: LessonScene = {
        id: 'custom-scene-node-test',
        title: 'Custom SceneNode Pipeline',
        theme: 'chalkboard',
        layoutMode: 'flow-horizontal',
        cameraMode: 'auto-follow',
        aspectRatio: '16:9',
        handStyle: 'hand-chalk',
        nodes: [
          createCustomNode({
            id: 'kv-1',
            kind: 'key-value',
            name: 'Latency',
            color: 'yellow',
            props: { key: 'P99 Latency', value: '12 ms' },
          }),
          createCustomNode({
            id: 'axis-1',
            kind: 'wave-axis',
            name: 'Signal Plot',
            color: 'cyan',
            props: { title: 'f(t) = sin(t)' },
          }),
          createCardNode({
            id: 'end-1',
            label: 'Done',
            color: 'green',
            shape: 'none',
          }),
          createConnectorNode({
            id: 'e-kv-axis',
            fromId: 'kv-1',
            toId: 'axis-1',
            color: 'yellow',
          }),
        ],
      };

      const layout = computeDiagramLayout(scene);
      const kvPositioned = layout.nodeMap.get('kv-1')!;
      const axisPositioned = layout.nodeMap.get('axis-1')!;
      expect(kvPositioned.width).toBeGreaterThan(80);
      expect(kvPositioned.children?.length).toBeGreaterThan(0);
      expect(axisPositioned.width).toBe(220);
      expect(axisPositioned.height).toBe(120);

      const timeline = compileTimeline(scene, layout);
      expect(timeline.allItems.some((i) => i.kind === 'stroke')).toBe(true);
      expect(timeline.allItems.some((i) => i.kind === 'text-line')).toBe(true);

      const mid = evaluateTimelineAt(timeline, timeline.outroStartMs * 0.5);
      expect(Number.isFinite(mid.pen.worldX)).toBe(true);
      expect(Number.isFinite(mid.pen.worldY)).toBe(true);

      const end = evaluateTimelineAt(timeline, timeline.totalDurationMs);
      for (const item of timeline.allItems) {
        expect(end.itemProgress.get(item.id)).toBe(1);
      }
    } finally {
      sceneNodeRegistry.unregister(kvPlugin.id);
      sceneNodeRegistry.unregister(waveAxisPlugin.id);
    }
  });
});
