import { createCardNode, createConnectorNode } from '../../model/builders';
import {
  ChalkColor,
  ConnectorSceneNode,
  isCustomSceneNode,
  LessonScene,
  Point,
  SceneNode,
  ShapeSceneNode,
  TextAlign,
  TextSceneNode,
} from '../../model/scene';
import { SceneTextCodec } from '../contracts';
import {
  parseScriptToScene,
  serializeConnectorLines,
  serializeNodeLines,
} from './scriptParser';
import {
  formatMetaString,
  splitMetaPairs,
  stripMarkdownFence,
  unquoteMetaString,
} from './shared';

const DEFAULT_MAX_WIDTH = 580;

const VALID_DOC_COLORS = new Set<ChalkColor>([
  'white',
  'yellow',
  'cyan',
  'pink',
  'green',
  'orange',
]);

const VALID_DOC_ALIGNS = new Set<TextAlign>(['left', 'center', 'right']);

interface DocBlockMeta {
  color?: ChalkColor;
  align?: TextAlign;
  fontSize?: number;
  bold?: boolean;
  indentChars?: number;
  offset?: Point;
  say?: string;
  pause?: number;
}

function extractDocBlockMeta(raw: string): {
  text: string;
  meta: DocBlockMeta;
} {
  const trimmed = raw.trimEnd();
  const match = trimmed.match(/\{([^}]+)\}\s*$/);
  if (!match || match.index === undefined) {
    return { text: raw, meta: {} };
  }

  const pairs = splitMetaPairs(match[1]);
  if (pairs.length === 0) {
    return { text: raw, meta: {} };
  }

  const meta: DocBlockMeta = {};
  let xVal: number | undefined;
  let yVal: number | undefined;

  for (const pair of pairs) {
    const colonIdx = pair.search(/[:：]/);
    if (colonIdx === -1) return { text: raw, meta: {} };
    const key = pair.slice(0, colonIdx).trim().toLowerCase();
    const val = pair.slice(colonIdx + 1).trim();

    if (key === 'color' || key === '颜色') {
      const lower = val.toLowerCase() as ChalkColor;
      if (!VALID_DOC_COLORS.has(lower)) return { text: raw, meta: {} };
      meta.color = lower;
    } else if (key === 'align' || key === '对齐') {
      const lower = val.toLowerCase() as TextAlign;
      if (!VALID_DOC_ALIGNS.has(lower)) return { text: raw, meta: {} };
      meta.align = lower;
    } else if (key === 'size' || key === 'fontsize' || key === '字号') {
      const num = Number(val);
      if (!Number.isFinite(num) || num <= 0) return { text: raw, meta: {} };
      meta.fontSize = num;
    } else if (key === 'bold' || key === '加粗') {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === '700') {
        meta.bold = true;
      } else if (lower === 'false' || lower === '0' || lower === '400') {
        meta.bold = false;
      } else {
        return { text: raw, meta: {} };
      }
    } else if (key === 'indent' || key === 'indentchars' || key === '缩进') {
      const num = Number(val);
      if (!Number.isFinite(num) || num < 0) return { text: raw, meta: {} };
      meta.indentChars = Math.round(num);
    } else if (key === 'x') {
      const num = Number(val);
      if (!Number.isFinite(num)) return { text: raw, meta: {} };
      xVal = num;
    } else if (key === 'y') {
      const num = Number(val);
      if (!Number.isFinite(num)) return { text: raw, meta: {} };
      yVal = num;
    } else if (
      key === 'say' ||
      key === 'caption' ||
      key === '字幕' ||
      key === '讲解'
    ) {
      const textVal = unquoteMetaString(val).trim();
      if (!textVal) return { text: raw, meta: {} };
      meta.say = textVal;
    } else if (key === 'pause' || key === 'pausems' || key === '停顿') {
      const num = Number(val);
      if (!Number.isFinite(num) || num < 0) return { text: raw, meta: {} };
      meta.pause = Math.round(num);
    } else {
      return { text: raw, meta: {} };
    }
  }

  if (xVal !== undefined || yVal !== undefined) {
    meta.offset = { x: xVal ?? 0, y: yVal ?? 0 };
  }

  const cleanedText = trimmed.slice(0, match.index).trimEnd();
  return { text: cleanedText, meta };
}

