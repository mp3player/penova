import { describe, expect, it } from 'vitest';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import {
  parseScriptToScene,
  serializeSceneToScript,
} from '../engine/parser/scriptParser';
import { parseProjectScript } from '../engine/parser/projectScript';
import { compileProjectTimeline } from '../engine/timeline/projectTimeline';
import { generateAutoSubtitles } from '../engine/subtitle/subtitleEngine';
import {
  getCardSummary,
  createCardNode,
  createConnectorNode,
  createCustomNode,
  createShapeNode,
  createTextNode,
  updateCardGroupNode,
} from '../model/builders';
import { PRESET_SCENES, cloneScene } from '../model/presets';
import {
  ConnectorSceneNode,
  deriveTeachingSteps,
  GroupSceneNode,
  isCustomSceneNode,
  LessonScene,
  removeNodeInTree,
} from '../model/scene';

describe('scriptParser', () => {
  it('parses Chinese title, card groups with metadata, and solid/dashed connectors', () => {
    const base = cloneScene(PRESET_SCENES[0]);
    const script = `
# 编译原理简明图解

[root] 源代码 | 高级语言字符流 {color: yellow, shape: rounded, group: 前端}
[step] 词法分析 | 切分 Token 序列 {color: cyan, group: 前端}
[highlight] 语法树 AST | 检查结构合法性 {color: orange, shape: circle, group: 前端}

源代码 -> 词法分析 : 扫描
词法分析 -> 语法树 AST : 归约
语法树 AST -.-> 目标代码 : 直接跳过优化
`;

    const { scene, warnings } = parseScriptToScene(script, base);

    expect(warnings).toEqual([]);
    expect(scene.title).toBe('编译原理简明图解');

    const cardNodes = scene.nodes.filter(
      (n): n is GroupSceneNode => n.type === 'group'
    );
    const connectors = scene.nodes.filter(
      (n): n is ConnectorSceneNode => n.type === 'connector'
    );

    expect(cardNodes).toHaveLength(4);
    expect(getCardSummary(cardNodes[0])).toMatchObject({
      label: '源代码',
      subtitle: '高级语言字符流',
      role: 'root',
      color: 'yellow',
      shape: 'rounded',
      zone: '前端',
    });
    expect(getCardSummary(cardNodes[2])).toMatchObject({
      label: '语法树 AST',
      role: 'highlight',
      color: 'orange',
      shape: 'circle',
    });
    expect(getCardSummary(cardNodes[3])).toMatchObject({
      label: '目标代码',
      role: 'concept',
    });

    expect(connectors).toHaveLength(3);
    expect(connectors[0].label).toBe('扫描');
    expect(connectors[0].style).toBe('solid');
    expect(connectors[2].style).toBe('dashed');
    expect(connectors[2].label).toBe('直接跳过优化');
  });

  it('preserves existing node IDs and drag offsets when re-parsing matching labels', () => {
    const base = cloneScene(PRESET_SCENES[0]);
    const targetNode = base.nodes[1];
    targetNode.offset = { x: 42, y: -18 };
    const targetLabel = getCardSummary(targetNode).label;

    const script = serializeSceneToScript(base);
    const { scene, warnings } = parseScriptToScene(script, base);

    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(base.nodes.length);

    const matched = scene.nodes.find(
      (n) => n.type !== 'connector' && getCardSummary(n).label === targetLabel
    );
    expect(matched?.id).toBe(targetNode.id);
    expect(matched?.offset).toEqual({ x: 42, y: -18 });
  });

  it('round-trips all graph-script preset scenes cleanly', () => {
    const graphPresets = PRESET_SCENES.filter((p) => p.layoutMode !== 'document');
    for (const preset of graphPresets) {
      const script = serializeSceneToScript(preset);
      const { scene, warnings } = parseScriptToScene(script, preset);
      expect(warnings).toEqual([]);
      expect(scene.title).toBe(preset.title);

      const expectedLabels = preset.nodes
        .filter((n) => n.type !== 'connector')
        .map((n) => getCardSummary(n).label);
      const actualLabels = scene.nodes
        .filter((n) => n.type !== 'connector')
        .map((n) => getCardSummary(n).label);
      expect(actualLabels).toEqual(expectedLabels);

      const expectedConns = preset.nodes.filter((n) => n.type === 'connector');
      const actualConns = scene.nodes.filter((n) => n.type === 'connector');
      expect(actualConns).toHaveLength(expectedConns.length);
    }
  });

  it('losslessly round-trips frameless cards (shape: none), standalone text/shape/custom nodes, offsets, and free-coordinate arrows', () => {
    const base: LessonScene = {
      ...cloneScene(PRESET_SCENES[0]),
      layoutMode: 'freeform',
      nodes: [
        createCardNode({
          id: 'card-noframe',
          label: 'No Frame Title',
          subtitle: 'Pure typography card',
          role: 'root',
          color: 'yellow',
          shape: 'none',
          offset: { x: -120, y: -60 },
        }),
        createTextNode({
          id: 'txt-1',
          text: 'Standalone Note',
          color: 'cyan',
          fontSize: 24,
          align: 'left',
          offset: { x: 80, y: 40 },
        }),
        createShapeNode({
          id: 'shp-1',
          shape: 'divider',
          name: 'Separator',
          color: 'orange',
          width: 320,
          height: 20,
          offset: { x: 0, y: 95 },
        }),
        createCustomNode({
          id: 'cust-1',
          kind: 'key-value',
          name: 'Status',
          color: 'green',
          props: { key: 'FPS', value: 60, active: true },
          offset: { x: 140, y: -50 },
        }),
        createConnectorNode({
          id: 'conn-bound',
          fromId: 'card-noframe',
          toId: 'txt-1',
          label: 'Links',
          color: 'yellow',
        }),
        createConnectorNode({
          id: 'conn-free',
          fromPoint: { x: -100, y: 120 },
          toPoint: { x: 100, y: 120 },
          label: 'Axis',
          style: 'dashed',
          color: 'white',
        }),
      ],
    };

    const script = serializeSceneToScript(base);
    expect(script).toContain('shape: none');
    expect(script).toContain('[text] Standalone Note');
    expect(script).toContain('[shape:divider] Separator');
    expect(script).toContain('[node:key-value] Status');
    expect(script).toContain('(-100, 120) -.-> (100, 120) : Axis');

    // Cold parse onto an empty scene
    const { scene, warnings } = parseScriptToScene(script, {
      ...base,
      nodes: [],
    });
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(6);

    const noFrame = scene.nodes[0] as GroupSceneNode;
    expect(getCardSummary(noFrame).shape).toBe('none');
    expect(noFrame.children.some((c) => c.type === 'shape')).toBe(false);
    expect(noFrame.offset).toEqual({ x: -120, y: -60 });

    const standaloneText = scene.nodes[1];
    expect(standaloneText.type).toBe('text');
    if (standaloneText.type === 'text') {
      expect(standaloneText.color).toBe('cyan');
      expect(standaloneText.fontSize).toBe(24);
      expect(standaloneText.align).toBe('left');
      expect(standaloneText.offset).toEqual({ x: 80, y: 40 });
    }

    const standaloneShape = scene.nodes[2];
    expect(standaloneShape.type).toBe('shape');
    if (standaloneShape.type === 'shape') {
      expect(standaloneShape.shape).toBe('divider');
      expect(standaloneShape.width).toBe(320);
      expect(standaloneShape.height).toBe(20);
    }

    const custom = scene.nodes[3];
    expect(isCustomSceneNode(custom)).toBe(true);
    if (isCustomSceneNode(custom)) {
      expect(custom.kind).toBe('key-value');
      expect(custom.props).toEqual({ key: 'FPS', value: 60, active: true });
      expect(custom.offset).toEqual({ x: 140, y: -50 });
    }

    const freeConn = scene.nodes[5] as ConnectorSceneNode;
    expect(freeConn.fromPoint).toEqual({ x: -100, y: 120 });
    expect(freeConn.toPoint).toEqual({ x: 100, y: 120 });
    expect(freeConn.style).toBe('dashed');
    expect(freeConn.label).toBe('Axis');
  });

  it('losslessly round-trips nested [group] hierarchies, full atomic attributes, multi-line text, and colored connectors', () => {
    const complexGroup: GroupSceneNode = {
      id: 'grp-stack',
      type: 'group',
      name: 'Composite Stack',
      color: 'cyan',
      arrange: 'stack',
      gap: 18,
      meta: { role: 'step', zone: 'Main Zone' },
      children: [
        createTextNode({
          id: 'c-t1',
          text: 'Line One\nLine Two',
          color: 'yellow',
          fontSize: 22,
          fontWeight: 700,
          align: 'left',
          maxWidth: 360,
          indentChars: 2,
        }),
        createShapeNode({
          id: 'c-s1',
          shape: 'rounded',
          name: 'Dashed Frame',
          color: 'pink',
          fitMode: 'fixed',
          width: 240,
          height: 60,
          emphasized: true,
          dashed: true,
        }),
        {
          id: 'grp-inner',
          type: 'group',
          name: 'Inner Group',
          color: 'green',
          arrange: 'free',
          gap: 10,
          children: [
            createTextNode({
              id: 'inner-t',
              text: 'Nested Note',
              color: 'green',
              offset: { x: 12, y: -8 },
            }),
          ],
        },
      ],
    };

    const base: LessonScene = {
      ...cloneScene(PRESET_SCENES[0]),
      layoutMode: 'freeform',
      nodes: [
        complexGroup,
        createTextNode({
          id: 'target-txt',
          text: 'Target',
          color: 'white',
        }),
        createConnectorNode({
          id: 'conn-colored',
          fromId: 'grp-stack',
          toId: 'target-txt',
          label: 'Custom Color',
          color: 'pink',
        }),
        createConnectorNode({
          id: 'conn-free-colored',
          fromPoint: { x: -50, y: 20 },
          toPoint: { x: 50, y: 20 },
          color: 'cyan',
        }),
      ],
    };

    const script = serializeSceneToScript(base);
    expect(script).toContain('[group] Composite Stack');
    expect(script).toContain('arrange: stack');
    expect(script).toContain('Line One\\nLine Two');
    expect(script).toContain('  [group] Inner Group');
    expect(script).toContain('{color: pink}');
    expect(script).toContain('{color: cyan}');

    const { scene, warnings } = parseScriptToScene(script, {
      ...base,
      nodes: [],
    });
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(4);

    const parsedGroup = scene.nodes[0] as GroupSceneNode;
    expect(parsedGroup.type).toBe('group');
    expect(parsedGroup.arrange).toBe('stack');
    expect(parsedGroup.gap).toBe(18);
    expect(parsedGroup.meta).toEqual({ role: 'step', zone: 'Main Zone' });
    expect(parsedGroup.children).toHaveLength(3);

    const parsedChildText = parsedGroup.children[0];
    expect(parsedChildText.type).toBe('text');
    if (parsedChildText.type === 'text') {
      expect(parsedChildText.text).toBe('Line One\nLine Two');
      expect(parsedChildText.fontWeight).toBe(700);
      expect(parsedChildText.align).toBe('left');
      expect(parsedChildText.maxWidth).toBe(360);
      expect(parsedChildText.indentChars).toBe(2);
    }

    const parsedChildShape = parsedGroup.children[1];
    expect(parsedChildShape.type).toBe('shape');
    if (parsedChildShape.type === 'shape') {
      expect(parsedChildShape.fitMode).toBe('fixed');
      expect(parsedChildShape.emphasized).toBe(true);
      expect(parsedChildShape.dashed).toBe(true);
      expect(parsedChildShape.width).toBe(240);
      expect(parsedChildShape.height).toBe(60);
    }

    const parsedInnerGroup = parsedGroup.children[2] as GroupSceneNode;
    expect(parsedInnerGroup.type).toBe('group');
    expect(parsedInnerGroup.arrange).toBe('free');
    expect(parsedInnerGroup.children).toHaveLength(1);

    const parsedBoundConn = scene.nodes[2] as ConnectorSceneNode;
    expect(parsedBoundConn.color).toBe('pink');
    expect(parsedBoundConn.label).toBe('Custom Color');

    const parsedFreeConn = scene.nodes[3] as ConnectorSceneNode;
    expect(parsedFreeConn.color).toBe('cyan');
  });

  it('disambiguates duplicate-label nodes via #<id> and preserves {say, pause} narration & step pauses', () => {
    const script = [
      '# Validation Pipeline',
      '[step#check-1] Validate | Schema {color: cyan, say: "First, validate request schema.", pause: 950}',
      '[step#check-2] Validate | Auth {color: green, say: "Next, verify user permissions.", pause: 1200}',
      '#check-1 -> #check-2 : Then',
    ].join('\n');

    const base = { ...cloneScene(PRESET_SCENES[0]), nodes: [] };
    const { scene, warnings } = parseScriptToScene(script, base);
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(3);
    expect(scene.nodes[0].id).toBe('check-1');
    expect(scene.nodes[1].id).toBe('check-2');

    const conn = scene.nodes[2] as ConnectorSceneNode;
    expect(conn.fromId).toBe('check-1');
    expect(conn.toId).toBe('check-2');

    const steps = deriveTeachingSteps(scene);
    expect(steps[0].pauseMs).toBe(950);
    expect(steps[1].pauseMs).toBe(1200);

    // Serialize should automatically emit #check-1 / #check-2 disambiguation because both share "Validate"
    const serialized = serializeSceneToScript(scene);
    expect(serialized).toContain('[step#check-1] Validate');
    expect(serialized).toContain('[step#check-2] Validate');
    expect(serialized).toContain('#check-1 -> #check-2 : Then');
    expect(serialized).toContain('pause: 950');

    const reParsed = parseScriptToScene(serialized, { ...base, nodes: [] });
    expect(reParsed.warnings).toEqual([]);
    expect(reParsed.scene.nodes).toHaveLength(3);
    expect(reParsed.scene.nodes[0].id).toBe('check-1');
    expect(reParsed.scene.nodes[1].id).toBe('check-2');

    // Verify project-level auto subtitles pick up `say`
    const projResult = parseProjectScript(
      [
        '---',
        'title: Narration Test',
        'subtitles: auto',
        '---',
        '=== scene ===',
        'layout: flow-horizontal',
        '---',
        script,
      ].join('\n')
    );
    const compiled = compileProjectTimeline(projResult.project);
    const subs = generateAutoSubtitles(compiled);
    expect(subs[0].text).toBe('First, validate request schema.');
    expect(subs[1].text).toBe('Next, verify user permissions.');
  });

  it('preserves CustomSceneNode props colliding with built-in meta keys and escapes special characters', () => {
    const script = [
      '# Custom Prop Escaping',
      '[node:chart] Revenue {color: cyan, width: 480, height: 260, size: 18, role: "primary", shape: "bar", label: "A, B: C"}',
    ].join('\n');

    const base = { ...cloneScene(PRESET_SCENES[0]), nodes: [] };
    const { scene, warnings } = parseScriptToScene(script, base);
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(1);

    const cust = scene.nodes[0];
    expect(isCustomSceneNode(cust)).toBe(true);
    if (isCustomSceneNode(cust)) {
      expect(cust.color).toBe('cyan');
      expect(cust.props).toEqual({
        width: 480,
        height: 260,
        size: 18,
        role: 'primary',
        shape: 'bar',
        label: 'A, B: C',
      });
    }

    const serialized = serializeSceneToScript(scene);
    expect(serialized).toContain('label: "A, B: C"');
    const reparsed = parseScriptToScene(serialized, base);
    expect(reparsed.warnings).toEqual([]);
    const reparsedCust = reparsed.scene.nodes[0];
    if (isCustomSceneNode(reparsedCust)) {
      expect(reparsedCust.props).toEqual({
        width: 480,
        height: 260,
        size: 18,
        role: 'primary',
        shape: 'bar',
        label: 'A, B: C',
      });
    }
  });

  it('keeps card group structure synchronized on updateCardGroupNode and cleans up descendant connectors on removeNodeInTree', () => {
    const card = createCardNode({
      id: 'card-1',
      label: 'Initial Title',
      subtitle: 'Initial Sub',
      role: 'concept',
      color: 'white',
      shape: 'rounded',
    });

    const updated = updateCardGroupNode(card, {
      label: 'Updated Title',
      subtitle: 'Updated Sub',
      color: 'yellow',
      shape: 'none',
    });
    expect(updated.name).toBe('Updated Title');
    expect(updated.color).toBe('yellow');
    expect(updated.children.some((c) => c.type === 'shape')).toBe(false);
    expect(getCardSummary(updated)).toMatchObject({
      label: 'Updated Title',
      subtitle: 'Updated Sub',
      color: 'yellow',
      shape: 'none',
    });

    const cardScene: LessonScene = {
      ...cloneScene(PRESET_SCENES[0]),
      nodes: [updated],
    };
    const serializedCard = serializeSceneToScript(cardScene);
    expect(serializedCard).toContain(
      '[concept] Updated Title | Updated Sub {color: yellow, shape: none}'
    );

    const groupWithChild: GroupSceneNode = {
      id: 'grp-parent',
      type: 'group',
      name: 'Parent Stack',
      color: 'cyan',
      arrange: 'stack',
      children: [
        createTextNode({
          id: 'child-leaf',
          text: 'Inner Leaf',
          color: 'cyan',
        }),
      ],
    };
    const outsideNode = createTextNode({
      id: 'outside-node',
      text: 'Outside',
      color: 'white',
    });
    const childConn = createConnectorNode({
      id: 'conn-child',
      fromId: 'child-leaf',
      toId: 'outside-node',
      label: 'Links Child',
    });

    const nestedScene: LessonScene = {
      ...cardScene,
      nodes: [groupWithChild, outsideNode, childConn],
    };
    const nestedScript = serializeSceneToScript(nestedScene);
    expect(nestedScript).toContain('[text#child-leaf] Inner Leaf');
    expect(nestedScript).toContain('#child-leaf -> Outside : Links Child');

    const reparsedNested = parseScriptToScene(nestedScript, {
      ...nestedScene,
      nodes: [],
    });
    expect(reparsedNested.warnings).toEqual([]);
    const parsedConn = reparsedNested.scene.nodes.find(
      (n): n is ConnectorSceneNode => n.type === 'connector'
    );
    expect(parsedConn?.fromId).toBe('child-leaf');

    const afterRemove = removeNodeInTree(nestedScene.nodes, 'grp-parent');
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0].id).toBe('outside-node');

    // Layout and teaching step derivation must recognize connectors targeting nested group children
    const layout = computeDiagramLayout(reparsedNested.scene);
    const routedConn = layout.nodes.find((n) => n.node.type === 'connector');
    const nestedChildPos = layout.nodeMap.get('child-leaf');
    const outsidePos = layout.nodeMap.get(parsedConn!.toId!);
    expect(routedConn?.routedPoints?.length).toBeGreaterThan(2);
    expect(nestedChildPos).toBeDefined();
    expect(outsidePos).toBeDefined();
    // Endpoint should anchor near outsidePos instead of fallback (-90, 0) -> (90, 0)
    const lastPt =
      routedConn!.routedPoints![routedConn!.routedPoints!.length - 1];
    expect(Math.hypot(lastPt.x - outsidePos!.cx, lastPt.y - outsidePos!.cy)).toBeLessThan(
      outsidePos!.width
    );

    const steps = deriveTeachingSteps(reparsedNested.scene);
    expect(steps.some((s) => s.nodeIds.includes(parsedConn!.id))).toBe(true);
  });

  it('round-trips card titles containing pipes, labels containing colons, and zone names containing commas', () => {
    const cardWithPipe = createCardNode({
      id: 'pipe-card',
      label: 'A | B',
      subtitle: 'Sub Note',
      role: 'concept',
      color: 'cyan',
      zone: 'Layer 1, Core',
    });
    const colonTarget = createCardNode({
      id: 'colon-target',
      label: 'Step 1: Init',
      role: 'step',
      color: 'yellow',
    });
    const conn = createConnectorNode({
      id: 'e-colon',
      fromId: 'pipe-card',
      toId: 'colon-target',
      color: 'cyan',
    });

    const scene: LessonScene = {
      ...cloneScene(PRESET_SCENES[0]),
      nodes: [cardWithPipe, colonTarget, conn],
    };
    const serialized = serializeSceneToScript(scene);
    const reparsed = parseScriptToScene(serialized, { ...scene, nodes: [] });
    expect(reparsed.warnings).toEqual([]);
    expect(reparsed.scene.nodes).toHaveLength(3);
    expect(getCardSummary(reparsed.scene.nodes[0]).label).toBe('A | B');
    expect(getCardSummary(reparsed.scene.nodes[0]).subtitle).toBe('Sub Note');
    expect(getCardSummary(reparsed.scene.nodes[0]).zone).toBe('Layer 1, Core');
    expect(getCardSummary(reparsed.scene.nodes[1]).label).toBe('Step 1: Init');
    const reparsedConn = reparsed.scene.nodes[2] as ConnectorSceneNode;
    expect(reparsedConn.toId).toBe(reparsed.scene.nodes[1].id);
    expect(reparsedConn.label).toBeUndefined();
  });
});
