import {
  createCardNode,
  createConnectorNode,
  createCustomNode,
  createShapeNode,
  createTextNode,
  getCardSummary,
} from '../../model/builders';
import {
  CardRole,
  ChalkColor,
  ConnectorSceneNode,
  GroupSceneNode,
  isCustomSceneNode,
  LessonScene,
  NodeShape,
  Point,
  resolveCustomNodeKind,
  SceneNode,
  ShapeSceneNode,
  TextAlign,
  TextSceneNode,
} from '../../model/scene';
import { SceneTextCodec } from '../contracts';
import { shapeRegistry } from '../registry';
import {
  formatMetaString,
  splitMetaPairs,
  stripMarkdownFence,
  unquoteMetaString,
} from './shared';

const VALID_ROLES = new Set<CardRole>([
  'root',
  'step',
  'concept',
  'highlight',
  'note',
]);

const VALID_COLORS = new Set<ChalkColor>([
  'white',
  'yellow',
  'cyan',
  'pink',
  'green',
  'orange',
]);

const VALID_ALIGNS = new Set<TextAlign>(['left', 'center', 'right']);
const VALID_ARRANGES = new Set<'card' | 'stack' | 'free'>([
  'card',
  'stack',
  'free',
]);

const BUILTIN_SHAPES = new Set<string>([
  'rounded',
  'circle',
  'cloud',
  'underline',
  'diamond',
  'divider',
  'none',
]);

const COORD_PAIR_REGEX =
  /^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/;

function isKnownShape(shape: string): boolean {
  return shapeRegistry.has(shape) || BUILTIN_SHAPES.has(shape);
}

const DEFAULT_COLOR_BY_ROLE: Record<CardRole, ChalkColor> = {
  root: 'yellow',
  step: 'cyan',
  concept: 'white',
  highlight: 'orange',
  note: 'green',
};

function escapeInlineText(raw: string): string {
  return raw.replace(/\r?\n/g, '\\n').trim();
}

function unescapeInlineText(raw: string): string {
  return raw.replace(/\\n/g, '\n');
}

function escapeCardTitle(raw: string): string {
  return escapeInlineText(raw).replace(/\|/g, '\\|');
}

function extractTrailingMetaBlock(
  text: string
): { body: string; metaRaw: string } | null {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith('}')) return null;

  let quote: '"' | "'" | null = null;
  let depth = 0;
  let topStart = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (quote) {
      if (ch === '\\') {
        i++;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) topStart = i;
      depth++;
    } else if (ch === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && i === trimmed.length - 1 && topStart !== -1) {
          return {
            body: trimmed.slice(0, topStart).trimEnd(),
            metaRaw: trimmed.slice(topStart + 1, i),
          };
        }
      }
    }
  }
  return null;
}

function findUnescapedPipe(raw: string): number {
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '|' && raw[i - 1] !== '\\') {
      return i;
    }
  }
  return -1;
}

function hasAmbiguousConnectorChars(label: string): boolean {
  return (
    label.includes(':') ||
    label.includes('：') ||
    label.includes('->') ||
    label.includes('-.->') ||
    label.includes('|')
  );
}

function sanitizeIdFragment(label: string): string {
  const cleaned = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '');
  return cleaned.slice(0, 18) || 'node';
}

interface ParsedMetaBlock {
  color?: ChalkColor;
  shape?: NodeShape;
  icon?: string;
  zone?: string;
  role?: CardRole;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  align?: TextAlign;
  bold?: boolean;
  maxWidth?: number;
  indentChars?: number;
  fitMode?: 'auto-group' | 'fixed';
  emphasized?: boolean;
  dashed?: boolean;
  arrange?: 'card' | 'stack' | 'free';
  gap?: number;
  say?: string;
  pause?: number;
  props?: Record<string, string | number | boolean>;
}

function parseMetaValue(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return raw;
}

function parseBooleanFlag(val: string): boolean | undefined {
  const lower = val.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes' || lower === '700') {
    return true;
  }
  if (lower === 'false' || lower === '0' || lower === 'no' || lower === '400') {
    return false;
  }
  return undefined;
}