function formatDocBlockMeta(
  node: {
    color: ChalkColor;
    fontSize?: number;
    fontWeight?: 400 | 700;
    align?: TextAlign;
    indentChars?: number;
    offset?: Point;
    meta?: Record<string, string | number | boolean | undefined>;
  },
  defaults: {
    color: ChalkColor;
    fontSize?: number;
    fontWeight?: 400 | 700;
    align?: TextAlign;
    indentChars?: number;
  }
): string {
  const parts: string[] = [];
  if (node.color !== defaults.color) {
    parts.push(`color: ${node.color}`);
  }
  if (
    defaults.fontSize !== undefined &&
    node.fontSize !== undefined &&
    node.fontSize !== defaults.fontSize
  ) {
    parts.push(`size: ${node.fontSize}`);
  }
  if (
    defaults.fontWeight !== undefined &&
    (node.fontWeight ?? 400) !== defaults.fontWeight
  ) {
    parts.push(`bold: ${(node.fontWeight ?? 400) === 700}`);
  }
  if (
    defaults.align !== undefined &&
    node.align !== undefined &&
    node.align !== defaults.align
  ) {
    parts.push(`align: ${node.align}`);
  }
  if (
    defaults.indentChars !== undefined &&
    (node.indentChars ?? 0) !== defaults.indentChars
  ) {
    parts.push(`indent: ${node.indentChars ?? 0}`);
  }
  if (typeof node.meta?.say === 'string' && node.meta.say.trim()) {
    parts.push(`say: ${formatMetaString(node.meta.say)}`);
  }
  if (
    typeof node.meta?.pause === 'number' &&
    Number.isFinite(node.meta.pause) &&
    node.meta.pause >= 0
  ) {
    parts.push(`pause: ${Math.round(node.meta.pause)}`);
  }
  if ((node.offset?.x ?? 0) !== 0 || (node.offset?.y ?? 0) !== 0) {
    parts.push(
      `x: ${Math.round(node.offset?.x ?? 0)}`,
      `y: ${Math.round(node.offset?.y ?? 0)}`
    );
  }
  return parts.length > 0 ? ` {${parts.join(', ')}}` : '';
}

const COORD_PAIR_REGEX =
  /^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/;

function isGraphTagLine(trimmed: string): boolean {
  return /^\[(?:text|shape:[^\]\s]+|node:[^\]\s]+|group|root|step|concept|highlight|note)(?:#[^\]]+)?\]\s+\S/i.test(
    trimmed
  );
}

