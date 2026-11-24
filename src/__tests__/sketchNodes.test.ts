import { describe, expect, it } from 'vitest';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import { renderProjectFrameSvg } from '../engine/render/frameSnapshot';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import { createCardNode, getCardSummary } from '../model/builders';
import { cloneScene, PRESET_SCENES } from '../model/presets';
import { createProjectFromScene } from '../model/project';
import { parseScriptToScene, serializeSceneToScript } from '../plugins/codecs/scriptParser';
import { sceneNodeRegistry } from '../plugins/registry';
import {
  getSketchIconSvg,
  listSketchIcons,
  sketchPipeline,
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
  });
});
