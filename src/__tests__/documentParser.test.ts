import { describe, expect, it } from 'vitest';
import { documentScriptCodec } from '../engine/parser/documentParser';
import { PRESET_SCENES, cloneScene } from '../model/presets';
import { ShapeSceneNode, TextSceneNode } from '../model/scene';

describe('documentScriptCodec', () => {
  it('round-trips the handwritten-letter preset without losing alignment, indentation, or divider shape', () => {
    const letterPreset = PRESET_SCENES.find((p) => p.id === 'handwritten-letter')!;
    expect(letterPreset).toBeDefined();

    const text = documentScriptCodec.serialize(letterPreset);
    expect(text).toContain('# 手写一封信');
    expect(text).toContain('## 见字如面：');
    expect(text).toContain('>> 展信佳');
    expect(text).toContain('---');
    expect(text).toContain('> 此致 敬礼');

    const { scene, warnings } = documentScriptCodec.parse(text, cloneScene(letterPreset));
    expect(warnings).toEqual([]);
    expect(scene.title).toBe('手写一封信');
    expect(scene.nodes).toHaveLength(5);

    const n0 = scene.nodes[0] as TextSceneNode;
    const n1 = scene.nodes[1] as TextSceneNode;
    const n2 = scene.nodes[2] as TextSceneNode;
    const n3 = scene.nodes[3] as ShapeSceneNode;
    const n4 = scene.nodes[4] as TextSceneNode;

    expect(n0.fontWeight).toBe(700);
    expect(n0.align).toBe('left');
    expect(n1.indentChars).toBe(2);
    expect(n2.indentChars).toBe(2);
    expect(n2.color).toBe('cyan');
    expect(n3.type).toBe('shape');
    expect(n3.shape).toBe('divider');
    expect(n4.align).toBe('right');
    expect(n4.text).toBe('此致 敬礼\nPenova 工作室\n深秋 · 灯下');
  });

  it('cold-parses markdown letter blocks onto an empty base scene', () => {
    const base = {
      ...cloneScene(PRESET_SCENES[0]),
      layoutMode: 'document' as const,
      nodes: [],
    };
    const input = [
      '# 致未来的自己',
      '',
      '## 你好：',
      '',
      '>> 这是第一段正文内容，保留首行缩进两字符。',
      '',
      '---',
      '',
      '> 二〇二六年秋',
      '> 灯下',
    ].join('\n');

    const { scene, warnings } = documentScriptCodec.parse(input, base);
    expect(warnings).toEqual([]);
    expect(scene.title).toBe('致未来的自己');
    expect(scene.nodes).toHaveLength(4);
    expect((scene.nodes[0] as TextSceneNode).fontWeight).toBe(700);
    expect((scene.nodes[1] as TextSceneNode).indentChars).toBe(2);
    expect((scene.nodes[2] as ShapeSceneNode).shape).toBe('divider');
    expect((scene.nodes[3] as TextSceneNode).align).toBe('right');
    expect((scene.nodes[3] as TextSceneNode).text).toBe('二〇二六年秋\n灯下');
  });
});
