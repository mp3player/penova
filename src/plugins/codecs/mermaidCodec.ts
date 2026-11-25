import {
  CardRole,
  ChalkColor,
  ConnectorSceneNode,
  LayoutMode,
  LessonScene,
  NodeShape,
  SceneNode,
} from '../../model/scene';
import {
  createCardNode,
  createConnectorNode,
} from '../../model/builders';
import { SceneTextCodec } from '../contracts';
import { stripMarkdownFence } from './shared';

interface MermaidNodeDraft {
  rawId: string;
  nodeId: string;
  label: string;
  subtitle?: string;
  role: CardRole;
  shape: NodeShape;
  color: ChalkColor;
  zone?: string;
  explicitStyled: boolean;
}

const MERMAID_HEADER_RE = /^(?:flowchart|graph)\b(?:\s+(TB|TD|BT|RL|LR))?/i;
const SUBGRAPH_RE =
  /^subgraph\s+([^\s\[]+)(?:\s*\[([\s\S]+)\])?\s*$|^subgraph\s+(.+)$/i;
const COLOR_ROTATION: readonly ChalkColor[] = [
  'cyan',
  'green',
  'orange',
  'pink',
  'yellow',
];

function sanitizeMermaidId(raw: string): string {
  const stem = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem ? `mm-${stem}` : 'mm-node';
}

function unquoteMermaidLabel(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('`') && s.endsWith('`'))
  ) {
    s = s.slice(1, -1);
  }
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

function splitMermaidStatements(rawLines: string[]): string[] {
  const out: string[] = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) continue;
    let curr = '';
    let quote: string | null = null;
    let depth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (quote) {
        curr += ch;
        if (ch === quote && trimmed[i - 1] !== '\\') {
          quote = null;
        }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
        curr += ch;
        continue;
      }
      if (ch === '[' || ch === '(' || ch === '{') {
        depth++;
        curr += ch;
        continue;
      }
      if (ch === ']' || ch === ')' || ch === '}') {
        depth = Math.max(0, depth - 1);
        curr += ch;
        continue;
      }
      if (ch === ';' && depth === 0) {
        if (curr.trim()) out.push(curr.trim());
        curr = '';
        continue;
      }
      curr += ch;
    }
    if (curr.trim()) out.push(curr.trim());
  }
  return out;
}

function parseNodeToken(rawToken: string): {
  rawId: string;
  label?: string;
  shape?: NodeShape;
  role?: CardRole;
  color?: ChalkColor;
  declared: boolean;
} | null {
  let token = rawToken.trim();
  if (!token) return null;

  // Strip trailing Mermaid class annotation (`:::className`)
  token = token.replace(/:::[A-Za-z0-9_-]+$/, '').trim();
  if (!token) return null;

  const idMatch = /^([A-Za-z0-9_.-]+)/.exec(token);
  if (!idMatch) return null;
  const rawId = idMatch[1];
  const rest = token.slice(rawId.length).trim();

  if (!rest) {
    return { rawId, declared: false };
  }

  let inner = rest;
  let shape: NodeShape = 'rounded';
  let role: CardRole = 'concept';
  let color: ChalkColor | undefined;

  const patterns: Array<{
    open: string;
    close: string;
    shape: NodeShape;
    role: CardRole;
    color?: ChalkColor;
  }> = [
    { open: '(((', close: ')))', shape: 'circle', role: 'root', color: 'yellow' },
    { open: '((', close: '))', shape: 'circle', role: 'concept', color: 'cyan' },
    { open: '([', close: '])', shape: 'circle', role: 'step', color: 'cyan' },
    { open: '[(', close: ')]', shape: 'rounded', role: 'highlight', color: 'green' },
    { open: '[[', close: ']]', shape: 'rounded', role: 'step' },
    { open: '{{', close: '}}', shape: 'diamond', role: 'highlight', color: 'yellow' },
    { open: '[/', close: '/]', shape: 'rounded', role: 'step' },
    { open: '[\\', close: '\\]', shape: 'rounded', role: 'step' },
    { open: '(', close: ')', shape: 'rounded', role: 'step' },
    { open: '{', close: '}', shape: 'diamond', role: 'highlight', color: 'yellow' },
    { open: '[', close: ']', shape: 'rounded', role: 'concept' },
    { open: '>', close: ']', shape: 'cloud', role: 'note', color: 'orange' },
  ];

  let matched = false;
  for (const pat of patterns) {
    if (rest.startsWith(pat.open) && rest.endsWith(pat.close)) {
      inner = rest.slice(pat.open.length, rest.length - pat.close.length);
      shape = pat.shape;
      role = pat.role;
      color = pat.color;
      matched = true;
      break;
    }
  }

  if (!matched) {
    return { rawId, declared: false };
  }

  const label = unquoteMermaidLabel(inner) || rawId;
  return { rawId, label, shape, role, color, declared: true };
}