function isConnectorLine(trimmed: string): boolean {
  if (/^>/.test(trimmed) || /^[-*#]/.test(trimmed)) return false;
  if (/\{[^}]*\}\s*$/.test(trimmed)) {
    const withoutMeta = trimmed.replace(/\s*\{[^}]*\}\s*$/, '');
    return /^(.+?)\s*(-\.->|->)\s*(.+)$/.test(withoutMeta);
  }
  return /^(.+?)\s*(-\.->|->)\s*(.+)$/.test(trimmed);
}

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
  label: 'Document',
  hintTitle: 'Document Markdown (Letter / Plain Text)',
  hintLines: [
    '# Title  Set document title',
    '## Greeting or Heading  Bold left-aligned',
    '>> Paragraph {color: cyan}  Indented body paragraph',
    '---  Insert hand-drawn divider',
    '> Sign-off & Date  Right-aligned block',
  ],
  syntaxRules: [
    'Optional scene title header at top: `# Scene Title`',
    'Bold left-aligned heading / salutation: `## Greeting or Heading`',
    'Indented body paragraph (2-char first-line indent): `>> Paragraph text...`',
    'Plain body paragraph (no indent): plain text lines separated by blank lines',
    'Hand-drawn horizontal divider stroke: `---`',
    'Right-aligned sign-off / date block (consecutive `>` lines merge into one block): `> Line 1`',
    'Optional trailing style & narration metadata on any block: `{color: white|yellow|cyan|pink|green|orange, align: left|center|right, size: <num>, say: "spoken subtitle", pause: <ms>}`',
  ],
  example: [
    '# Letter to Creators',
    '',
    '## Dear Creators,',
    '',
    '>> Penova compiles plain text into stroke-by-stroke handwriting animations.',
    '',
    '---',
    '',
    '> Crafted with Penova',
    '> MIT Open Source',
  ].join('\n'),
  parse(text, base) {
    const warnings: string[] = [];
    const lines = stripMarkdownFence(text).replace(/\r\n/g, '\n').split('\n');
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
      | { kind: 'divider'; meta: DocBlockMeta }
      | { kind: 'heading'; text: string; meta: DocBlockMeta }
      | { kind: 'quote-right'; text: string; meta: DocBlockMeta }
      | { kind: 'indented'; text: string; meta: DocBlockMeta }
      | { kind: 'paragraph'; text: string; meta: DocBlockMeta }
      | { kind: 'graph'; rawLines: string[] }
      | { kind: 'connector-candidate'; rawLine: string };

    const blocks: DraftBlock[] = [];
    const isDividerLine = (t: string) => /^---+(?:\s*\{[^}]*\})?$/.test(t);
    const isSpecialDocBoundary = (t: string) =>
      t === '' ||
      isDividerLine(t) ||
      /^##\s+/.test(t) ||
      /^>/.test(t) ||
      isGraphTagLine(t) ||
      isConnectorLine(t);

    while (cursor < lines.length) {
      const raw = lines[cursor];
      const trimmed = raw.trim();

      if (trimmed === '') {
        cursor++;
        continue;
      }

      if (isGraphTagLine(trimmed)) {
        const blockLines = [raw];
        cursor++;
        while (cursor < lines.length) {
          const nextRaw = lines[cursor];
          const nextTrimmed = nextRaw.trim();
          if (nextTrimmed === '' || !/^ {2,}/.test(nextRaw)) break;
          blockLines.push(nextRaw);
          cursor++;
        }
        blocks.push({ kind: 'graph', rawLines: blockLines });
        continue;
      }

      if (isConnectorLine(trimmed)) {
        blocks.push({ kind: 'connector-candidate', rawLine: trimmed });
        cursor++;
        continue;
      }

      if (isDividerLine(trimmed)) {
        const { meta } = extractDocBlockMeta(trimmed.replace(/^---+/, '').trim());
        blocks.push({ kind: 'divider', meta });
        cursor++;
        continue;
      }

      if (/^##\s+/.test(trimmed)) {
        const extracted = extractDocBlockMeta(
          trimmed.replace(/^##\s+/, '').trim()
        );
        blocks.push({
          kind: 'heading',
          text: extracted.text,
          meta: extracted.meta,
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
            isDividerLine(curTrimmed) ||
            /^##\s+/.test(curTrimmed) ||
            (/^>/.test(curTrimmed) && !/^>>/.test(curTrimmed)) ||
            isGraphTagLine(curTrimmed) ||
            isConnectorLine(curTrimmed)
          ) {
            break;
          }
          paraLines.push(curTrimmed.replace(/^>>\s?/, ''));
          cursor++;
        }
        const extracted = extractDocBlockMeta(paraLines.join('\n'));
        blocks.push({
          kind: 'indented',
          text: extracted.text,
          meta: extracted.meta,
        });
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
        const extracted = extractDocBlockMeta(quoteLines.join('\n'));
        blocks.push({
          kind: 'quote-right',
          text: extracted.text,
          meta: extracted.meta,
        });
        continue;
      }

      // Plain paragraph block until blank line or block marker
      const plainLines: string[] = [];
      while (cursor < lines.length) {
        const curTrimmed = lines[cursor].trim();
        if (isSpecialDocBoundary(curTrimmed)) {
          break;
        }
        plainLines.push(curTrimmed);
        cursor++;
      }
      const extracted = extractDocBlockMeta(plainLines.join('\n'));
      blocks.push({
        kind: 'paragraph',
        text: extracted.text,
        meta: extracted.meta,
      });
    }

    if (blocks.length === 0) {
      warnings.push(
        'Document body is empty; add at least one paragraph or divider (---).'
      );
    }

    const usedIds = new Set<string>();
    const nodeByRef = new Map<string, SceneNode>();
    const registerNodeRefs = (node: SceneNode) => {
      nodeByRef.set(`#${node.id}`, node);
      nodeByRef.set(node.id, node);
      if (node.name && !nodeByRef.has(node.name)) {
        nodeByRef.set(node.name, node);
      }
      if (node.type === 'text') {
        const t = node.text.trim();
        if (t && !nodeByRef.has(t)) nodeByRef.set(t, node);
        const firstLine = t.split(/\r?\n/)[0]?.trim();
        if (firstLine && !nodeByRef.has(firstLine)) {
          nodeByRef.set(firstLine, node);
        }
      }
      if (node.type === 'group') {
        for (const child of node.children) {
          registerNodeRefs(child);
        }
      }
    };

    const buildBlockNodeMeta = (
      m: DocBlockMeta
    ): Record<string, string | number | boolean | undefined> | undefined => {
      if (m.say === undefined && m.pause === undefined) return undefined;
      return {
        ...(m.say !== undefined ? { say: m.say } : {}),
        ...(m.pause !== undefined ? { pause: m.pause } : {}),
      };
    };

    const existingDocVertices = existingVertices.filter(
      (n) =>
        n.type === 'text' || (n.type === 'shape' && n.shape === 'divider')
    );
    let docVertexCursor = 0;

    const slotNodes = new Map<number, SceneNode[]>();
    const appendVertex = (slotIdx: number, n: SceneNode) => {
      const list = slotNodes.get(slotIdx) ?? [];
      list.push(n);
      slotNodes.set(slotIdx, list);
      registerNodeRefs(n);
    };

    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      if (block.kind === 'connector-candidate') continue;

      if (block.kind === 'graph') {
        const subResult = parseScriptToScene(
          [`# ${title}`, ...block.rawLines].join('\n'),
          { ...base, nodes: base.nodes }
        );
        warnings.push(...subResult.warnings);
        for (const n of subResult.scene.nodes) {
          if (n.type === 'connector') continue;
          if (usedIds.has(n.id)) {
            let nIdx = 2;
            while (usedIds.has(`${n.id}-${nIdx}`)) nIdx++;
            n.id = `${n.id}-${nIdx}`;
          }
          usedIds.add(n.id);
          appendVertex(idx, n);
        }
        continue;
      }

      const existing = existingDocVertices[docVertexCursor++];
      const stepMeta = buildBlockNodeMeta(block.meta);

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
          name: matchDiv?.name ?? 'Divider',
          shape: 'divider',
          color: (block.meta.color ?? matchDiv?.color ?? 'orange') as ChalkColor,
          width: matchDiv?.width ?? 560,
          height: matchDiv?.height ?? 24,
          fitMode: 'fixed',
          offset: block.meta.offset ?? matchDiv?.offset,
          meta: stepMeta,
        };
        appendVertex(idx, shapeNode);
        continue;
      }

      const existingText =
        existing?.type === 'text' ? existing : undefined;
      const id =
        existing && !usedIds.has(existing.id)
          ? (usedIds.add(existing.id), existing.id)
          : makeUniqueId('doc-text', idx, usedIds);

      let textNode: TextSceneNode;
      if (block.kind === 'heading') {
        textNode = {
          id,
          type: 'text',
          name: block.text.slice(0, 18) || 'Heading',
          color: block.meta.color ?? existingText?.color ?? 'white',
          text: block.text,
          fontSize:
            block.meta.fontSize ??
            (existingText?.fontWeight === 700 ? existingText.fontSize ?? 25 : 25),
          fontWeight: block.meta.bold === false ? 400 : 700,
          maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
          align: block.meta.align ?? 'left',
          ...(block.meta.indentChars ? { indentChars: block.meta.indentChars } : {}),
          offset: block.meta.offset ?? existing?.offset,
          meta: stepMeta,
        };
      } else if (block.kind === 'quote-right') {
        textNode = {
          id,
          type: 'text',
          name: existingText?.align === 'right' ? existingText.name : 'Sign-off',
          color:
            block.meta.color ??
            (existingText?.align === 'right' ? existingText.color : 'orange'),
          text: block.text,
          fontSize:
            block.meta.fontSize ??
            (existingText?.align === 'right' ? existingText.fontSize ?? 20 : 20),
          fontWeight: block.meta.bold ? 700 : 400,
          maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
          align: block.meta.align ?? 'right',
          ...(block.meta.indentChars ? { indentChars: block.meta.indentChars } : {}),
          offset: block.meta.offset ?? existing?.offset,
          meta: stepMeta,
        };
      } else if (block.kind === 'indented') {
        textNode = {
          id,
          type: 'text',
          name:
            existingText && (existingText.indentChars ?? 0) > 0
              ? existingText.name
              : block.text.slice(0, 18) || 'Body',
          color: block.meta.color ?? existingText?.color ?? 'white',
          text: block.text,
          fontSize: block.meta.fontSize ?? existingText?.fontSize ?? 21,
          fontWeight: block.meta.bold ? 700 : 400,
          maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
          align: block.meta.align ?? 'left',
          indentChars: block.meta.indentChars ?? 2,
          offset: block.meta.offset ?? existing?.offset,
          meta: stepMeta,
        };
      } else {
        textNode = {
          id,
          type: 'text',
          name: block.text.slice(0, 18) || 'Paragraph',
          color: block.meta.color ?? existingText?.color ?? 'white',
          text: block.text,
          fontSize: block.meta.fontSize ?? existingText?.fontSize ?? 21,
          fontWeight: block.meta.bold ? 700 : 400,
          maxWidth: existingText?.maxWidth ?? DEFAULT_MAX_WIDTH,
          align: block.meta.align ?? existingText?.align ?? 'left',
          ...(block.meta.indentChars ? { indentChars: block.meta.indentChars } : {}),
          offset: block.meta.offset ?? existing?.offset,
          meta: stepMeta,
        };
      }
      appendVertex(idx, textNode);
    }

    const parsedConnectors: ConnectorSceneNode[] = [];
    for (let idx = 0; idx < blocks.length; idx++) {
      const block = blocks[idx];
      if (block.kind !== 'connector-candidate') continue;

      const m = block.rawLine.match(/^(.+?)\s*(-\.->|->)\s*(.+)$/);
      if (!m) continue;
      const fromRef = m[1].trim();
      const arrow = m[2];
      let rhs = m[3].trim();

      const extracted = extractDocBlockMeta(rhs);
      rhs = extracted.text.trim();
      let toRef = rhs;
      let edgeLabel: string | undefined;
      if (!nodeByRef.has(rhs) && !(rhs.startsWith('#') && nodeByRef.has(rhs))) {
        const colonIdx = rhs.search(/[:：]/);
        if (colonIdx !== -1) {
          toRef = rhs.slice(0, colonIdx).trim();
          const rawLbl = rhs.slice(colonIdx + 1).trim();
          if (rawLbl) edgeLabel = rawLbl;
        }
      }

      const fromCoord = fromRef.match(COORD_PAIR_REGEX);
      const toCoord = toRef.match(COORD_PAIR_REGEX);
      if (fromCoord && toCoord) {
        const freeConn = createConnectorNode({
          id: `e-doc-${parsedConnectors.length + 1}-free`,
          fromPoint: { x: Number(fromCoord[1]), y: Number(fromCoord[2]) },
          toPoint: { x: Number(toCoord[1]), y: Number(toCoord[2]) },
          label: edgeLabel,
          style: arrow === '-.->' ? 'dashed' : 'solid',
          color: extracted.meta.color ?? 'white',
        });
        if (extracted.meta.offset) freeConn.offset = extracted.meta.offset;
        parsedConnectors.push(freeConn);
        continue;
      }

      const fromHit = nodeByRef.get(fromRef);
      const toHit = nodeByRef.get(toRef);
      const isExplicitRef = fromRef.startsWith('#') || toRef.startsWith('#');
      if (!isExplicitRef && (!fromHit || !toHit)) {
        // Treat plain prose line containing '->' (without resolved nodes) as a document paragraph
        const extractedPara = extractDocBlockMeta(block.rawLine);
        const existing = existingDocVertices[docVertexCursor++];
        const id =
          existing && !usedIds.has(existing.id)
            ? (usedIds.add(existing.id), existing.id)
            : makeUniqueId('doc-text', idx, usedIds);
        const paraNode: TextSceneNode = {
          id,
          type: 'text',
          name: extractedPara.text.slice(0, 18) || 'Paragraph',
          color: extractedPara.meta.color ?? 'white',
          text: extractedPara.text,
          fontSize: extractedPara.meta.fontSize ?? 21,
          fontWeight: extractedPara.meta.bold ? 700 : 400,
          maxWidth: DEFAULT_MAX_WIDTH,
          align: extractedPara.meta.align ?? 'left',
          ...(extractedPara.meta.indentChars
            ? { indentChars: extractedPara.meta.indentChars }
            : {}),
          offset: extractedPara.meta.offset,
          meta: buildBlockNodeMeta(extractedPara.meta),
        };
        appendVertex(idx, paraNode);
        continue;
      }

      const resolveOrCreateNode = (ref: string, hit?: SceneNode): SceneNode => {
        if (hit) return hit;
        const card = createCardNode({
          id: makeUniqueId('doc-card', idx, usedIds),
          label: ref,
          color: 'white',
        });
        appendVertex(idx, card);
        return card;
      };

      const fromNode = resolveOrCreateNode(fromRef, fromHit);
      const toNode = resolveOrCreateNode(toRef, toHit);
      const boundConn = createConnectorNode({
        id: `e-doc-${parsedConnectors.length + 1}-${fromNode.id}-${toNode.id}`,
        fromId: fromNode.id,
        toId: toNode.id,
        label: edgeLabel,
        style: arrow === '-.->' ? 'dashed' : 'solid',
        color: extracted.meta.color ?? fromNode.color,
      });
      if (extracted.meta.offset) boundConn.offset = extracted.meta.offset;
      parsedConnectors.push(boundConn);
    }

    const parsedVertices: SceneNode[] = [];
    for (let idx = 0; idx < blocks.length; idx++) {
      const list = slotNodes.get(idx);
      if (list) parsedVertices.push(...list);
    }

    const nextScene: LessonScene = {
      ...base,
      title,
      customSteps: undefined,
      nodes: [...parsedVertices, ...parsedConnectors],
    };

    return { scene: nextScene, warnings };
  },
  serialize(scene) {
    const out: string[] = [`# ${scene.title}`, ''];
    const labelCounts = new Map<string, number>();
    const referencedIds = new Set<string>();
    const idToLabel = new Map<string, string>();
    const idToColor = new Map<string, ChalkColor>();
    const connectors: ConnectorSceneNode[] = [];

    for (const node of scene.nodes) {
      if (node.type === 'connector') {
        if (node.fromId) referencedIds.add(node.fromId);
        if (node.toId) referencedIds.add(node.toId);
        connectors.push(node);
        continue;
      }
      const lbl =
        node.type === 'text'
          ? node.text.trim().split(/\r?\n/)[0]?.trim() || node.name
          : node.name.trim();
      labelCounts.set(lbl, (labelCounts.get(lbl) ?? 0) + 1);
    }

    for (const node of scene.nodes) {
      if (node.type === 'connector' || node.visible === false) continue;

      if (
        node.type === 'shape' &&
        node.shape === 'divider' &&
        !referencedIds.has(node.id)
      ) {
        idToLabel.set(node.id, node.name || `#${node.id}`);
        idToColor.set(node.id, node.color);
        const metaStr = formatDocBlockMeta(node, { color: 'orange' });
        out.push(`---${metaStr}`, '');
        continue;
      }

      if (
        node.type === 'shape' ||
        node.type === 'group' ||
        isCustomSceneNode(node)
      ) {
        const extraLines: string[] = [];
        serializeNodeLines(
          node,
          0,
          extraLines,
          idToLabel,
          idToColor,
          connectors,
          labelCounts,
          referencedIds
        );
        if (extraLines.length > 0) {
          out.push(...extraLines, '');
        }
        continue;
      }

      // TextSceneNode
      const singleLine = node.text.trim().split(/\r?\n/)[0]?.trim() ?? '';
      const docRef =
        singleLine &&
        !node.text.includes('\n') &&
        (labelCounts.get(singleLine) ?? 0) === 1
          ? singleLine
          : `#${node.id}`;
      idToLabel.set(node.id, docRef);
      idToColor.set(node.id, node.color);

      if (node.align === 'right') {
        const qLines = node.text
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map((l) => `> ${l}`);
        const metaStr = formatDocBlockMeta(node, {
          color: 'orange',
          fontSize: 20,
          fontWeight: 400,
          align: 'right',
          indentChars: 0,
        });
        if (metaStr && qLines.length > 0) {
          qLines[qLines.length - 1] += metaStr;
        }
        out.push(...qLines, '');
      } else if ((node.indentChars ?? 0) > 0) {
        const iLines = node.text
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map((l) => `>> ${l}`);
        const metaStr = formatDocBlockMeta(node, {
          color: 'white',
          fontSize: 21,
          fontWeight: 400,
          align: 'left',
          indentChars: 2,
        });
        if (metaStr && iLines.length > 0) {
          iLines[iLines.length - 1] += metaStr;
        }
        out.push(...iLines, '');
      } else if ((node.fontWeight ?? 400) === 700) {
        const single = node.text.replace(/\r?\n/g, ' ').trim();
        const metaStr = formatDocBlockMeta(node, {
          color: 'white',
          fontSize: 25,
          fontWeight: 700,
          align: 'left',
          indentChars: 0,
        });
        out.push(`## ${single}${metaStr}`, '');
      } else if (/^(?:#|>|---+|\[)/.test(node.text.trim())) {
        const extraLines: string[] = [];
        serializeNodeLines(
          node,
          0,
          extraLines,
          idToLabel,
          idToColor,
          connectors,
          labelCounts,
          referencedIds
        );
        if (extraLines.length > 0) {
          out.push(...extraLines, '');
        }
      } else {
        const metaStr = formatDocBlockMeta(node, {
          color: 'white',
          fontSize: 21,
          fontWeight: 400,
          align: 'left',
          indentChars: 0,
        });
        out.push(`${node.text}${metaStr}`, '');
      }
    }

    const connLines = serializeConnectorLines(connectors, idToLabel, idToColor);
    if (connLines.length > 0) {
      out.push(...connLines, '');
    }

    return out.join('\n').trimEnd();
  },
};
