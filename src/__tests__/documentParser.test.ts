import { describe, expect, it } from 'vitest';
import { documentScriptCodec } from '../engine/parser/documentParser';
import { documentLayoutPlugin } from '../plugins/layouts/documentLayoutPlugin';
import {
  createConnectorNode,
  createCustomNode,
  createShapeNode,
  createTextNode,
} from '../model/builders';
import { PRESET_SCENES, cloneScene } from '../model/presets';
import {
  ConnectorSceneNode,
  isCustomSceneNode,
  ShapeSceneNode,
  TextSceneNode,
} from '../model/scene';

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

  it('preserves non-default paragraph, divider, and sign-off colors during cold serialize -> parse round-trip', () => {
    const letterPreset = PRESET_SCENES.find((p) => p.id === 'handwritten-letter')!;
    const serialized = documentScriptCodec.serialize(letterPreset);
    expect(serialized).toContain('{color: cyan}');

    const emptyBase = {
      ...cloneScene(letterPreset),
      nodes: [],
    };
    const { scene, warnings } = documentScriptCodec.parse(serialized, emptyBase);
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(5);
    expect((scene.nodes[1] as TextSceneNode).color).toBe('white');
    expect((scene.nodes[2] as TextSceneNode).color).toBe('cyan');
    expect((scene.nodes[3] as ShapeSceneNode).color).toBe('orange');
    expect((scene.nodes[4] as TextSceneNode).color).toBe('orange');

    const customStyledDoc = [
      '# Styled Doc',
      '',
      '## Centered Title {color: yellow, align: center, size: 28}',
      '',
      'Plain centered note {color: green, align: center}',
      '',
      '--- {color: cyan}',
      '',
      '> Footer {color: pink}',
    ].join('\n');

    const customParsed = documentScriptCodec.parse(customStyledDoc, emptyBase);
    expect(customParsed.warnings).toEqual([]);
    expect(customParsed.scene.nodes).toHaveLength(4);
    expect((customParsed.scene.nodes[0] as TextSceneNode).color).toBe('yellow');
    expect((customParsed.scene.nodes[0] as TextSceneNode).align).toBe('center');
    expect((customParsed.scene.nodes[0] as TextSceneNode).fontSize).toBe(28);
    expect((customParsed.scene.nodes[1] as TextSceneNode).color).toBe('green');
    expect((customParsed.scene.nodes[1] as TextSceneNode).align).toBe('center');
    expect((customParsed.scene.nodes[2] as ShapeSceneNode).color).toBe('cyan');
    expect((customParsed.scene.nodes[3] as TextSceneNode).color).toBe('pink');
  });

  it('round-trips {say, pause} narration metadata in documentScriptCodec and wires pauseMs into deriveSteps', () => {
    const base = {
      ...cloneScene(PRESET_SCENES[0]),
      layoutMode: 'document' as const,
      nodes: [],
    };
    const input = [
      '# Letter Narration',
      '',
      '## Dear Friend, {say: "Opening greeting, warm tone.", pause: 1100}',
      '',
      '>> First paragraph here. {color: cyan, say: "Main message body", pause: 850}',
    ].join('\n');

    const { scene, warnings } = documentScriptCodec.parse(input, base);
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(2);
    expect(scene.nodes[0].meta?.say).toBe('Opening greeting, warm tone.');
    expect(scene.nodes[0].meta?.pause).toBe(1100);
    expect(scene.nodes[1].meta?.say).toBe('Main message body');
    expect(scene.nodes[1].meta?.pause).toBe(850);

    const steps = documentLayoutPlugin.deriveSteps!(scene);
    expect(steps[0].pauseMs).toBe(1100);
    expect(steps[1].pauseMs).toBe(850);

    const serialized = documentScriptCodec.serialize(scene);
    expect(serialized).toContain('say: "Opening greeting, warm tone."');
    expect(serialized).toContain('pause: 1100');

    const reparsed = documentScriptCodec.parse(serialized, base);
    expect(reparsed.warnings).toEqual([]);
    expect(reparsed.scene.nodes[0].meta?.say).toBe('Opening greeting, warm tone.');
    expect(reparsed.scene.nodes[0].meta?.pause).toBe(1100);
  });

  it('losslessly preserves custom nodes, non-divider shapes, and connectors in documentScriptCodec', () => {
    const base = {
      ...cloneScene(PRESET_SCENES[0]),
      layoutMode: 'document' as const,
      nodes: [
        createTextNode({
          id: 'doc-h',
          text: 'Physics Notes',
          fontWeight: 700,
          align: 'left',
          color: 'white',
        }),
        createCustomNode({
          id: 'doc-formula',
          kind: 'formula',
          name: 'Euler',
          color: 'yellow',
          props: { expr: 'e^(i*pi) + 1 = 0' },
        }),
        createShapeNode({
          id: 'doc-box',
          shape: 'rounded',
          name: 'Summary Box',
          color: 'cyan',
          width: 180,
          height: 70,
        }),
        createConnectorNode({
          id: 'doc-conn',
          fromId: 'doc-formula',
          toId: 'doc-box',
          label: 'relates',
          color: 'cyan',
        }),
      ],
    };

    const serialized = documentScriptCodec.serialize(base);
    expect(serialized).toContain('## Physics Notes');
    expect(serialized).toContain('[node:formula] Euler');
    expect(serialized).toContain('[shape:rounded] Summary Box');
    expect(serialized).toContain('Euler -> Summary Box : relates');

    const { scene, warnings } = documentScriptCodec.parse(serialized, {
      ...base,
      nodes: [],
    });
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(4);
    expect(isCustomSceneNode(scene.nodes[1])).toBe(true);
    expect((scene.nodes[2] as ShapeSceneNode).shape).toBe('rounded');
    const conn = scene.nodes[3] as ConnectorSceneNode;
    expect(conn.type).toBe('connector');
    expect(conn.fromId).toBe(scene.nodes[1].id);
    expect(conn.toId).toBe(scene.nodes[2].id);
  });

  it('keeps prose containing "->" as plain paragraphs and preserves multi-line >> indented blocks', () => {
    const base = {
      ...cloneScene(PRESET_SCENES[0]),
      layoutMode: 'document' as const,
      nodes: [],
    };
    const input = [
      '# Technical Letter',
      '',
      '>> First indented line.',
      '>> Second indented line.',
      '',
      'Migration path: Monolith -> Microservices.',
    ].join('\n');

    const { scene, warnings } = documentScriptCodec.parse(input, base);
    expect(warnings).toEqual([]);
    expect(scene.nodes).toHaveLength(2);
    expect(scene.nodes.every((n) => n.type === 'text')).toBe(true);
    expect((scene.nodes[0] as TextSceneNode).text).toBe(
      'First indented line.\nSecond indented line.'
    );
    expect((scene.nodes[1] as TextSceneNode).text).toBe(
      'Migration path: Monolith -> Microservices.'
    );

    const serialized = documentScriptCodec.serialize(scene);
    expect(serialized).toContain('>> First indented line.\n>> Second indented line.');
    const reparsed = documentScriptCodec.parse(serialized, base);
    expect(reparsed.warnings).toEqual([]);
    expect(reparsed.scene.nodes).toHaveLength(2);
    expect((reparsed.scene.nodes[0] as TextSceneNode).text).toBe(
      'First indented line.\nSecond indented line.'
    );
  });
});
