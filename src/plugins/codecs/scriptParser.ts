import {
  createCardNode,
  createConnectorNode,
  getCardSummary,
} from '../../model/builders';
import {
  CardRole,
  ChalkColor,
  ConnectorSceneNode,
  GroupSceneNode,
  LessonScene,
  NodeShape,
  SceneNode,
} from '../../model/scene';
import { SceneTextCodec } from '../contracts';
import { shapeRegistry } from '../registry';

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

const BUILTIN_SHAPES = new Set<string>([
  'rounded',
  'circle',
  'cloud',
  'underline',
  'diamond',
  'divider',
]);

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

function sanitizeIdFragment(label: string): string {
  const cleaned = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '');
  return cleaned.slice(0, 18) || 'node';
}

function parseMetaBlock(
  metaRaw: string,
  lineNum: number,
  warnings: string[]
): { color?: ChalkColor; shape?: NodeShape; zone?: string } {
  const result: { color?: ChalkColor; shape?: NodeShape; zone?: string } = {};
  const pairs = metaRaw
    .split(/[,，;；]/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const pair of pairs) {
    const colonIdx = pair.search(/[:：]/);
    if (colonIdx === -1) {
      warnings.push(
        `第 ${lineNum} 行属性格式无效："${pair}"，应为 key: value`
      );
      continue;
    }
    const key = pair.slice(0, colonIdx).trim().toLowerCase();
    const val = pair.slice(colonIdx + 1).trim();

    if (key === 'color' || key === '颜色') {
      const lower = val.toLowerCase() as ChalkColor;
      if (VALID_COLORS.has(lower)) {
        result.color = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知颜色 "${val}"`);
      }
    } else if (key === 'shape' || key === '形状') {
      const lower = val.toLowerCase() as NodeShape;
      if (isKnownShape(lower)) {
        result.shape = lower;
      } else {
        warnings.push(`第 ${lineNum} 行未知形状 "${val}"`);
      }
    } else if (key === 'group' || key === 'zone' || key === '分组') {
      if (val) result.zone = val;
    } else {
      warnings.push(`第 ${lineNum} 行未知属性 "${key}"`);
    }
  }

  return result;
}

interface CardDraft {
  id: string;
  label: string;
  subtitle?: string;
  role: CardRole;
  color: ChalkColor;
  shape: NodeShape;
  zone?: string;
  offset?: { x: number; y: number };
}

export function parseScriptToScene(
  script: string,
  base: LessonScene
): { scene: LessonScene; warnings: string[] } {
  const warnings: string[] = [];
  const lines = script.split(/\r?\n/);

  let title = base.title;
  const existingByLabel = new Map<
    string,
    { node: SceneNode; summary: ReturnType<typeof getCardSummary> }
  >();
  for (const oldNode of base.nodes) {
    if (oldNode.type === 'connector') continue;
    const summary = getCardSummary(oldNode);
    existingByLabel.set(summary.label.trim(), { node: oldNode, summary });
  }

  const cardDrafts: CardDraft[] = [];
  const draftByLabel = new Map<string, CardDraft>();
  const usedIds = new Set<string>();
  const connectors: ConnectorSceneNode[] = [];

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

  const ensureDraftByLabel = (label: string): CardDraft => {
    const clean = label.trim();
    const found = draftByLabel.get(clean);
    if (found) return found;

    const prev = existingByLabel.get(clean);
    const draft: CardDraft = prev
      ? {
          id: allocateId(clean, prev.node.id),
          label: clean,
          subtitle: prev.summary.subtitle,
          role: prev.summary.role,
          color: prev.summary.color,
          shape: prev.summary.shape,
          zone: prev.summary.zone,
          offset: prev.node.offset ? { ...prev.node.offset } : undefined,
        }
      : {
          id: allocateId(clean),
          label: clean,
          role: 'concept',
          color: 'white',
          shape: 'rounded',
        };

    cardDrafts.push(draft);
    draftByLabel.set(clean, draft);
    return draft;
  };

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) return;

    if (line.startsWith('#')) {
      const parsedTitle = line.replace(/^#+\s*/, '').trim();
      if (parsedTitle) {
        title = parsedTitle;
      }
      return;
    }

    // Edge/connector line: A -> B : 说明  OR  A -.-> B : 说明
    const edgeMatch = line.match(/^(.+?)\s*(-\.->|->)\s*(.+)$/);
    if (edgeMatch) {
      const fromLabel = edgeMatch[1].trim();
      const arrow = edgeMatch[2];
      const rhs = edgeMatch[3].trim();

      let toLabel = rhs;
      let edgeLabel: string | undefined;

      const labelSepIdx = rhs.search(/[:：]/);
      if (labelSepIdx !== -1) {
        toLabel = rhs.slice(0, labelSepIdx).trim();
        const rawEdgeLabel = rhs.slice(labelSepIdx + 1).trim();
        if (rawEdgeLabel) edgeLabel = rawEdgeLabel;
      }

      if (!fromLabel || !toLabel) {
        warnings.push(`第 ${lineNum} 行连线缺少起点或终点`);
        return;
      }

      const fromDraft = ensureDraftByLabel(fromLabel);
      const toDraft = ensureDraftByLabel(toLabel);

      connectors.push(
        createConnectorNode({
          id: `e-${connectors.length + 1}-${fromDraft.id}-${toDraft.id}`,
          fromId: fromDraft.id,
          toId: toDraft.id,
          label: edgeLabel,
          style: arrow === '-.->' ? 'dashed' : 'solid',
          color: fromDraft.color,
        })
      );
      return;
    }

    // Node declaration: [role] 标题 | 副标题 {color: yellow, shape: rounded, group: 分组}
    let body = line;
    let role: CardRole | undefined;

    const kindMatch = body.match(/^\[([a-zA-Z_-]+)\]\s*(.+)$/);
    if (kindMatch) {
      const candidateRole = kindMatch[1].toLowerCase() as CardRole;
      if (VALID_ROLES.has(candidateRole)) {
        role = candidateRole;
      } else {
        warnings.push(
          `第 ${lineNum} 行未知节点类型 "[${kindMatch[1]}]"，已默认转为 concept`
        );
        role = 'concept';
      }
      body = kindMatch[2].trim();
    }

    let meta: { color?: ChalkColor; shape?: NodeShape; zone?: string } = {};
    const metaMatch = body.match(/\{([^}]*)\}\s*$/);
    if (metaMatch) {
      meta = parseMetaBlock(metaMatch[1], lineNum, warnings);
      body = body.slice(0, metaMatch.index).trim();
    }

    let label = body;
    let subtitle: string | undefined;
    const pipeIdx = body.indexOf('|');
    if (pipeIdx !== -1) {
      label = body.slice(0, pipeIdx).trim();
      const sub = body.slice(pipeIdx + 1).trim();
      if (sub) subtitle = sub;
    }

    if (!label) {
      warnings.push(`第 ${lineNum} 行节点名称为空，已跳过`);
      return;
    }

    const existing = draftByLabel.get(label);
    const prev = existingByLabel.get(label);
    const resolvedRole = role ?? existing?.role ?? prev?.summary.role ?? 'concept';
    const resolvedColor =
      meta.color ??
      existing?.color ??
      prev?.summary.color ??
      DEFAULT_COLOR_BY_ROLE[resolvedRole];
    const resolvedShape =
      meta.shape ?? existing?.shape ?? prev?.summary.shape ?? 'rounded';
    const resolvedZone = meta.zone ?? existing?.zone ?? prev?.summary.zone;

    if (existing) {
      existing.role = resolvedRole;
      existing.color = resolvedColor;
      existing.shape = resolvedShape;
      if (subtitle !== undefined) existing.subtitle = subtitle;
      if (resolvedZone !== undefined) existing.zone = resolvedZone;
    } else {
      const draft: CardDraft = {
        id: allocateId(label, prev?.node.id),
        label,
        subtitle,
        role: resolvedRole,
        color: resolvedColor,
        shape: resolvedShape,
        zone: resolvedZone,
        offset: prev?.node.offset ? { ...prev.node.offset } : undefined,
      };
      cardDrafts.push(draft);
      draftByLabel.set(label, draft);
    }
  });

  const nodes: SceneNode[] = [
    ...cardDrafts.map((d): GroupSceneNode => createCardNode(d)),
    ...connectors,
  ];

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

export function serializeSceneToScript(scene: LessonScene): string {
  const lines: string[] = [];
  lines.push(`# ${scene.title}`);
  lines.push('');

  const idToLabel = new Map<string, string>();
  const connectors: ConnectorSceneNode[] = [];

  for (const node of scene.nodes) {
    if (node.type === 'connector') {
      connectors.push(node);
      continue;
    }
    const summary = getCardSummary(node);
    const singleLineLabel = summary.label.replace(/\r?\n/g, ' ').trim();
    idToLabel.set(node.id, singleLineLabel);

    const metaParts: string[] = [`color: ${summary.color}`];
    if (summary.shape !== 'rounded') {
      metaParts.push(`shape: ${summary.shape}`);
    }
    if (summary.zone) {
      metaParts.push(`group: ${summary.zone}`);
    }

    const subtitlePart = summary.subtitle
      ? ` | ${summary.subtitle.replace(/\r?\n/g, ' ').trim()}`
      : '';
    lines.push(
      `[${summary.role}] ${singleLineLabel}${subtitlePart} {${metaParts.join(', ')}}`
    );
  }

  if (connectors.length > 0) {
    lines.push('');
    for (const conn of connectors) {
      if (!conn.fromId || !conn.toId) continue;
      const fromLabel = idToLabel.get(conn.fromId);
      const toLabel = idToLabel.get(conn.toId);
      if (!fromLabel || !toLabel) continue;
      const arrow = conn.style === 'dashed' ? '-.->' : '->';
      const labelPart = conn.label ? ` : ${conn.label}` : '';
      lines.push(`${fromLabel} ${arrow} ${toLabel}${labelPart}`);
    }
  }

  return lines.join('\n');
}

export const graphScriptCodec: SceneTextCodec = {
  id: 'graph-dsl',
  label: '板书脚本',
  hintTitle: '快速脚本语法（实时双向同步）',
  hintLines: [
    '# 标题 · [kind] 节点 | 副标题 {color: yellow, shape: circle}',
    'A -> B : 关系（实线） · A -.-> B : 虚线',
  ],
  parse: parseScriptToScene,
  serialize: serializeSceneToScript,
};