interface ParsedEdgeMatch {
  leftSegment: string;
  dashed: boolean;
  label?: string;
  rightStart: number;
}

function findNextEdgeOperator(stmt: string, fromIndex: number): ParsedEdgeMatch | null {
  let quote: string | null = null;
  let bracketDepth = 0;

  for (let i = fromIndex; i < stmt.length; i++) {
    const ch = stmt[i];
    if (quote) {
      if (ch === quote && stmt[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '(' || ch === '{') {
      bracketDepth++;
      continue;
    }
    if (ch === ']' || ch === ')' || ch === '}') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (bracketDepth > 0) continue;

    const tail = stmt.slice(i);

    // Inline labeled edges: `-- label -->` / `-. label .->` / `== label ==>`
    const inlineMatch =
      /^(?:(--)\s+([^-\n]+?)\s+(--+>)|(-\.)\s+([^.\n]+?)\s+(\.-+>)|(==)\s+([^=\n]+?)\s+(==+>))/.exec(
        tail
      );
    if (inlineMatch) {
      const dashed = Boolean(inlineMatch[4]);
      const rawLabel = (inlineMatch[2] ?? inlineMatch[5] ?? inlineMatch[8] ?? '').trim();
      return {
        leftSegment: stmt.slice(fromIndex, i).trim(),
        dashed,
        label: rawLabel ? unquoteMermaidLabel(rawLabel) : undefined,
        rightStart: i + inlineMatch[0].length,
      };
    }

    // Standard Mermaid arrows (optionally followed by `|Label|`)
    const arrowMatch =
      /^(?:<?-+\.+->|-\.+-|<==+>|==+>|===+|<-+>|--+>|-+>|--+|o--+o|x--+x)(?:\s*\|([^|]+)\|)?/.exec(
        tail
      );
    if (arrowMatch) {
      const opText = arrowMatch[0];
      const dashed = opText.includes('.');
      const rawLabel = arrowMatch[1];
      return {
        leftSegment: stmt.slice(fromIndex, i).trim(),
        dashed,
        label: rawLabel ? unquoteMermaidLabel(rawLabel) : undefined,
        rightStart: i + opText.length,
      };
    }
  }

  return null;
}

export function isMermaidScript(raw: string): boolean {
  const cleaned = stripMarkdownFence(raw).replace(/\r\n/g, '\n');
  const lines = cleaned.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('%%')) continue;
    return MERMAID_HEADER_RE.test(t);
  }
  return false;
}