function parseMetaBlock(
  metaRaw: string,
  lineNum: number,
  warnings: string[],
  allowCustomProps = false
): ParsedMetaBlock {
  const result: ParsedMetaBlock = {};
  const pairs = splitMetaPairs(metaRaw);

  for (const pair of pairs) {
    const colonIdx = pair.search(/[:：]/);
    if (colonIdx === -1) {
      warnings.push(
        `第 ${lineNum} 行属性格式无效："${pair}"，应为 key: value`
      );
      continue;
    }
    const rawKey = pair.slice(0, colonIdx).trim();
    const key = rawKey.toLowerCase();
    const val = pair.slice(colonIdx + 1).trim();

    if (key === 'color' || key === '颜色') {
      const lower = val.toLowerCase() as ChalkColor;
      if (VALID_COLORS.has(lower)) {
        result.color = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知颜色 "${val}"`);
      }
    } else if (key === 'group' || key === 'zone' || key === '分组') {
      const zoneVal = unquoteMetaString(val).trim();
      if (zoneVal) result.zone = zoneVal;
    } else if (key === 'x') {
      const num = Number(val);
      if (Number.isFinite(num)) {
        result.x = num;
      } else {
        warnings.push(`第 ${lineNum} 行坐标 x 无效："${val}"`);
      }
    } else if (key === 'y') {
      const num = Number(val);
      if (Number.isFinite(num)) {
        result.y = num;
      } else {
        warnings.push(`第 ${lineNum} 行坐标 y 无效："${val}"`);
      }
    } else if (
      key === 'say' ||
      key === 'caption' ||
      key === '字幕' ||
      key === '讲解'
    ) {
      const textVal = unquoteMetaString(val).trim();
      if (textVal) result.say = textVal;
    } else if (key === 'pause' || key === 'pausems' || key === '停顿') {
      const num = Number(val);
      if (Number.isFinite(num) && num >= 0) {
        result.pause = Math.round(num);
      } else {
        warnings.push(`第 ${lineNum} 行停顿时长无效："${val}"`);
      }
    } else if (allowCustomProps) {
      if (!result.props) result.props = {};
      const isQuoted =
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"));
      result.props[rawKey] = isQuoted
        ? unquoteMetaString(val)
        : parseMetaValue(val);
    } else if (key === 'shape' || key === '形状') {
      const lower = val.toLowerCase() as NodeShape;
      if (isKnownShape(lower)) {
        result.shape = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知形状 "${val}"`);
      }
    } else if (key === 'icon' || key === '图标') {
      const iconVal = unquoteMetaString(val).trim().toLowerCase();
      if (iconVal) result.icon = iconVal;
    } else if (key === 'role' || key === '角色') {
      const lower = val.toLowerCase() as CardRole;
      if (VALID_ROLES.has(lower)) {
        result.role = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知角色 "${val}"`);
      }
    } else if (key === 'w' || key === 'width') {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) {
        result.width = num;
      } else {
        warnings.push(`第 ${lineNum} 行宽度无效："${val}"`);
      }
    } else if (key === 'h' || key === 'height') {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) {
        result.height = num;
      } else {
        warnings.push(`第 ${lineNum} 行高度无效："${val}"`);
      }
    } else if (key === 'size' || key === 'fontsize' || key === '字号') {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) {
        result.fontSize = num;
      } else {
        warnings.push(`第 ${lineNum} 行字号无效："${val}"`);
      }
    } else if (key === 'align' || key === '对齐') {
      const lower = val.toLowerCase() as TextAlign;
      if (VALID_ALIGNS.has(lower)) {
        result.align = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知对齐方式 "${val}"`);
      }
    } else if (key === 'bold' || key === '加粗') {
      const b = parseBooleanFlag(val);
      if (b !== undefined) {
        result.bold = b;
      } else {
        warnings.push(`第 ${lineNum} 行 bold 值无效："${val}"`);
      }
    } else if (key === 'maxw' || key === 'maxwidth' || key === '行宽') {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) {
        result.maxWidth = num;
      } else {
        warnings.push(`第 ${lineNum} 行行宽无效："${val}"`);
      }
    } else if (key === 'indent' || key === 'indentchars' || key === '缩进') {
      const num = Number(val);
      if (Number.isFinite(num) && num >= 0) {
        result.indentChars = num;
      } else {
        warnings.push(`第 ${lineNum} 行缩进值无效："${val}"`);
      }
    } else if (key === 'fit' || key === 'fitmode') {
      const lower = val.toLowerCase();
      if (lower === 'auto-group' || lower === 'fixed') {
        result.fitMode = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知 fit 模式 "${val}"`);
      }
    } else if (key === 'emphasized' || key === '强调') {
      const b = parseBooleanFlag(val);
      if (b !== undefined) {
        result.emphasized = b;
      } else {
        warnings.push(`第 ${lineNum} 行 emphasized 值无效："${val}"`);
      }
    } else if (key === 'dashed' || key === '虚线') {
      const b = parseBooleanFlag(val);
      if (b !== undefined) {
        result.dashed = b;
      } else {
        warnings.push(`第 ${lineNum} 行 dashed 值无效："${val}"`);
      }
    } else if (key === 'arrange' || key === '排列') {
      const lower = val.toLowerCase() as 'card' | 'stack' | 'free';
      if (VALID_ARRANGES.has(lower)) {
        result.arrange = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知排列方式 "${val}"`);
      }
    } else if (key === 'gap' || key === '间距') {
      const num = Number(val);
      if (Number.isFinite(num) && num >= 0) {
        result.gap = num;
      } else {
        warnings.push(`第 ${lineNum} 行间距值无效："${val}"`);
      }
    } else {
      warnings.push(`第 ${lineNum} 行未知属性 "${rawKey}"`);
    }
  }

  return result;
}

interface NodeDraft {
  id: string;
  explicitId?: string;
  draftType: 'card' | 'text' | 'shape' | 'custom' | 'group';
  label: string;
  subtitle?: string;
  role: CardRole;
  explicitRole?: CardRole;
  color: ChalkColor;
  shape: NodeShape;
  icon?: string;
  zone?: string;
  say?: string;
  pause?: number;
  offset?: Point;
  width?: number;
  height?: number;
  fontSize?: number;
  align?: TextAlign;
  bold?: boolean;
  maxWidth?: number;
  indentChars?: number;
  fitMode?: 'auto-group' | 'fixed';
  emphasized?: boolean;
  dashed?: boolean;
  arrange?: 'card' | 'stack' | 'free';
  gap?: number;
  childrenDrafts?: NodeDraft[];
  customKind?: string;
  customProps?: Record<string, string | number | boolean | undefined>;
}

