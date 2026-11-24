import { describe, expect, it } from 'vitest';
import { exportScriptToVideo } from '../engine/export/videoExporter';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import { renderProjectFrameSvg } from '../engine/render/frameSnapshot';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import { createCardNode, getCardSummary } from '../model/builders';
import { cloneScene, PRESET_SCENES } from '../model/presets';
import { createProjectFromScene } from '../model/project';
import { isCustomSceneNode } from '../model/scene';
import { parseScriptToScene, serializeSceneToScript } from '../plugins/codecs/scriptParser';
import { generateScriptSpec } from '../engine/parser/projectScript';
import { exportRegistry, sceneNodeRegistry } from '../plugins/registry';
import { defineProps, prop } from '../sdk/propSchema';
import {
  bitmapToPolylinesWorkflow,
  getSketchIconSvg,
  listSketchIcons,
  registerSketchIcon,
  sketchPipeline,
  subscribeSketchIcons,
} from '../sdk/sketchPipeline';
import {
  compileWorkflowGraph,
  createAtomicNode,
  GRAPH_INPUT_ID,
} from '../sdk/workflowDag';

describe('sketchPipeline, recursive DAG & visual SceneNode plugins', () => {
  it('registers built-in icon, sketch, code, and chart SceneNode plugins', () => {
    expect(sceneNodeRegistry.get('icon')).toBeDefined();
    expect(sceneNodeRegistry.get('sketch')).toBeDefined();
    expect(sceneNodeRegistry.get('code')).toBeDefined();
    expect(sceneNodeRegistry.get('chart')).toBeDefined();
    expect(listSketchIcons().length).toBeGreaterThanOrEqual(20);
  });

  it('supports recursive DAG execution and SVG conversion in src/sdk', () => {
    const double = createAtomicNode<number, number>('double', (x) => x * 2);
    const inc = createAtomicNode<number, number>('inc', (x) => x + 1);
    const wf = compileWorkflowGraph<number, number>({
      id: 'dag-test',
      nodes: [
        { id: 'double', node: double, from: [GRAPH_INPUT_ID] },
        { id: 'inc', node: inc, from: ['double'] },
      ],
      output: 'inc',
    });
    expect(wf.run(7)).toBe(15);

    const strokes = sketchPipeline.run({
      asset: { kind: 'svg', svgText: getSketchIconSvg('rocket')! },
      options: { seed: 'sdk-rocket', targetWidth: 100, targetHeight: 100 },
    });
    expect(strokes.length).toBeGreaterThanOrEqual(4);
  });

  it('round-trips card icon attribute through scriptParser cleanly', () => {
    const base = { ...cloneScene(PRESET_SCENES[0]), nodes: [] };
    const card = createCardNode({
      id: 'c-icon',
      label: 'Browser',
      subtitle: 'Client UI',
      role: 'root',
      color: 'cyan',
      shape: 'rounded',
      icon: 'browser',
    });
    expect(getCardSummary(card).icon).toBe('browser');

    const serialized = serializeSceneToScript({ ...base, nodes: [card] });
    expect(serialized).toContain('icon: browser');

    const reparsed = parseScriptToScene(serialized, base);
    expect(reparsed.warnings).toEqual([]);
    expect(getCardSummary(reparsed.scene.nodes[0]).icon).toBe('browser');
  });

  it('compiles and renders whiteboard sticker cards, icons, code windows, and charts cleanly', () => {
    const script = [
      '---',
      'title: Visual Widgets Showcase',
      'aspectRatio: 16:9',
      '---',
      '=== scene ===',
      'title: Widgets',
      'theme: whiteboard',
      'layout: concept-graph',
      '---',
      '[root] Penova Engine | 声明式动画 {color: yellow, shape: rounded, icon: rocket, group: 核心}',
      '[node:code] CodeBox {color: cyan, title: "demo.penova.md", lines: "sceneNodeRegistry.register({\\n  id: \\"custom\\"\\n});", group: 配图}',
      '[node:chart] RenderSpeed {color: orange, title: "出片效率", values: "18,42,76,100", labels: "手动,模板,代码,Penova", group: 配图}',
      '[node:sketch] SketchArt {color: pink, icon: cat, title: "Hand-Drawn", group: 核心}',
      'Penova Engine -> CodeBox : 编译',
    ].join('\n');

    const base = cloneScene(PRESET_SCENES[0]);
    const parsed = parseScriptToScene(
      script.split('---').slice(-1)[0].trim(),
      { ...base, theme: 'whiteboard', layoutMode: 'concept-graph', nodes: [] }
    );
    expect(parsed.warnings).toEqual([]);

    const layout = computeDiagramLayout(parsed.scene);
    expect(layout.nodes).toHaveLength(5);

    const project = createProjectFromScene(parsed.scene);
    const compiled = compileProjectTimeline(project);
    const svg = renderProjectFrameSvg(compiled, compiled.totalDurationMs - 200, 1280, 720);

    // Sticker shadow & pastel fill present on whiteboard
    expect(svg).toContain('#fef3c7');
    expect(svg).toContain('rgba(35, 38, 41, 0.08)');
    // Neutral dark title color (#232629) used inside whiteboard card
    expect(svg).toContain('fill="#232629"');
    // Chart labels, code text (with curly braces), and sketch caption present
    expect(svg).toContain('demo.penova.md');
    expect(svg).toContain('Penova');
    expect(svg).toContain('Hand-Drawn');
    // Code text uses monospace font in SVG, and whiteboard highlighted orange bar uses ink orange (#c85a28) instead of pastel card fill (#ffedd5)
    expect(svg).toContain('JetBrains Mono');
    expect(svg).toContain('fill="#c85a28"');
  });

  it('losslessly round-trips multiline code, chart, sketch captions, numeric/bool strings, and apostrophe labels', () => {
    const base = { ...cloneScene(PRESET_SCENES[0]), nodes: [] };
    const script = [
      '# Widget Round-Trip',
      "[concept] Newton's Law | Gravity's pull {color: yellow, shape: rounded, icon: lightbulb}",
      '[node:code] Snippet {color: cyan, title: "404", lines: "sceneNodeRegistry.register({\\n  id: \\"custom\\",\\n  ok: true\\n});", flag: "true"}',
      '[node:chart] Speed {color: orange, title: "123", values: "10,40,90", labels: "A,B,C", highlight: 2}',
      '[node:sketch] Art {color: pink, icon: cat, caption: "Cute Cat"}',
      '[node:icon] Spark {color: green, icon: spark, size: 36}',
      "A -> Newton's Law : explains {color: cyan}",
    ].join('\n');

    const p1 = parseScriptToScene(script, base);
    expect(p1.warnings).toEqual([]);

    const card = p1.scene.nodes[0];
    expect(getCardSummary(card).color).toBe('yellow');
    expect(getCardSummary(card).icon).toBe('lightbulb');

    const code1 = p1.scene.nodes[1];
    expect(isCustomSceneNode(code1)).toBe(true);
    if (isCustomSceneNode(code1)) {
      expect(code1.props?.title).toBe('404');
      expect(code1.props?.flag).toBe('true');
      expect(code1.props?.lines).toBe(
        'sceneNodeRegistry.register({\n  id: "custom",\n  ok: true\n});'
      );
    }

    const sketch1 = p1.scene.nodes[3];
    if (isCustomSceneNode(sketch1)) {
      expect(sketch1.props?.caption).toBe('Cute Cat');
      expect(sketch1.meta?.say).toBeUndefined();
    }

    // Two full serialize -> parse round-trips must stay identical with zero stray backslashes
    const s1 = serializeSceneToScript(p1.scene);
    const p2 = parseScriptToScene(s1, base);
    expect(p2.warnings).toEqual([]);
    const s2 = serializeSceneToScript(p2.scene);
    const p3 = parseScriptToScene(s2, base);
    expect(p3.warnings).toEqual([]);
    expect(s2).toBe(s1);

    const code3 = p3.scene.nodes[1];
    if (isCustomSceneNode(code3)) {
      expect(code3.props?.title).toBe('404');
      expect(code3.props?.lines).toBe(
        'sceneNodeRegistry.register({\n  id: "custom",\n  ok: true\n});'
      );
    }
  });

  it('handles compact SVG arc flags, truncated paths, default SVG fill, defs stripping, and bitmap branch', () => {
    // 1. Compact SVG arc flags (0110 -> largeArc=0, sweep=1, xEnd=10)
    const arcStrokes = sketchPipeline.run({
      asset: {
        kind: 'svg',
        svgText:
          '<svg viewBox="0 0 40 40"><defs><path id="clip" d="M 0 0 L 40 40"/></defs><path data-d="M 0 0 L 5 5" d="M 10 10 a10,10 0 0110,10"/></svg>',
      },
      options: { seed: 'compact-arc' },
    });
    expect(arcStrokes).toHaveLength(1);
    expect(arcStrokes[0].points.length).toBeGreaterThanOrEqual(4);

    // 2. Truncated path never throws
    expect(() =>
      sketchPipeline.run({
        asset: { kind: 'svg', svgText: '<svg><path d="M 0 0 L 10"/></svg>' },
      })
    ).not.toThrow();

    // 3. Built-in rocket SVG obeys SVG default fill semantics when fillClosedShapes: true
    const rocketStrokes = sketchPipeline.run({
      asset: { kind: 'svg', svgText: getSketchIconSvg('rocket')! },
      options: { seed: 'fill-test', fillClosedShapes: true },
    });
    expect(rocketStrokes.some((s) => (s.fillOpacity ?? 0) > 0)).toBe(true);
    expect(rocketStrokes.some((s) => s.fillOpacity === undefined)).toBe(true);

    // 4. Synthetic bitmap (32x32 cross on light background) -> vector strokes
    const w = 32;
    const h = 32;
    const data = new Uint8Array(w * h).fill(250);
    for (let i = 5; i < 27; i++) {
      for (let t = -1; t <= 1; t++) {
        data[(16 + t) * w + i] = 10;
        data[i * w + (16 + t)] = 10;
      }
    }
    const bmpLines = bitmapToPolylinesWorkflow.run({ bitmap: { width: w, height: h, data } });
    expect(bmpLines.length).toBeGreaterThanOrEqual(1);

    // Invalid/empty bitmap returns safely without throwing
    expect(
      bitmapToPolylinesWorkflow.run({
        bitmap: { width: 0, height: 10, data: new Uint8Array(0) },
      })
    ).toEqual([]);
  });

  it('supports atomic overrides, wrapping composite overrides, cycle detection, and multi-input DAG bundling', () => {
    const base = createAtomicNode<number, number>('step', (x) => x + 1);
    const atomicReplacement = createAtomicNode<number, number>('step.v2', (x) => x + 100);
    const wrappingComposite = compileWorkflowGraph<number, number>({
      id: 'wrap',
      nodes: [
        { id: 'inner', node: base, from: [GRAPH_INPUT_ID] },
        {
          id: 'double',
          node: createAtomicNode<number, number>('dbl', (x) => x * 2),
          from: ['inner'],
        },
      ],
      output: 'double',
    });

    // Direct atomic override
    expect(base.run(5, { overrides: new Map([['step', atomicReplacement]]) })).toBe(105);
    // Wrapping composite override delegating back to original `base` must not recurse infinitely
    expect(base.run(5, { overrides: new Map([['step', wrappingComposite]]) })).toBe(12);

    // Cycle detection
    expect(() =>
      compileWorkflowGraph({
        id: 'cycle',
        nodes: [
          { id: 'a', node: base, from: ['b'] },
          { id: 'b', node: base, from: ['a'] },
        ],
        output: 'a',
      })
    ).toThrow(/cyclic/i);

    // Multi-input bundling
    const merge = createAtomicNode<{ left: number; right: number }, number>(
      'merge',
      ({ left, right }) => left + right
    );
    const diamond = compileWorkflowGraph<number, number>({
      id: 'diamond',
      nodes: [
        { id: 'left', node: createAtomicNode('l', (x: number) => x + 2), from: [GRAPH_INPUT_ID] },
        { id: 'right', node: createAtomicNode('r', (x: number) => x * 3), from: [GRAPH_INPUT_ID] },
        { id: 'merge', node: merge, from: ['left', 'right'] },
      ],
      output: 'merge',
    });
    expect(diamond.run(4)).toBe(18);
  });

  it('dynamically widens dense bar charts and defaults TAR exports to 12fps', async () => {
    const denseChartScript = [
      '# Dense Chart',
      '[node:chart] Dense {color: cyan, title: "Quarterly Pipeline Benchmarks", values: "12,24,36,48,60,72", labels: "StageAlpha,StageBeta,StageGamma,StageDelta,StageEpsil,StageZeta"}',
    ].join('\n');
    const base = cloneScene(PRESET_SCENES[0]);
    const parsed = parseScriptToScene(denseChartScript, {
      ...base,
      layoutMode: 'flow-horizontal',
      nodes: [],
    });
    const layout = computeDiagramLayout(parsed.scene);
    expect(layout.nodes[0].width).toBeGreaterThan(296);

    const tarOut = await exportScriptToVideo(denseChartScript, {
      exporterId: 'svg-sequence-tar',
    });
    const tarText = await tarOut.blob.text();
    expect(tarText).toContain('"fps": 12');
  });

  it('provides headless defineProps two-way read/write, clean contracts, --spec docs, and icon subscriptions', () => {
    const schema = defineProps({
      title: prop.string({ default: 'Hello', aliases: ['caption'] }),
      width: prop.number({ default: 200, min: 100, max: 400, aliases: ['w'] }),
      code: prop.string({ format: 'code' }),
    });

    // Alias read + clamp + fallback default
    const resolved = schema.resolve({ caption: 'World', w: 999 });
    expect(resolved).toEqual({ title: 'World', width: 400, code: undefined });

    // Symmetric immutable write normalizes alias onto canonical key and clamps
    const written = schema.writeField({ w: 120 }, 'width', 50);
    expect(written).toEqual({ width: 100 });
    expect(schema.readField(written, 'width')).toBe(100);

    // Reset restores field default cleanly
    const reset = schema.resetField(written, 'width');
    expect(reset).toEqual({ width: 200 });

    for (const plugin of sceneNodeRegistry.list()) {
      expect(plugin.defaultProps).toBeDefined();
      expect(plugin.propFields && plugin.propFields.length).toBeGreaterThan(0);
      expect(plugin.snippet).toBeTruthy();
      expect('inlineEditPropKey' in plugin).toBe(false);
    }
    for (const exp of exportRegistry.list()) {
      expect(['snapshot', 'sequence']).toContain(exp.category);
    }

    const spec = generateScriptSpec();
    expect(spec).toContain('`[node:chart]` props:');
    expect(spec).toContain('`highlight`: number [0..7]');

    let notifications = 0;
    const unsub = subscribeSketchIcons(() => {
      notifications++;
    });
    const before = listSketchIcons();
    registerSketchIcon('custom-badge', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>');
    const after = listSketchIcons();
    unsub();

    expect(notifications).toBe(1);
    expect(after).toContain('custom-badge');
    expect(after.length).toBeGreaterThan(before.length);
  });
});
