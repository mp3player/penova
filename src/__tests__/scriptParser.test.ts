import { describe, expect, it } from 'vitest';
import {
  parseScriptToScene,
  serializeSceneToScript,
} from '../engine/parser/scriptParser';
import { getCardSummary } from '../model/builders';
import { PRESET_SCENES, cloneScene } from '../model/presets';
import { ConnectorSceneNode, GroupSceneNode } from '../model/scene';

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
});