function buildNodeMeta(
  d: NodeDraft,
  includeRole = false
): Record<string, string | number | boolean | undefined> | undefined {
  const meta: Record<string, string | number | boolean | undefined> = {};
  if (includeRole && d.explicitRole) meta.role = d.explicitRole;
  if (d.zone) meta.zone = d.zone;
  if (d.say !== undefined) meta.say = d.say;
  if (d.pause !== undefined) meta.pause = d.pause;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function buildNodeFromDraft(d: NodeDraft): SceneNode {
  if (d.draftType === 'text') {
    return createTextNode({
      id: d.id,
      text: d.label,
      color: d.color,
      fontSize: d.fontSize ?? 21,
      fontWeight: d.bold ? 700 : 400,
      maxWidth: d.maxWidth,
      align: d.align ?? 'center',
      indentChars: d.indentChars,
      offset: d.offset,
      meta: buildNodeMeta(d),
    });
  }
  if (d.draftType === 'shape') {
    const shapeNode = createShapeNode({
      id: d.id,
      shape: d.shape,
      name: d.label,
      color: d.color,
      width: d.width,
      height: d.height,
      fitMode: d.fitMode ?? 'fixed',
      emphasized: d.emphasized,
      dashed: d.dashed,
      offset: d.offset,
    });
    const meta = buildNodeMeta(d);
    if (meta) shapeNode.meta = meta;
    return shapeNode;
  }
  if (d.draftType === 'custom') {
    return createCustomNode({
      id: d.id,
      kind: d.customKind ?? 'custom',
      name: d.label,
      color: d.color,
      props: d.customProps,
      offset: d.offset,
      meta: buildNodeMeta(d),
    });
  }
  if (d.draftType === 'group') {
    return {
      id: d.id,
      type: 'group',
      name: d.label,
      color: d.color,
      arrange: d.arrange ?? 'card',
      gap: d.gap,
      offset: d.offset,
      meta: buildNodeMeta(d, true),
      children: (d.childrenDrafts ?? []).map(buildNodeFromDraft),
    };
  }
  return createCardNode(d);
}

export function parseScriptToScene(
  script: string,
  base: LessonScene
): { scene: LessonScene; warnings: string[] } {
  const warnings: string[] = [];
  const lines = stripMarkdownFence(script).replace(/\r\n/g, '\n').split('\n');

  let title = base.title;
  const existingByLabel = new Map<
    string,
    { node: SceneNode; summary: ReturnType<typeof getCardSummary> }
  >();
  const existingById = new Map<
    string,
    { node: SceneNode; summary: ReturnType<typeof getCardSummary> }
  >();
  const registerExisting = (nodes: SceneNode[], isTopLevel: boolean) => {
    for (const oldNode of nodes) {
      if (oldNode.type === 'connector') continue;
      const summary = getCardSummary(oldNode);
      const entry = { node: oldNode, summary };
      existingById.set(oldNode.id, entry);
      if (isTopLevel) {
        existingByLabel.set(summary.label.trim(), entry);
      }
      if (oldNode.type === 'group') {
        registerExisting(oldNode.children, false);
      }
    }
  };
  registerExisting(base.nodes, true);

  const nodeDrafts: NodeDraft[] = [];
  const draftByLabel = new Map<string, NodeDraft>();
  const draftById = new Map<string, NodeDraft>();
  const usedIds = new Set<string>();
  const usedPrevChildIds = new Set<string>();
  const connectors: ConnectorSceneNode[] = [];
  const groupStack: Array<{ depth: number; draft: NodeDraft }> = [];

  const allocateId = (label: string, existingId?: string): string => {
    if (existingId && !usedIds.has(existingId)) {
      usedIds.add(existingId);
      return existingId;
    }
    const stem = sanitizeIdFragment(label);
    let candidate = `n-${stem}`;
    let counter = 2;
    while (usedIds.has(candidate)) {
      candidate = `n-${stem}-${counter++}`;
    }
    usedIds.add(candidate);
    return candidate;
  };

  const ensureDraftByLabel = (ref: string): NodeDraft => {
    const clean = ref.trim();
    if (clean.startsWith('#')) {
      const byHashId = draftById.get(clean.slice(1));
      if (byHashId) return byHashId;
    }
    const byExactId = draftById.get(clean);
    if (byExactId) return byExactId;

    const found = draftByLabel.get(clean);
    if (found) return found;

    const prev = existingByLabel.get(clean);
    const prevNode = prev?.node;
    const draftType: NodeDraft['draftType'] = prevNode
      ? prevNode.type === 'text'
        ? 'text'
        : prevNode.type === 'shape'
        ? 'shape'
        : isCustomSceneNode(prevNode)
        ? 'custom'
        : 'card'
      : 'card';

    const draft: NodeDraft = prev
      ? {
          id: allocateId(clean, prev.node.id),
          draftType,
          label: clean,
          subtitle: prev.summary.subtitle,
          role: prev.summary.role,
          color: prev.summary.color,
          shape: prev.summary.shape,
          icon: prev.summary.icon,
          zone: prev.summary.zone,
          say: prev.summary.say,
          pause: prev.summary.pause,
          offset: prev.node.offset ? { ...prev.node.offset } : undefined,
          width: prevNode?.type === 'shape' ? prevNode.width : undefined,
          height: prevNode?.type === 'shape' ? prevNode.height : undefined,
          fontSize: prevNode?.type === 'text' ? prevNode.fontSize : undefined,
          align: prevNode?.type === 'text' ? prevNode.align : undefined,
          bold:
            prevNode?.type === 'text' ? prevNode.fontWeight === 700 : undefined,
          maxWidth: prevNode?.type === 'text' ? prevNode.maxWidth : undefined,
          indentChars:
            prevNode?.type === 'text' ? prevNode.indentChars : undefined,
          customKind:
            prevNode && isCustomSceneNode(prevNode)
              ? resolveCustomNodeKind(prevNode)
              : undefined,
          customProps:
            prevNode && isCustomSceneNode(prevNode) && prevNode.props
              ? { ...prevNode.props }
              : undefined,
        }
      : {
          id: allocateId(clean),
          draftType: 'card',
          label: clean,
          role: 'concept',
          color: 'white',
          shape: 'rounded',
        };

    nodeDrafts.push(draft);
    draftById.set(draft.id, draft);
    draftByLabel.set(clean, draft);
    return draft;
  };

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const indentMatch = rawLine.match(/^( *)/);
    const depth = Math.floor((indentMatch ? indentMatch[1].length : 0) / 2);
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) return;

    if (line.startsWith('#')) {
      const parsedTitle = line.replace(/^#+\s*/, '').trim();
      if (parsedTitle) {
        title = parsedTitle;
      }
      return;
    }

    const outerMetaSplit = extractTrailingMetaBlock(line);
    const lineWithoutMeta = outerMetaSplit ? outerMetaSplit.body : line;
    const hasCardPrefix =
      /^\[[a-zA-Z0-9_:-]+(?:#[a-zA-Z0-9_:-]+)?\]\s+/.test(line);
    const hasMetaSuffix = outerMetaSplit !== null;
    const rawPipeIdx = findUnescapedPipe(lineWithoutMeta);
    const arrowIdx = lineWithoutMeta.search(/-\.->|->/);
    const hasPipeBeforeArrow =
      rawPipeIdx !== -1 && (arrowIdx === -1 || rawPipeIdx < arrowIdx);
    const isExplicitCardLine =
      hasCardPrefix ||
      hasPipeBeforeArrow ||
      (hasMetaSuffix && arrowIdx === -1);

    // Edge/connector line: A -> B : 说明 {color: pink}  OR  (x1, y1) -> (x2, y2) : 说明
    const edgeMatch = !isExplicitCardLine
      ? line.match(/^(.+?)\s*(-\.->|->)\s*(.+)$/)
      : null;
    if (edgeMatch) {
      const fromLabel = unescapeInlineText(edgeMatch[1].trim());
      const arrow = edgeMatch[2];
      let rhs = edgeMatch[3].trim();

      let edgeMeta: ParsedMetaBlock = {};
      const edgeMetaSplit = extractTrailingMetaBlock(rhs);
      if (edgeMetaSplit) {
        edgeMeta = parseMetaBlock(edgeMetaSplit.metaRaw, lineNum, warnings, false);
        rhs = edgeMetaSplit.body.trim();
      }

      let toLabel = rhs;
      let edgeLabel: string | undefined;

      const unescapedFullRhs = unescapeInlineText(rhs);
      const exactRhsMatch =
        draftByLabel.has(unescapedFullRhs) ||
        existingByLabel.has(unescapedFullRhs) ||
        (rhs.startsWith('#') && draftById.has(rhs.slice(1)));

      if (!exactRhsMatch) {
        const labelSepIdx = rhs.search(/[:：]/);
        if (labelSepIdx !== -1) {
          toLabel = rhs.slice(0, labelSepIdx).trim();
          const rawEdgeLabel = rhs.slice(labelSepIdx + 1).trim();
          if (rawEdgeLabel) edgeLabel = unescapeInlineText(rawEdgeLabel);
        }
      }
      toLabel = unescapeInlineText(toLabel);

      if (!fromLabel || !toLabel) {
        warnings.push(`第 ${lineNum} 行连线缺少起点或终点`);
        return;
      }

      const edgeOffset: Point | undefined =
        edgeMeta.x !== undefined || edgeMeta.y !== undefined
          ? { x: edgeMeta.x ?? 0, y: edgeMeta.y ?? 0 }
          : undefined;

      const fromCoord = fromLabel.match(COORD_PAIR_REGEX);
      const toCoord = toLabel.match(COORD_PAIR_REGEX);
      if (fromCoord && toCoord) {
        const freeConn = createConnectorNode({
          id: `e-${connectors.length + 1}-free`,
          fromPoint: { x: Number(fromCoord[1]), y: Number(fromCoord[2]) },
          toPoint: { x: Number(toCoord[1]), y: Number(toCoord[2]) },
          label: edgeLabel,
          style: arrow === '-.->' ? 'dashed' : 'solid',
          color: edgeMeta.color ?? 'white',
        });
        if (edgeOffset) freeConn.offset = edgeOffset;
        connectors.push(freeConn);
        return;
      }

      const fromDraft = ensureDraftByLabel(fromLabel);
      const toDraft = ensureDraftByLabel(toLabel);

      const boundConn = createConnectorNode({
        id: `e-${connectors.length + 1}-${fromDraft.id}-${toDraft.id}`,
        fromId: fromDraft.id,
        toId: toDraft.id,
        label: edgeLabel,
        style: arrow === '-.->' ? 'dashed' : 'solid',
        color: edgeMeta.color ?? fromDraft.color,
      });
      if (edgeOffset) boundConn.offset = edgeOffset;
      connectors.push(boundConn);
      return;
    }

    // Pop active groups down to current indentation depth
    while (
      groupStack.length > 0 &&
      groupStack[groupStack.length - 1].depth >= depth
    ) {
      groupStack.pop();
    }
    const parentGroup =
      groupStack.length > 0
        ? groupStack[groupStack.length - 1].draft
        : undefined;

    // Node declaration
    let body = line;
    let draftType: NodeDraft['draftType'] | undefined;
    let role: CardRole | undefined;
    let explicitShape: NodeShape | undefined;
    let explicitId: string | undefined;
    let customKind: string | undefined;

    const kindMatch = body.match(
      /^\[([a-zA-Z0-9_:-]+?)(?:#([a-zA-Z0-9_:-]+))?\]\s*(.+)$/
    );
    if (kindMatch) {
      const rawTag = kindMatch[1];
      const tagLower = rawTag.toLowerCase();
      explicitId = kindMatch[2]?.trim() || undefined;

      if (tagLower === 'text') {
        draftType = 'text';
      } else if (tagLower === 'group') {
        draftType = 'group';
      } else if (tagLower.startsWith('shape:')) {
        const shapeId = rawTag.slice('shape:'.length).trim().toLowerCase();
        draftType = 'shape';
        if (isKnownShape(shapeId) && shapeId !== 'none') {
          explicitShape = shapeId as NodeShape;
        } else {
          warnings.push(`第 ${lineNum} 行未知独立图形 "${shapeId}"，已转为 rounded`);
          explicitShape = 'rounded';
        }
      } else if (tagLower.startsWith('node:')) {
        draftType = 'custom';
        customKind = rawTag.slice('node:'.length).trim();
        if (!customKind) {
          warnings.push(`第 ${lineNum} 行自定义节点缺少类型名称 [node:<kind>]`);
          customKind = 'custom';
        }
      } else {
        draftType = 'card';
        const candidateRole = tagLower as CardRole;
        if (VALID_ROLES.has(candidateRole)) {
          role = candidateRole;
        } else {
          warnings.push(
            `第 ${lineNum} 行未知节点类型 "[${rawTag}]"，已默认转为 concept`
          );
          role = 'concept';
        }
      }
      body = kindMatch[3].trim();
    }

    let meta: ParsedMetaBlock = {};
    const nodeMetaSplit = extractTrailingMetaBlock(body);
    if (nodeMetaSplit) {
      meta = parseMetaBlock(
        nodeMetaSplit.metaRaw,
        lineNum,
        warnings,
        draftType === 'custom'
      );
      body = nodeMetaSplit.body.trim();
    }

    let label = body;
    let subtitle: string | undefined;
    const pipeIdx = findUnescapedPipe(body);
    if (pipeIdx !== -1 && (draftType === undefined || draftType === 'card')) {
      label = body.slice(0, pipeIdx).trim();
      const sub = body.slice(pipeIdx + 1).trim();
      if (sub) subtitle = unescapeInlineText(sub);
    }
    label = unescapeInlineText(label).replace(/\\\|/g, '|');

    if (!label) {
      warnings.push(`第 ${lineNum} 行节点名称为空，已跳过`);
      return;
    }

    if (parentGroup) {
      const childDraftType = draftType ?? 'text';
      const childRole = role ?? meta.role ?? 'concept';
      let matchedPrevChildId: string | undefined = explicitId;
      if (!matchedPrevChildId) {
        const prevParent = existingById.get(parentGroup.id)?.node;
        if (prevParent?.type === 'group') {
          const idxInParent = parentGroup.childrenDrafts?.length ?? 0;
          const byLabel = prevParent.children.find(
            (c) =>
              !usedPrevChildIds.has(c.id) &&
              getCardSummary(c).label.trim() === label
          );
          const candidateAtIdx = prevParent.children[idxInParent];
          const byIdx =
            candidateAtIdx &&
            !usedPrevChildIds.has(candidateAtIdx.id) &&
            (candidateAtIdx.type === childDraftType ||
              (childDraftType === 'card' && candidateAtIdx.type === 'group'))
              ? candidateAtIdx
              : undefined;
          matchedPrevChildId = (byLabel ?? byIdx)?.id;
        }
      }
      if (matchedPrevChildId) {
        usedPrevChildIds.add(matchedPrevChildId);
      }
      const childDraft: NodeDraft = {
        id: allocateId(label, matchedPrevChildId),
        explicitId,
        draftType: childDraftType,
        label,
        subtitle,
        role: childRole,
        explicitRole: meta.role,
        color: meta.color ?? 'white',
        shape: explicitShape ?? meta.shape ?? 'rounded',
        icon: meta.icon,
        zone: meta.zone,
        say: meta.say,
        pause: meta.pause,
        offset:
          meta.x !== undefined || meta.y !== undefined
            ? { x: meta.x ?? 0, y: meta.y ?? 0 }
            : undefined,
        width: meta.width,
        height: meta.height,
        fontSize: meta.fontSize,
        align: meta.align,
        bold: meta.bold,
        maxWidth: meta.maxWidth,
        indentChars: meta.indentChars,
        fitMode: meta.fitMode,
        emphasized: meta.emphasized,
        dashed: meta.dashed,
        arrange: meta.arrange,
        gap: meta.gap,
        childrenDrafts: childDraftType === 'group' ? [] : undefined,
        customKind,
        customProps: meta.props,
      };
      if (!parentGroup.childrenDrafts) parentGroup.childrenDrafts = [];
      parentGroup.childrenDrafts.push(childDraft);
      draftById.set(childDraft.id, childDraft);
      draftByLabel.set(`#${childDraft.id}`, childDraft);
      if (!draftByLabel.has(label)) {
        draftByLabel.set(label, childDraft);
      }
      if (childDraftType === 'group') {
        groupStack.push({ depth, draft: childDraft });
      }
      return;
    }

    const existing = explicitId
      ? draftById.get(explicitId)
      : draftByLabel.get(label);
    const prev = explicitId
      ? existingById.get(explicitId)
      : existingByLabel.get(label);
    const resolvedDraftType = draftType ?? existing?.draftType ?? 'card';
    const resolvedRole =
      role ?? meta.role ?? existing?.role ?? prev?.summary.role ?? 'concept';
    const resolvedColor =
      meta.color ??
      existing?.color ??
      prev?.summary.color ??
      (resolvedDraftType === 'card'
        ? DEFAULT_COLOR_BY_ROLE[resolvedRole]
        : 'white');
    const resolvedShape =
      explicitShape ??
      meta.shape ??
      existing?.shape ??
      prev?.summary.shape ??
      'rounded';
    const resolvedIcon = meta.icon ?? existing?.icon ?? prev?.summary.icon;
    const resolvedZone = meta.zone ?? existing?.zone ?? prev?.summary.zone;
    const resolvedSay = meta.say ?? existing?.say ?? prev?.summary.say;
    const resolvedPause = meta.pause ?? existing?.pause ?? prev?.summary.pause;
    const resolvedOffset: Point | undefined =
      meta.x !== undefined || meta.y !== undefined
        ? {
            x: meta.x ?? existing?.offset?.x ?? prev?.node.offset?.x ?? 0,
            y: meta.y ?? existing?.offset?.y ?? prev?.node.offset?.y ?? 0,
          }
        : existing?.offset ??
          (prev?.node.offset ? { ...prev.node.offset } : undefined);

    if (existing) {
      existing.draftType = resolvedDraftType;
      existing.role = resolvedRole;
      if (meta.role) existing.explicitRole = meta.role;
      existing.color = resolvedColor;
      existing.shape = resolvedShape;
      if (resolvedIcon !== undefined) existing.icon = resolvedIcon;
      if (subtitle !== undefined) existing.subtitle = subtitle;
      if (resolvedZone !== undefined) existing.zone = resolvedZone;
      if (resolvedSay !== undefined) existing.say = resolvedSay;
      if (resolvedPause !== undefined) existing.pause = resolvedPause;
      if (resolvedOffset !== undefined) existing.offset = resolvedOffset;
      if (meta.width !== undefined) existing.width = meta.width;
      if (meta.height !== undefined) existing.height = meta.height;
      if (meta.fontSize !== undefined) existing.fontSize = meta.fontSize;
      if (meta.align !== undefined) existing.align = meta.align;
      if (meta.bold !== undefined) existing.bold = meta.bold;
      if (meta.maxWidth !== undefined) existing.maxWidth = meta.maxWidth;
      if (meta.indentChars !== undefined)
        existing.indentChars = meta.indentChars;
      if (meta.fitMode !== undefined) existing.fitMode = meta.fitMode;
      if (meta.emphasized !== undefined) existing.emphasized = meta.emphasized;
      if (meta.dashed !== undefined) existing.dashed = meta.dashed;
      if (meta.arrange !== undefined) existing.arrange = meta.arrange;
      if (meta.gap !== undefined) existing.gap = meta.gap;
      if (customKind) existing.customKind = customKind;
      if (meta.props) {
        existing.customProps = {
          ...(existing.customProps ?? {}),
          ...meta.props,
        };
      }
      if (resolvedDraftType === 'group') {
        if (!existing.childrenDrafts) existing.childrenDrafts = [];
        groupStack.push({ depth, draft: existing });
      }
    } else {
      const prevNode = prev?.node;
      const draft: NodeDraft = {
        id: allocateId(label, explicitId ?? prevNode?.id),
        explicitId,
        draftType: resolvedDraftType,
        label,
        subtitle,
        role: resolvedRole,
        explicitRole: meta.role,
        color: resolvedColor,
        shape: resolvedShape,
        icon: resolvedIcon,
        zone: resolvedZone,
        say: resolvedSay,
        pause: resolvedPause,
        offset: resolvedOffset,
        width:
          meta.width ?? (prevNode?.type === 'shape' ? prevNode.width : undefined),
        height:
          meta.height ?? (prevNode?.type === 'shape' ? prevNode.height : undefined),
        fontSize:
          meta.fontSize ??
          (prevNode?.type === 'text' ? prevNode.fontSize : undefined),
        align:
          meta.align ?? (prevNode?.type === 'text' ? prevNode.align : undefined),
        bold:
          meta.bold ??
          (prevNode?.type === 'text' ? prevNode.fontWeight === 700 : undefined),
        maxWidth:
          meta.maxWidth ??
          (prevNode?.type === 'text' ? prevNode.maxWidth : undefined),
        indentChars:
          meta.indentChars ??
          (prevNode?.type === 'text' ? prevNode.indentChars : undefined),
        fitMode:
          meta.fitMode ??
          (prevNode?.type === 'shape' ? prevNode.fitMode : undefined),
        emphasized:
          meta.emphasized ??
          (prevNode?.type === 'shape' ? prevNode.emphasized : undefined),
        dashed:
          meta.dashed ??
          (prevNode?.type === 'shape' ? prevNode.dashed : undefined),
        arrange:
          meta.arrange ??
          (prevNode?.type === 'group' ? prevNode.arrange : undefined),
        gap: meta.gap ?? (prevNode?.type === 'group' ? prevNode.gap : undefined),
        childrenDrafts: resolvedDraftType === 'group' ? [] : undefined,
        customKind:
          customKind ??
          (prevNode && isCustomSceneNode(prevNode)
            ? resolveCustomNodeKind(prevNode)
            : undefined),
        customProps:
          meta.props ??
          (prevNode && isCustomSceneNode(prevNode) && prevNode.props
            ? { ...prevNode.props }
            : undefined),
      };
      nodeDrafts.push(draft);
      draftById.set(draft.id, draft);
      draftByLabel.set(`#${draft.id}`, draft);
      if (!explicitId || !draftByLabel.has(label)) {
        draftByLabel.set(label, draft);
      }
      if (resolvedDraftType === 'group') {
        groupStack.push({ depth, draft });
      }
    }
  });

  const vertexNodes: SceneNode[] = nodeDrafts.map(buildNodeFromDraft);
  const nodes: SceneNode[] = [...vertexNodes, ...connectors];

  return {
    scene: {
      ...base,
      title,
      nodes,
      customSteps: undefined,
    },
    warnings,
  };
}

function appendOffsetMeta(metaParts: string[], offset?: Point): void {
  const ox = offset?.x ?? 0;
  const oy = offset?.y ?? 0;
  if (ox !== 0 || oy !== 0) {
    metaParts.push(`x: ${Math.round(ox)}`, `y: ${Math.round(oy)}`);
  }
}

function appendStepMeta(
  metaParts: string[],
  meta?: Record<string, string | number | boolean | undefined>
): void {
  if (typeof meta?.say === 'string' && meta.say.trim()) {
    metaParts.push(`say: ${formatMetaString(meta.say)}`);
  }
  if (
    typeof meta?.pause === 'number' &&
    Number.isFinite(meta.pause) &&
    meta.pause >= 0
  ) {
    metaParts.push(`pause: ${Math.round(meta.pause)}`);
  }
}

function getTopLevelDisplayLabel(node: SceneNode): string {
  if (node.type === 'text') return escapeInlineText(node.text);
  if (node.type === 'shape' || isCustomSceneNode(node)) {
    return escapeInlineText(node.name);
  }
  if (node.type === 'group') {
    if (isStandardCardGroup(node)) {
      return escapeInlineText(getCardSummary(node).label);
    }
    return escapeInlineText(node.name);
  }
  return '';
}

function isStandardCardGroup(node: GroupSceneNode): boolean {
  if ((node.arrange ?? 'card') !== 'card') return false;
  if (node.gap !== undefined && node.gap !== 6) return false;

  const roleRaw = node.meta?.role;
  const role: CardRole =
    roleRaw === 'root' ||
    roleRaw === 'step' ||
    roleRaw === 'concept' ||
    roleRaw === 'highlight' ||
    roleRaw === 'note'
      ? roleRaw
      : 'concept';

  const shapes: ShapeSceneNode[] = [];
  const texts: TextSceneNode[] = [];
  let iconCount = 0;
  for (const child of node.children) {
    if (child.visible === false) return false;
    if (child.type === 'shape') {
      shapes.push(child);
    } else if (child.type === 'text') {
      texts.push(child);
    } else if (
      isCustomSceneNode(child) &&
      resolveCustomNodeKind(child) === 'icon' &&
      child.color === node.color
    ) {
      iconCount++;
    } else {
      return false;
    }
  }

  if (shapes.length > 1 || iconCount > 1 || texts.length < 1 || texts.length > 2) {
    return false;
  }

  const frame = shapes[0];
  if (frame) {
    if (frame.fitMode === 'fixed' || frame.dashed) return false;
    if (frame.color !== node.color) return false;
    if ((frame.offset?.x ?? 0) !== 0 || (frame.offset?.y ?? 0) !== 0) {
      return false;
    }
    if (frame.shape === 'underline') {
      if (node.children[node.children.length - 1] !== frame) return false;
    } else {
      if (node.children[0] !== frame) return false;
    }
  }

  const expectedTitleSize =
    role === 'root'
      ? 25
      : role === 'highlight'
      ? 21
      : role === 'note'
      ? 18
      : 20;
  const expectedSubSize = role === 'root' ? 14.5 : 13.5;

  const title = texts[0];
  if (
    (title.fontWeight ?? 400) !== 700 ||
    (title.align ?? 'center') !== 'center' ||
    (title.indentChars ?? 0) !== 0 ||
    (title.fontSize ?? expectedTitleSize) !== expectedTitleSize ||
    title.color !== node.color ||
    (title.offset?.x ?? 0) !== 0 ||
    (title.offset?.y ?? 0) !== 0
  ) {
    return false;
  }

  const sub = texts[1];
  if (
    sub &&
    (sub.color !== 'white' ||
      (sub.fontWeight ?? 400) !== 400 ||
      (sub.align ?? 'center') !== 'center' ||
      (sub.indentChars ?? 0) !== 0 ||
      (sub.fontSize ?? expectedSubSize) !== expectedSubSize ||
      (sub.offset?.x ?? 0) !== 0 ||
      (sub.offset?.y ?? 0) !== 0)
  ) {
    return false;
  }

  return true;
}

export function serializeNodeLines(
  node: SceneNode,
  indentLevel: number,
  lines: string[],
  idToLabel: Map<string, string>,
  idToColor: Map<string, ChalkColor>,
  connectors: ConnectorSceneNode[],
  labelCounts: Map<string, number>,
  referencedIds: Set<string> = new Set<string>()
): void {
  if (node.type === 'connector') {
    connectors.push(node);
    return;
  }

  const prefix = '  '.repeat(indentLevel);

  if (isCustomSceneNode(node)) {
    const kind = resolveCustomNodeKind(node);
    const singleLineName = escapeInlineText(node.name);
    const disambiguate =
      (indentLevel === 0 &&
        ((labelCounts.get(singleLineName) ?? 0) > 1 ||
          (referencedIds.has(node.id) &&
            hasAmbiguousConnectorChars(singleLineName)))) ||
      (indentLevel > 0 && referencedIds.has(node.id));
    const idSuffix = disambiguate ? `#${node.id}` : '';
    const refLabel =
      indentLevel === 0 && !disambiguate ? singleLineName : `#${node.id}`;
    idToLabel.set(node.id, refLabel);
    idToColor.set(node.id, node.color);
    const metaParts: string[] = [`color: ${node.color}`];
    if (node.props) {
      for (const [k, v] of Object.entries(node.props)) {
        if (v !== undefined) {
          const encoded =
            typeof v === 'string' ? formatMetaString(v) : String(v);
          metaParts.push(`${k}: ${encoded}`);
        }
      }
    }
    if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
      metaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
    }
    appendStepMeta(metaParts, node.meta);
    appendOffsetMeta(metaParts, node.offset);
    lines.push(
      `${prefix}[node:${kind}${idSuffix}] ${singleLineName} {${metaParts.join(', ')}}`
    );
    return;
  }

  if (node.type === 'text') {
    const singleLineText = escapeInlineText(node.text);
    const disambiguate =
      (indentLevel === 0 &&
        ((labelCounts.get(singleLineText) ?? 0) > 1 ||
          (referencedIds.has(node.id) &&
            hasAmbiguousConnectorChars(singleLineText)))) ||
      (indentLevel > 0 && referencedIds.has(node.id));
    const idSuffix = disambiguate ? `#${node.id}` : '';
    const refLabel =
      indentLevel === 0 && !disambiguate ? singleLineText : `#${node.id}`;
    idToLabel.set(node.id, refLabel);
    idToColor.set(node.id, node.color);
    const metaParts: string[] = [`color: ${node.color}`];
    if (node.fontSize && node.fontSize !== 21) {
      metaParts.push(`size: ${node.fontSize}`);
    }
    if (node.fontWeight === 700) {
      metaParts.push('bold: true');
    }
    if (node.align && node.align !== 'center') {
      metaParts.push(`align: ${node.align}`);
    }
    if (node.maxWidth !== undefined) {
      metaParts.push(`maxW: ${Math.round(node.maxWidth)}`);
    }
    if ((node.indentChars ?? 0) > 0) {
      metaParts.push(`indent: ${node.indentChars}`);
    }
    if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
      metaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
    }
    appendStepMeta(metaParts, node.meta);
    appendOffsetMeta(metaParts, node.offset);
    lines.push(
      `${prefix}[text${idSuffix}] ${singleLineText} {${metaParts.join(', ')}}`
    );
    return;
  }

  if (node.type === 'shape') {
    const singleLineName = escapeInlineText(node.name);
    const disambiguate =
      (indentLevel === 0 &&
        ((labelCounts.get(singleLineName) ?? 0) > 1 ||
          (referencedIds.has(node.id) &&
            hasAmbiguousConnectorChars(singleLineName)))) ||
      (indentLevel > 0 && referencedIds.has(node.id));
    const idSuffix = disambiguate ? `#${node.id}` : '';
    const refLabel =
      indentLevel === 0 && !disambiguate ? singleLineName : `#${node.id}`;
    idToLabel.set(node.id, refLabel);
    idToColor.set(node.id, node.color);
    const metaParts: string[] = [`color: ${node.color}`];
    if (node.fitMode && node.fitMode !== 'fixed') {
      metaParts.push(`fit: ${node.fitMode}`);
    }
    if (node.emphasized) {
      metaParts.push('emphasized: true');
    }
    if (node.dashed) {
      metaParts.push('dashed: true');
    }
    if (node.width !== undefined) {
      metaParts.push(`w: ${Math.round(node.width)}`);
    }
    if (node.height !== undefined) {
      metaParts.push(`h: ${Math.round(node.height)}`);
    }
    if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
      metaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
    }
    appendStepMeta(metaParts, node.meta);
    appendOffsetMeta(metaParts, node.offset);
    lines.push(
      `${prefix}[shape:${node.shape}${idSuffix}] ${singleLineName} {${metaParts.join(', ')}}`
    );
    return;
  }

  // GroupSceneNode
  if (indentLevel === 0 && isStandardCardGroup(node)) {
    const summary = getCardSummary(node);
    const singleLineLabel = escapeInlineText(summary.label);
    const disambiguate =
      (labelCounts.get(singleLineLabel) ?? 0) > 1 ||
      (referencedIds.has(node.id) &&
        hasAmbiguousConnectorChars(singleLineLabel));
    const idSuffix = disambiguate ? `#${node.id}` : '';
    idToLabel.set(node.id, disambiguate ? `#${node.id}` : singleLineLabel);
    idToColor.set(node.id, summary.color);

    const metaParts: string[] = [`color: ${summary.color}`];
    if (summary.shape !== 'rounded') {
      metaParts.push(`shape: ${summary.shape}`);
    }
    if (summary.icon) {
      metaParts.push(`icon: ${summary.icon}`);
    }
    if (summary.zone) {
      metaParts.push(`group: ${formatMetaString(summary.zone)}`);
    }
    appendStepMeta(metaParts, node.meta);
    appendOffsetMeta(metaParts, node.offset);

    const subtitlePart = summary.subtitle
      ? ` | ${escapeInlineText(summary.subtitle)}`
      : '';
    lines.push(
      `[${summary.role}${idSuffix}] ${escapeCardTitle(summary.label)}${subtitlePart} {${metaParts.join(', ')}}`
    );
    return;
  }

  const groupName = escapeInlineText(node.name);
  const disambiguate =
    (indentLevel === 0 &&
      ((labelCounts.get(groupName) ?? 0) > 1 ||
        (referencedIds.has(node.id) &&
          hasAmbiguousConnectorChars(groupName)))) ||
    (indentLevel > 0 && referencedIds.has(node.id));
  const idSuffix = disambiguate ? `#${node.id}` : '';
  const refLabel =
    indentLevel === 0 && !disambiguate ? groupName : `#${node.id}`;
  idToLabel.set(node.id, refLabel);
  idToColor.set(node.id, node.color);
  const groupMetaParts: string[] = [`color: ${node.color}`];
  groupMetaParts.push(`arrange: ${node.arrange ?? 'card'}`);
  if (node.gap !== undefined) {
    groupMetaParts.push(`gap: ${node.gap}`);
  }
  if (typeof node.meta?.role === 'string' && node.meta.role) {
    groupMetaParts.push(`role: ${node.meta.role}`);
  }
  if (typeof node.meta?.zone === 'string' && node.meta.zone.trim()) {
    groupMetaParts.push(`group: ${formatMetaString(node.meta.zone.trim())}`);
  }
  appendStepMeta(groupMetaParts, node.meta);
  appendOffsetMeta(groupMetaParts, node.offset);
  lines.push(
    `${prefix}[group${idSuffix}] ${groupName} {${groupMetaParts.join(', ')}}`
  );

  for (const child of node.children) {
    serializeNodeLines(
      child,
      indentLevel + 1,
      lines,
      idToLabel,
      idToColor,
      connectors,
      labelCounts,
      referencedIds
    );
  }
}