export function parseMermaidToScene(
  raw: string,
  base: LessonScene
): { scene: LessonScene; warnings: string[] } {
  const warnings: string[] = [];
  const cleaned = stripMarkdownFence(raw).replace(/\r\n/g, '\n');
  const rawLines = cleaned.split('\n');

  let title = base.title;
  let direction: 'TD' | 'TB' | 'BT' | 'RL' | 'LR' = 'TD';
  let foundHeader = false;

  for (const line of rawLines) {
    const t = line.trim();
    if (!t) continue;
    const titleComment = /^%%\s*title\s*:\s*(.+)$/i.exec(t);
    if (titleComment) {
      title = unquoteMermaidLabel(titleComment[1]);
      continue;
    }
    if (t.startsWith('%%')) continue;
    const hdr = MERMAID_HEADER_RE.exec(t);
    if (hdr) {
      foundHeader = true;
      const dirRaw = (hdr[1] ?? 'TD').toUpperCase();
      if (
        dirRaw === 'TD' ||
        dirRaw === 'TB' ||
        dirRaw === 'BT' ||
        dirRaw === 'RL' ||
        dirRaw === 'LR'
      ) {
        direction = dirRaw;
      }
      break;
    }
    break;
  }

  if (!foundHeader) {
    warnings.push('Mermaid header ("flowchart" or "graph") was not found.');
  }

  const statements = splitMermaidStatements(rawLines);
  const drafts = new Map<string, MermaidNodeDraft>();
  const draftOrder: MermaidNodeDraft[] = [];
  const connectors: ConnectorSceneNode[] = [];
  const subgraphStack: string[] = [];
  let hasSubgraphs = false;
  let colorSeq = 0;

  const ensureNode = (rawToken: string): MermaidNodeDraft | null => {
    const parsed = parseNodeToken(rawToken);
    if (!parsed) return null;

    const currentZone =
      subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined;
    let draft = drafts.get(parsed.rawId);
    if (!draft) {
      const assignedColor =
        parsed.color ??
        (draftOrder.length === 0
          ? 'yellow'
          : COLOR_ROTATION[colorSeq++ % COLOR_ROTATION.length]);
      const defaultRole: CardRole = draftOrder.length === 0 ? 'root' : 'concept';
      const labelLines = (parsed.label ?? parsed.rawId).split('\n');
      const mainLabel = labelLines[0] || parsed.rawId;
      const subLabel =
        labelLines.length > 1 ? labelLines.slice(1).join('\n') : undefined;

      draft = {
        rawId: parsed.rawId,
        nodeId: sanitizeMermaidId(parsed.rawId),
        label: mainLabel,
        subtitle: subLabel,
        role: parsed.role ?? defaultRole,
        shape: parsed.shape ?? 'rounded',
        color: assignedColor,
        zone: currentZone,
        explicitStyled: Boolean(parsed.color),
      };
      drafts.set(parsed.rawId, draft);
      draftOrder.push(draft);
    } else {
      if (parsed.declared && parsed.label) {
        const labelLines = parsed.label.split('\n');
        draft.label = labelLines[0] || draft.label;
        if (labelLines.length > 1) {
          draft.subtitle = labelLines.slice(1).join('\n');
        }
      }
      if (parsed.shape) draft.shape = parsed.shape;
      if (parsed.role) draft.role = parsed.role;
      if (parsed.color && !draft.explicitStyled) {
        draft.color = parsed.color;
        draft.explicitStyled = true;
      }
      if (!draft.zone && currentZone) {
        draft.zone = currentZone;
      }
    }
    return draft;
  };

  for (let sIdx = 0; sIdx < statements.length; sIdx++) {
    const stmt = statements[sIdx];
    if (sIdx === 0 && MERMAID_HEADER_RE.test(stmt)) continue;
    if (/^(?:classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/i.test(stmt)) {
      continue;
    }

    if (/^end$/i.test(stmt)) {
      subgraphStack.pop();
      continue;
    }

    const subMatch = SUBGRAPH_RE.exec(stmt);
    if (subMatch) {
      hasSubgraphs = true;
      const rawZoneTitle = subMatch[2] ?? subMatch[3] ?? subMatch[1] ?? 'Group';
      subgraphStack.push(unquoteMermaidLabel(rawZoneTitle) || 'Group');
      continue;
    }

    // Parse chains like `A[One] -->|go| B[Two] -.-> C` and ampersands `A & B --> C`
    const firstEdge = findNextEdgeOperator(stmt, 0);
    if (!firstEdge) {
      // Standalone node declaration or `A & B`
      for (const part of stmt.split(/\s+&\s+/)) {
        ensureNode(part);
      }
      continue;
    }

    const segments: string[] = [firstEdge.leftSegment];
    const edgesMeta: Array<{ dashed: boolean; label?: string }> = [
      { dashed: firstEdge.dashed, label: firstEdge.label },
    ];
    let cursor = firstEdge.rightStart;

    while (cursor < stmt.length) {
      const nextEdge = findNextEdgeOperator(stmt, cursor);
      if (!nextEdge) {
        segments.push(stmt.slice(cursor).trim());
        break;
      }
      segments.push(nextEdge.leftSegment);
      edgesMeta.push({ dashed: nextEdge.dashed, label: nextEdge.label });
      cursor = nextEdge.rightStart;
    }

    const segmentDraftLists: MermaidNodeDraft[][] = segments.map((seg) => {
      const items: MermaidNodeDraft[] = [];
      for (const tokenPart of seg.split(/\s+&\s+/)) {
        const d = ensureNode(tokenPart);
        if (d) items.push(d);
      }
      return items;
    });

    for (let eIdx = 0; eIdx < edgesMeta.length; eIdx++) {
      const fromList = segmentDraftLists[eIdx] ?? [];
      const toList = segmentDraftLists[eIdx + 1] ?? [];
      const meta = edgesMeta[eIdx];
      for (const fromDraft of fromList) {
        for (const toDraft of toList) {
          connectors.push(
            createConnectorNode({
              id: `mm-edge-${connectors.length + 1}`,
              fromId: fromDraft.nodeId,
              toId: toDraft.nodeId,
              label: meta.label,
              style: meta.dashed ? 'dashed' : 'solid',
              color: meta.dashed ? 'orange' : 'cyan',
            })
          );
        }
      }
    }
  }

  const cardNodes: SceneNode[] = draftOrder.map((d) =>
    createCardNode({
      id: d.nodeId,
      role: d.role,
      label: d.label,
      subtitle: d.subtitle,
      color: d.color,
      shape: d.shape,
      zone: d.zone,
    })
  );

  const chosenLayout: LayoutMode = hasSubgraphs
    ? 'concept-graph'
    : direction === 'LR' || direction === 'RL'
    ? 'flow-horizontal'
    : 'flow-vertical';

  return {
    scene: {
      ...base,
      title,
      layoutMode: chosenLayout,
      nodes: [...cardNodes, ...connectors],
    },
    warnings,
  };
}

export const mermaidScriptCodec: SceneTextCodec = {
  id: 'mermaid',
  label: 'Mermaid Flowchart',
  hintTitle: 'Native Mermaid Flowchart / Graph Import',
  hintLines: [
    'flowchart LR / flowchart TD',
    'A[Client] -->|HTTPS| B{API Gateway} -.-> C[(Database)]',
    'subgraph Core ... end',
  ],
  syntaxRules: [
    'Header line: `flowchart TD` (vertical), `flowchart LR` (horizontal), or `graph TD` / `graph LR`',
    'Node shapes: `[Rounded Label]`, `{Diamond}`, `((Circle))`, `([Pill])`, `[(Database)]`, `>Note]`',
    'Connectors: `-->`, `-.->` (dashed), `==>`, with `-->|Label|` or `-- Label -->`, plus chained edges',
    'Subgraphs: `subgraph Group Name ... end` map directly to grouped concept zones',
  ],
  example: [
    'flowchart LR',
    '  U([User]) -->|HTTPS| G{Gateway}',
    '  subgraph Backend Core',
    '    G -->|Auth| S[Service]',
    '    S -.->|Cache| R[(Redis)]',
    '  end',
  ].join('\n'),
  parse: parseMermaidToScene,
  serialize(scene) {
    const dir = scene.layoutMode === 'flow-vertical' ? 'TD' : 'LR';
    const lines = [`flowchart ${dir}`];
    if (scene.title) {
      lines.push(`  %% title: ${scene.title}`);
    }
    const idAlias = new Map<string, string>();
    let seq = 1;
    for (const node of scene.nodes) {
      if (node.type === 'connector') continue;
      const alias = `N${seq++}`;
      idAlias.set(node.id, alias);
      const label = node.name.replace(/"/g, "'");
      lines.push(`  ${alias}["${label}"]`);
    }
    for (const node of scene.nodes) {
      if (node.type !== 'connector' || !node.fromId || !node.toId) continue;
      const a = idAlias.get(node.fromId);
      const b = idAlias.get(node.toId);
      if (!a || !b) continue;
      const arrow = node.style === 'dashed' ? '-.->' : '-->';
      const lbl = node.label ? `|${node.label}|` : '';
      lines.push(`  ${a} ${arrow}${lbl} ${b}`);
    }
    return lines.join('\n');
  },
};
