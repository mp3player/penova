import { getCardSummary } from '../../model/builders';
import {
  ChalkColor,
  LessonScene,
  SceneNode,
  ShapeSceneNode,
  TextSceneNode,
} from '../../model/scene';
import { SceneTextCodec } from '../contracts';

const DEFAULT_MAX_WIDTH = 580;

function makeUniqueId(prefix: string, idx: number, usedIds: Set<string>): string {
  const base = `${prefix}-${idx + 1}`;
  let candidate = base;
  let n = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${n}`;
    n++;
  }
  usedIds.add(candidate);
  return candidate;
}

export const documentScriptCodec: SceneTextCodec = {
  id: 'document-md',
  label: '文稿文本',
  hintTitle: '文稿写法（信纸 / 纯文本）',
  hintLines: [
    '# 标题  设置文档标题',
    '## 称呼或小节  加粗左对齐',
    '>> 正文段落  首行自动缩进两字',
    '---  插入手绘分割线',
    '> 落款与日期  右对齐（连续 > 自动合并为一块）',
  ],
  parse(text, base) {
    const warnings: string[] = [];
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const existingVertices = base.nodes.filter((n) => n.type !== 'connector');

    let title = base.title;
    let cursor = 0;

    // Skip leading blank lines and optional # title header
    while (cursor < lines.length && lines[cursor].trim() === '') {
      cursor++;
    }
    if (cursor < lines.length && /^#\s+/.test(lines[cursor].trim())) {
      const parsedTitle = lines[cursor].trim().replace(/^#\s+/, '').trim();
      if (parsedTitle) {
        title = parsedTitle;
      }
      cursor++;
    }

    type DraftBlock =
      | { kind: 'divider' }
      | { kind: 'heading'; text: string }
      | { kind: 'quote-right'; text: string }
      | { kind: 'indented'; text: string }
      | { kind: 'paragraph'; text: string };

    const blocks: DraftBlock[] = [];

    while (cursor < lines.length) {
      const raw = lines[cursor];
      const trimmed = raw.trim();

      if (trimmed === '') {
        cursor++;
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        blocks.push({ kind: 'divider' });
        cursor++;
        continue;
      }

      if (/^##\s+/.test(trimmed)) {
        blocks.push({
          kind: 'heading',
          text: trimmed.replace(/^##\s+/, '').trim(),
        });
        cursor++;
        continue;
      }

      // Check >> before > so indented lines are never treated as right-aligned quotes
      if (/^>>/.test(trimmed)) {
        const paraLines: string[] = [];
        while (cursor < lines.length) {
          const curTrimmed = lines[cursor].trim();
          if (
            curTrimmed === '' ||
            /^---+$/.test(curTrimmed) ||
            /^##\s+/.test(curTrimmed) ||
            (/^>/.test(curTrimmed) && !/^>>/.test(curTrimmed))
          ) {
            break;
          }
          paraLines.push(curTrimmed.replace(/^>>\s?/, ''));
          cursor++;
        }
        blocks.push({ kind: 'indented', text: paraLines.join('\n') });
        continue;
      }

      if (/^>/.test(trimmed)) {
        const quoteLines: string[] = [];
        while (cursor < lines.length) {
          const curTrimmed = lines[cursor].trim();
          if (!/^>/.test(curTrimmed) || /^>>/.test(curTrimmed)) {
            break;
          }
          quoteLines.push(curTrimmed.replace(/^>\s?/, ''));
          cursor++;
        }
        blocks.push({ kind: 'quote-right', text: quoteLines.join('\n') });
        continue;
      }

      // Plain paragraph block until blank line or block marker
      const plainLines: string[] = [];
      while (cursor < lines.length) {
        const curTrimmed = lines[cursor].trim();
        if (
          curTrimmed === '' ||
          /^---+$/.test(curTrimmed) ||
          /^##\s+/.test(curTrimmed) ||
          /^>/.test(curTrimmed)
        ) {
          break;
        }
        plainLines.push(curTrimmed);
        cursor++;
      }
      blocks.push({ kind: 'paragraph', text: plainLines.join('\n') });
    }

    if (blocks.length === 0) {
      warnings.push('文稿内容为空，请添加至少一段文字或分割线。');
    }

    const usedIds = new Set<string>();
    const parsedNodes: SceneNode[] = blocks.map((block, idx) => {
      const existing = existingVertices[idx];

      if (block.kind === 'divider') {
        const matchDiv =
          existing?.type === 'shape' && existing.shape === 'divider'
            ? existing
            : undefined;
        const id =
          matchDiv && !usedIds.has(matchDiv.id)
            ? (usedIds.add(matchDiv.id), matchDiv.id)
            : makeUniqueId('doc-div', idx, usedIds);
        const shapeNode: ShapeSceneNode = {
          id,
          type: 'shape',
          name: matchDiv?.name ?? '分割线',
          shape: 'divider',
          color: (matchDiv?.color ?? 'orange') as ChalkColor,
          width: matchDiv?.width ?? 560,
          height: matchDiv?.height ?? 24,
          fitMode: 'fixed',
          offset: matchDiv?.offset,
        };
        return shapeNode;
      }

      const existingText =
        existing?.type === 'text' ? existing : undefined;
      const id =
        existing && !usedIds.has(existing.id)
          ? (usedIds.add(existing.id), existing.id)
          : makeUniqueId('doc-text', idx, usedIds);

      if (block.kind === 'heading') {
        const node: TextSceneNode = {
          id,
          type: 'text',
          name: block.text.slice(0, 18) || '称呼',
          color: existingText?.color ?? 'white',
          text: block.text,
          fontSize:
            existingText?.fontWeight === 700 ? existingText.fontSize ?? 25 : 25,
          fontWeight: 700,
          maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
          align: 'left',
          offset: existing?.offset,
        };
        return node;
      }

      if (block.kind === 'quote-right') {
        const node: TextSceneNode = {
          id,
          type: 'text',
          name: existingText?.align === 'right' ? existingText.name : '落款',
          color:
            existingText?.align === 'right'
              ? existingText.color
              : 'orange',
          text: block.text,
          fontSize:
            existingText?.align === 'right' ? existingText.fontSize ?? 20 : 20,
          fontWeight: 400,
          maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
          align: 'right',
          offset: existing?.offset,
        };
        return node;
      }

      if (block.kind === 'indented') {
        const node: TextSceneNode = {
          id,
          type: 'text',
          name:
            existingText && (existingText.indentChars ?? 0) > 0
              ? existingText.name
              : block.text.slice(0, 18) || '正文',
          color: existingText?.color ?? 'white',
          text: block.text,
          fontSize: existingText?.fontSize ?? 21,
          fontWeight: 400,
          maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
          align: 'left',
          indentChars: 2,
          offset: existing?.offset,
        };
        return node;
      }

      const node: TextSceneNode = {
        id,
        type: 'text',
        name: block.text.slice(0, 18) || '段落',
        color: existingText?.color ?? 'white',
        text: block.text,
        fontSize: existingText?.fontSize ?? 21,
        fontWeight: 400,
        maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
        align: existingText?.align ?? 'left',
        offset: existing?.offset,
      };
      return node;
    });

    const nextScene: LessonScene = {
      ...base,
      title,
      customSteps: undefined,
      nodes: parsedNodes,
    };

    return { scene: nextScene, warnings };
  },
  serialize(scene) {
    const out: string[] = [`# ${scene.title}`, ''];

    for (const node of scene.nodes) {
      if (node.type === 'connector' || node.visible === false) continue;

      if (node.type === 'shape') {
        if (node.shape === 'divider') {
          out.push('---', '');
        }
        continue;
      }

      if (node.type === 'group') {
        const summary = getCardSummary(node);
        const heading = summary.label.trim();
        const sub = summary.subtitle?.trim();
        if (heading) out.push(`## ${heading}`);
        if (sub) out.push(sub);
        out.push('');
        continue;
      }

      // TextSceneNode
      if (node.align === 'right') {
        const qLines = node.text
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map((l) => `> ${l}`);
        out.push(...qLines, '');
      } else if ((node.indentChars ?? 0) > 0) {
        const single = node.text.replace(/\r?\n/g, ' ').trim();
        out.push(`>> ${single}`, '');
      } else if ((node.fontWeight ?? 400) === 700) {
        const single = node.text.replace(/\r?\n/g, ' ').trim();
        out.push(`## ${single}`, '');
      } else {
        out.push(node.text, '');
      }
    }

    return out.join('\n').trimEnd();
  },
};