export function serializeConnectorLines(
  connectors: ConnectorSceneNode[],
  idToLabel: Map<string, string>,
  idToColor: Map<string, ChalkColor>
): string[] {
  const lines: string[] = [];
  for (const conn of connectors) {
    const arrow = conn.style === 'dashed' ? '-.->' : '->';
    const labelPart = conn.label
      ? ` : ${escapeInlineText(conn.label)}`
      : '';
    const edgeMetaParts: string[] = [];
    if (conn.fromId && conn.toId) {
      const fromLabel = idToLabel.get(conn.fromId);
      const toLabel = idToLabel.get(conn.toId);
      if (!fromLabel || !toLabel) continue;
      const defaultColor = idToColor.get(conn.fromId) ?? 'white';
      if (conn.color !== defaultColor) {
        edgeMetaParts.push(`color: ${conn.color}`);
      }
      appendOffsetMeta(edgeMetaParts, conn.offset);
      const metaPart =
        edgeMetaParts.length > 0 ? ` {${edgeMetaParts.join(', ')}}` : '';
      lines.push(`${fromLabel} ${arrow} ${toLabel}${labelPart}${metaPart}`);
    } else {
      if (conn.color !== 'white') {
        edgeMetaParts.push(`color: ${conn.color}`);
      }
      appendOffsetMeta(edgeMetaParts, conn.offset);
      const metaPart =
        edgeMetaParts.length > 0 ? ` {${edgeMetaParts.join(', ')}}` : '';
      const fx = Math.round(conn.fromPoint?.x ?? -90);
      const fy = Math.round(conn.fromPoint?.y ?? 0);
      const tx = Math.round(conn.toPoint?.x ?? 90);
      const ty = Math.round(conn.toPoint?.y ?? 0);
      lines.push(
        `(${fx}, ${fy}) ${arrow} (${tx}, ${ty})${labelPart}${metaPart}`
      );
    }
  }
  return lines;
}

