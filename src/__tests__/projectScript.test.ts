import { describe, expect, it } from 'vitest';
import introScriptRaw from '../../docs/examples/penova-intro.penova.md?raw';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import {
  generateScriptSpec,
  parseProjectScript,
  serializeProjectScript,
} from '../engine/parser/projectScript';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import { createCardNode } from '../model/builders';
import { LayoutPlugin, layoutRegistry } from '../plugins';
import { finalizeLayout, makePositionedNode } from '../plugins/layouts/shared';

describe('declarative multi-scene project script (.penova.md)', () => {
  it('parses docs/examples/penova-intro.penova.md cleanly with zero warnings, 6 scenes, and non-overlapping layouts in 16:9 and 9:16', () => {
    const result = parseProjectScript(introScriptRaw);

    expect(result.warnings).toEqual([]);
    expect(result.autoSubtitles).toBe(true);
    expect(result.project.title).toBe('Penova Product Intro (6 Scenes)');
    expect(result.project.aspectRatio).toBe('16:9');
    expect(result.project.scenes).toHaveLength(6);
    expect(result.project.subtitles?.length).toBeGreaterThan(10);

    expect(result.project.scenes.map((s) => s.theme)).toEqual([
      'chalkboard',
      'blueprint',
      'blueprint',
      'whiteboard',
      'letter-paper',
      'chalkboard',
    ]);
    expect(result.project.scenes.map((s) => s.layoutMode)).toEqual([
      'flow-horizontal',
      'concept-graph',
      'mindmap',
      'flow-vertical',
      'document',
      'concept-graph',
    ]);

    for (const ratio of ['16:9', '9:16'] as const) {
      for (const scene of result.project.scenes) {
        const layout = computeDiagramLayout({ ...scene, aspectRatio: ratio });
        const vertices = layout.nodes.filter(
          (n) => n.node.type !== 'connector'
        );
        expect(vertices.length).toBeGreaterThan(0);

        for (const v of vertices) {
          expect(Number.isFinite(v.cx)).toBe(true);
          expect(Number.isFinite(v.cy)).toBe(true);
        }

        for (let a = 0; a < vertices.length; a++) {
          for (let b = a + 1; b < vertices.length; b++) {
            const va = vertices[a];
            const vb = vertices[b];
            const sepX =
              Math.abs(va.cx - vb.cx) < (va.width + vb.width) / 2 - 1;
            const sepY =
              Math.abs(va.cy - vb.cy) < (va.height + vb.height) / 2 - 1;
            expect(sepX && sepY).toBe(false);
          }
        }
      }
    }
  });

  it('round-trips multi-scene projects including document --- dividers cleanly via serializeProjectScript and parseProjectScript', () => {
    const first = parseProjectScript(introScriptRaw);
    const serialized = serializeProjectScript(first.project);
    const second = parseProjectScript(serialized);

    expect(second.warnings).toEqual([]);
    expect(second.project.title).toBe(first.project.title);
    expect(second.project.aspectRatio).toBe(first.project.aspectRatio);
    expect(second.project.scenes).toHaveLength(6);

    for (let i = 0; i < first.project.scenes.length; i++) {
      const s1 = first.project.scenes[i];
      const s2 = second.project.scenes[i];
      expect(s2.title).toBe(s1.title);
      expect(s2.theme).toBe(s1.theme);
      expect(s2.layoutMode).toBe(s1.layoutMode);
      expect(s2.cameraMode).toBe(s1.cameraMode);
      expect(s2.handStyle).toBe(s1.handStyle);
      expect(s2.transitionOut?.type).toBe(s1.transitionOut?.type);
      expect(s2.nodes.length).toBe(s1.nodes.length);
    }

    // Specifically verify Scene 5 preserved its shape divider inside document body
    expect(
      second.project.scenes[4].nodes.some(
        (n) => n.type === 'shape' && n.shape === 'divider'
      )
    ).toBe(true);
  });

  it('dynamically exposes newly registered custom LayoutPlugin + textCodec in generateScriptSpec() and routes .penova.md to it', () => {
    const customPlugin: LayoutPlugin = {
      id: 'custom-milestone-list',
      name: 'Milestone List',
      category: 'diagram',
      icon: 'flow-lr',
      dragMode: 'offset',
      supportsEdges: false,
      textCodec: {
        id: 'milestone-dsl',
        label: 'Milestones',
        hintTitle: 'Milestone Items',
        hintLines: ['* Year | Title'],
        syntaxRules: ['One item per line: `* <Year> | <Event>`'],
        example: '* 2024 | Prototype\n* 2026 | Open Source Release',
        parse(text, base) {
          const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.startsWith('*'));
          const nodes = lines.map((line, idx) => {
            const [year, title] = line
              .slice(1)
              .split('|')
              .map((s) => s.trim());
            return createCardNode({
              id: `m-${idx}`,
              label: year || `M${idx + 1}`,
              subtitle: title || '',
              color: 'cyan',
              shape: 'rounded',
            });
          });
          return { scene: { ...base, nodes }, warnings: [] };
        },
        serialize(scene) {
          return scene.nodes.map((n) => `* ${n.name}`).join('\n');
        },
      },
      compute(scene, helpers) {
        let x = 0;
        const nodes = scene.nodes.map((n) => {
          const m = helpers.measureNode(n);
          const p = makePositionedNode(n, x, 0, m, helpers);
          x += m.width + 60;
          return p;
        });
        return finalizeLayout(nodes, []);
      },
    };

    layoutRegistry.register(customPlugin);
    try {
      const spec = generateScriptSpec();
      expect(spec).toContain('custom-milestone-list');
      expect(spec).toContain('milestone-dsl');
      expect(spec).toContain('One item per line: `* <Year> | <Event>`');
      expect(spec).toContain('2026 | Open Source Release');

      const doc = [
        '---',
        'title: Custom Roadmap',
        'aspectRatio: 16:9',
        'subtitles: auto',
        '---',
        '',
        '=== scene ===',
        'title: History',
        'theme: blueprint',
        'layout: custom-milestone-list',
        'camera: static-overview',
        '---',
        '* 2025 | Architecture',
        '* 2026 | Penova v1.0',
      ].join('\n');

      const parsed = parseProjectScript(doc);
      expect(parsed.warnings).toEqual([]);
      expect(parsed.project.scenes[0].layoutMode).toBe('custom-milestone-list');
      expect(parsed.project.scenes[0].nodes).toHaveLength(2);
      const compiled = compileProjectTimeline(parsed.project);
      expect(compiled.totalDurationMs).toBeGreaterThan(2000);
    } finally {
      layoutRegistry.unregister('custom-milestone-list');
    }
  });

  it('strips Markdown code fences and emits non-fatal warnings on unknown plugins', () => {
    const fenced = [
      '```markdown',
      '---',
      'title: Fence Test',
      'aspectRatio: 9:16',
      '---',
      '=== scene ===',
      'title: Scene One',
      'theme: nonexistent-theme',
      'layout: flow-horizontal',
      '---',
      '[root] Node A | Demo {color: yellow}',
      '[step] Node B | Output {color: cyan}',
      'Node A -> Node B : Go',
      '```',
    ].join('\n');

    const result = parseProjectScript(fenced);
    expect(result.project.aspectRatio).toBe('9:16');
    expect(result.project.scenes[0].theme).toBe('chalkboard');
    expect(result.project.scenes[0].nodes).toHaveLength(3);
    expect(result.warnings.some((w) => w.includes('nonexistent-theme'))).toBe(
      true
    );
  });
});
