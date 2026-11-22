import { describe, expect, it } from 'vitest';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import { defaultMeasureText, measureSceneNode } from '../engine/layout/textMeasure';
import { PositionedSceneNode } from '../plugins/contracts';
import {
  createCardNode,
  createConnectorNode,
  createShapeNode,
  createTextNode,
} from '../model/builders';
import { PRESET_SCENES, cloneScene } from '../model/presets';
import { AspectRatio, LayoutMode } from '../model/scene';

function boxesOverlap(a: PositionedSceneNode, b: PositionedSceneNode): boolean {
  const ax1 = a.cx - a.width / 2;
  const ax2 = a.cx + a.width / 2;
  const ay1 = a.cy - a.height / 2;
  const ay2 = a.cy + a.height / 2;

  const bx1 = b.cx - b.width / 2;
  const bx2 = b.cx + b.width / 2;
  const by1 = b.cy - b.height / 2;
  const by2 = b.cy + b.height / 2;

  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

describe('diagramLayout', () => {
  const modes: LayoutMode[] = [
    'flow-horizontal',
    'flow-vertical',
    'mindmap',
    'concept-graph',
    'document',
    'freeform',
  ];
  const ratios: AspectRatio[] = ['16:9', '9:16'];

  it('produces finite coordinates, valid connectors, and zero overlapping vertices across all presets, modes, and ratios', () => {
    for (const preset of PRESET_SCENES) {
      for (const mode of modes) {
        for (const ratio of ratios) {
          const scene = {
            ...cloneScene(preset),
            layoutMode: mode,
            aspectRatio: ratio,
          };
          const layout = computeDiagramLayout(scene);

          expect(layout.nodes).toHaveLength(scene.nodes.length);
          expect(Number.isFinite(layout.bounds.x)).toBe(true);
          expect(Number.isFinite(layout.bounds.y)).toBe(true);
          expect(layout.bounds.width).toBeGreaterThan(0);
          expect(layout.bounds.height).toBeGreaterThan(0);

          const vertices = layout.nodes.filter(
            (n) => n.node.type !== 'connector'
          );
          const connectors = layout.nodes.filter(
            (n) => n.node.type === 'connector'
          );

          for (const n of vertices) {
            expect(Number.isFinite(n.cx)).toBe(true);
            expect(Number.isFinite(n.cy)).toBe(true);
            expect(n.width).toBeGreaterThan(0);
            expect(n.height).toBeGreaterThan(0);
            if (n.node.type === 'group') {
              expect(n.children?.length).toBeGreaterThan(0);
            }
          }

          for (const c of connectors) {
            expect(c.routedPoints?.length).toBeGreaterThanOrEqual(2);
            for (const pt of c.routedPoints ?? []) {
              expect(Number.isFinite(pt.x)).toBe(true);
              expect(Number.isFinite(pt.y)).toBe(true);
            }
          }

          for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
              const a = vertices[i];
              const b = vertices[j];
              expect(
                boxesOverlap(a, b),
                `Overlap between "${a.node.name}" and "${b.node.name}" in ${preset.id}/${mode}/${ratio}`
              ).toBe(false);
            }
          }
        }
      }
    }
  });

  it('applies group offsets to nested children and re-routes connected arrows', () => {
    const baseScene = cloneScene(PRESET_SCENES[0]);
    const layoutBefore = computeDiagramLayout(baseScene);
    const firstBefore = layoutBefore.nodes.find(
      (n) => n.node.id === 'http-1'
    )!;
    const childBefore = firstBefore.children![0];

    const nudgedScene = cloneScene(PRESET_SCENES[0]);
    nudgedScene.nodes[0].offset = { x: 80, y: -45 };
    const layoutAfter = computeDiagramLayout(nudgedScene);
    const firstAfter = layoutAfter.nodes.find((n) => n.node.id === 'http-1')!;
    const childAfter = firstAfter.children![0];

    expect(firstAfter.cx).toBeCloseTo(firstBefore.cx + 80, 3);
    expect(firstAfter.cy).toBeCloseTo(firstBefore.cy - 45, 3);
    expect(childAfter.cx).toBeCloseTo(childBefore.cx + 80, 3);
    expect(childAfter.cy).toBeCloseTo(childBefore.cy - 45, 3);

    const connBefore = layoutBefore.nodes.find((n) => n.id === 'e-http-1')!;
    const connAfter = layoutAfter.nodes.find((n) => n.id === 'e-http-1')!;
    expect(connAfter.routedPoints![0].x).not.toBeCloseTo(
      connBefore.routedPoints![0].x,
      1
    );
  });

  it('positions standalone atomic text, fixed shape, and unbound connector nodes cleanly', () => {
    const scene = {
      ...cloneScene(PRESET_SCENES[0]),
      nodes: [
        createTextNode({
          id: 't-1',
          text: '独立纯文字节点',
          color: 'yellow',
          fontSize: 22,
          maxWidth: 260,
        }),
        createShapeNode({
          id: 's-1',
          shape: 'circle',
          color: 'cyan',
          width: 180,
          height: 110,
        }),
        createConnectorNode({
          id: 'c-free',
          fromPoint: { x: -120, y: 120 },
          toPoint: { x: 140, y: 120 },
          label: '自由箭头',
          color: 'pink',
        }),
      ],
    };

    for (const mode of modes) {
      const layout = computeDiagramLayout({ ...scene, layoutMode: mode });
      expect(layout.nodes).toHaveLength(3);
      const tPos = layout.nodeMap.get('t-1')!;
      const sPos = layout.nodeMap.get('s-1')!;
      const cPos = layout.nodeMap.get('c-free')!;

      expect(boxesOverlap(tPos, sPos)).toBe(false);
      expect(sPos.width).toBe(180);
      expect(sPos.height).toBe(110);
      expect(cPos.routedPoints!.length).toBeGreaterThanOrEqual(2);
      expect(cPos.labelPoint).toBeDefined();
    }
  });

  it('fans apart parallel multi-edges between the same node pair in dagre flows', () => {
    const scene = {
      ...cloneScene(PRESET_SCENES[0]),
      layoutMode: 'flow-horizontal' as const,
      nodes: [
        createCardNode({ id: 'a', label: '节点 A', color: 'yellow' }),
        createCardNode({ id: 'b', label: '节点 B', color: 'cyan' }),
        createConnectorNode({
          id: 'conn-1',
          fromId: 'a',
          toId: 'b',
          label: '正向前进',
          color: 'yellow',
        }),
        createConnectorNode({
          id: 'conn-2',
          fromId: 'b',
          toId: 'a',
          label: '反向回退',
          color: 'pink',
        }),
      ],
    };

    const layout = computeDiagramLayout(scene);
    const c1 = layout.nodeMap.get('conn-1')!;
    const c2 = layout.nodeMap.get('conn-2')!;
    const mid1 = c1.routedPoints![Math.floor(c1.routedPoints!.length / 2)];
    const mid2 = c2.routedPoints![Math.floor(c2.routedPoints!.length / 2)];

    expect(Math.hypot(mid1.x - mid2.x, mid1.y - mid2.y)).toBeGreaterThan(20);
  });

  it('wraps indented first lines strictly within maxWidth', () => {
    const maxWidth = 220;
    const node = createTextNode({
      id: 'indented',
      text: '这是一段带有首行缩进测试的长句子，用来确认首行折行不会超出右边界。',
      fontSize: 20,
      maxWidth,
      align: 'left',
      indentChars: 2,
    });

    const measured = measureSceneNode(node);
    expect(measured.type).toBe('text');
    if (measured.type === 'text') {
      expect(measured.lines.length).toBeGreaterThan(1);
      const line0Width = defaultMeasureText(measured.lines[0], measured.font);
      expect(line0Width + measured.indentPx).toBeLessThanOrEqual(maxWidth + 1);
      expect(measured.width).toBe(maxWidth);
    }
  });
});