export function serializeSceneToScript(scene: LessonScene): string {
  const lines: string[] = [];
  lines.push(`# ${scene.title}`);
  lines.push('');

  const labelCounts = new Map<string, number>();
  const referencedIds = new Set<string>();
  for (const node of scene.nodes) {
    if (node.type === 'connector') {
      if (node.fromId) referencedIds.add(node.fromId);
      if (node.toId) referencedIds.add(node.toId);
      continue;
    }
    const lbl = getTopLevelDisplayLabel(node);
    labelCounts.set(lbl, (labelCounts.get(lbl) ?? 0) + 1);
  }

  const idToLabel = new Map<string, string>();
  const idToColor = new Map<string, ChalkColor>();
  const connectors: ConnectorSceneNode[] = [];

  for (const node of scene.nodes) {
    serializeNodeLines(
      node,
      0,
      lines,
      idToLabel,
      idToColor,
      connectors,
      labelCounts,
      referencedIds
    );
  }

  const connLines = serializeConnectorLines(connectors, idToLabel, idToColor);
  if (connLines.length > 0) {
    lines.push('');
    lines.push(...connLines);
  }

  return lines.join('\n');
}

export const graphScriptCodec: SceneTextCodec = {
  id: 'graph-dsl',
  label: 'Graph Script',
  hintTitle: 'Quick Graph Script (Live Two-Way Sync)',
  hintLines: [
    '# Title · [kind] Label | Subtitle {color: yellow, shape: circle|none}',
    '[text] Free text · [shape:divider] Line · [group] Stack {arrange: stack}',
    'A -> B : Relation · (x1, y1) -> (x2, y2) : Free arrow {color: cyan}',
  ],
  syntaxRules: [
    'Optional scene title line: `# Scene Title`',
    'Card declaration: `[role] Label | Optional Subtitle {color, shape: <shape|none>, group, say: "spoken subtitle", pause: <ms>, x, y}` (use `[role#id]` when two nodes share the same label; use `\\n` for line breaks)',
    'Standalone atomic nodes: `[text] Content {color, size, bold, align, maxW, indent, say, pause, x, y}`, `[shape:<shapeId>] Label {color, fit, emphasized, dashed, w, h, say, pause, x, y}`, `[node:<customKind>] Name {color, <prop>: <val>, say, pause}`',
    'Composite groups: `[group] Group Name {color, arrange: card|stack|free, gap, say, pause}` followed by 2-space-indented child node lines',
    'Valid `role` values: `root`, `step`, `concept`, `highlight`, `note`',
    'Valid `color` values: `white`, `yellow`, `cyan`, `pink`, `green`, `orange`',
    'Connectors: `From Label -> To Label : Optional Label {color}` (or `#fromId -> #toId` for disambiguated nodes), `-.->` for dashed, or `(x1, y1) -> (x2, y2) : Label`',
    'Lines starting with `//` are ignored as comments.',
  ],
  example: [
    '# Client-Server Flow',
    '[root] Client | Sends request {color: yellow, shape: circle, group: Edge}',
    '[step] API Gateway | Routes & validates {color: cyan, shape: rounded, group: Core}',
    '[highlight] Database | Persists records {color: green, shape: underline, group: Core}',
    'Client -> API Gateway : HTTPS',
    'API Gateway -> Database : Query',
  ].join('\n'),
  parse: parseScriptToScene,
  serialize: serializeSceneToScript,
};
