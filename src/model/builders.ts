import {
  CardRole,
  ChalkColor,
  ConnectorSceneNode,
  GroupSceneNode,
  NodeShape,
  Point,
  SceneNode,
  ShapeSceneNode,
  TextAlign,
  TextSceneNode,
} from './scene';

export function createTextNode(opts: {
  id: string;
  text: string;
  name?: string;
  color?: ChalkColor;
  fontSize?: number;
  fontWeight?: 400 | 700;
  maxWidth?: number;
  align?: TextAlign;
  indentChars?: number;
  offset?: Point;
  meta?: Record<string, string | number | boolean | undefined>;
}): TextSceneNode {
  return {
    id: opts.id,
    type: 'text',
    name: opts.name ?? (opts.text.trim().slice(0, 18) || '文本'),
    color: opts.color ?? 'white',
    text: opts.text,
    fontSize: opts.fontSize,
    fontWeight: opts.fontWeight,
    maxWidth: opts.maxWidth,
    align: opts.align,
    indentChars: opts.indentChars,
    offset: opts.offset,
    meta: opts.meta,
  };
}

export function createShapeNode(opts: {
  id: string;
  shape: NodeShape;
  name?: string;
  color?: ChalkColor;
  width?: number;
  height?: number;
  fitMode?: 'auto-group' | 'fixed';
  emphasized?: boolean;
  dashed?: boolean;
  offset?: Point;
}): ShapeSceneNode {
  return {
    id: opts.id,
    type: 'shape',
    name: opts.name ?? `图形 (${opts.shape})`,
    color: opts.color ?? 'white',
    shape: opts.shape,
    width: opts.width,
    height: opts.height,
    fitMode: opts.fitMode ?? 'fixed',
    emphasized: opts.emphasized,
    dashed: opts.dashed,
    offset: opts.offset,
  };
}

export function createConnectorNode(opts: {
  id: string;
  fromId?: string;
  toId?: string;
  fromPoint?: Point;
  toPoint?: Point;
  label?: string;
  style?: 'solid' | 'dashed';
  color?: ChalkColor;
  name?: string;
}): ConnectorSceneNode {
  return {
    id: opts.id,
    type: 'connector',
    name:
      opts.name ??
      (opts.label ? `连线 · ${opts.label}` : '连线箭头'),
    color: opts.color ?? 'white',
    fromId: opts.fromId,
    toId: opts.toId,
    fromPoint: opts.fromPoint,
    toPoint: opts.toPoint,
    label: opts.label,
    style: opts.style ?? 'solid',
  };
}

/**
 * Layer 2 Builder: constructs a classroom diagram card as a composite GroupSceneNode
 * containing shape + title text + optional subtitle text.
 */
export function createCardNode(opts: {
  id: string;
  label: string;
  subtitle?: string;
  role?: CardRole;
  color: ChalkColor;
  shape?: NodeShape;
  zone?: string;
  offset?: Point;
}): GroupSceneNode {
  const role: CardRole = opts.role ?? 'concept';
  const shape: NodeShape = opts.shape ?? 'rounded';

  const titleFontSize =
    role === 'root'
      ? 25
      : role === 'highlight'
      ? 21
      : role === 'note'
      ? 18
      : 20;
  const subtitleFontSize = role === 'root' ? 14.5 : 13.5;

  const maxWidth =
    shape === 'circle'
      ? 162
      : shape === 'diamond'
      ? 168
      : role === 'root'
      ? 230
      : 210;

  const emphasized = role === 'root' || role === 'highlight';

  const titleNode: TextSceneNode = {
    id: `${opts.id}-title`,
    type: 'text',
    name: opts.label || '标题文字',
    color: opts.color,
    text: opts.label,
    fontSize: titleFontSize,
    fontWeight: 700,
    maxWidth,
    align: 'center',
  };

  const subtitleNode: TextSceneNode | null = opts.subtitle
    ? {
        id: `${opts.id}-sub`,
        type: 'text',
        name: '副标题',
        color: 'white',
        text: opts.subtitle,
        fontSize: subtitleFontSize,
        fontWeight: 400,
        maxWidth: maxWidth + 18,
        align: 'center',
      }
    : null;

  const shapeNode: ShapeSceneNode = {
    id: `${opts.id}-frame`,
    type: 'shape',
    name: `外框 (${shape})`,
    color: opts.color,
    shape,
    fitMode: 'auto-group',
    emphasized,
  };

  // Child order naturally determines draw order:
  // underline draws after text; enclosed frames draw before text.
  const children: SceneNode[] =
    shape === 'underline'
      ? [titleNode, ...(subtitleNode ? [subtitleNode] : []), shapeNode]
      : [shapeNode, titleNode, ...(subtitleNode ? [subtitleNode] : [])];

  return {
    id: opts.id,
    type: 'group',
    name: opts.label,
    color: opts.color,
    arrange: 'card',
    gap: 6,
    offset: opts.offset,
    meta: {
      role,
      zone: opts.zone,
    },
    children,
  };
}

export interface CardSummary {
  label: string;
  subtitle?: string;
  role: CardRole;
  color: ChalkColor;
  shape: NodeShape;
  zone?: string;
}

export function getCardSummary(node: SceneNode): CardSummary {
  const roleRaw = node.meta?.role;
  const role: CardRole =
    roleRaw === 'root' ||
    roleRaw === 'step' ||
    roleRaw === 'concept' ||
    roleRaw === 'highlight' ||
    roleRaw === 'note'
      ? roleRaw
      : 'concept';
  const zone =
    typeof node.meta?.zone === 'string' && node.meta.zone.trim()
      ? node.meta.zone
      : undefined;

  if (node.type === 'group') {
    const texts = node.children.filter(
      (c): c is TextSceneNode => c.type === 'text'
    );
    const frame = node.children.find(
      (c): c is ShapeSceneNode => c.type === 'shape'
    );
    const titleText = texts[0]?.text ?? node.name;
    const subText = texts[1]?.text;
    return {
      label: titleText,
      subtitle: subText,
      role,
      color: texts[0]?.color ?? node.color,
      shape: frame?.shape ?? 'rounded',
      zone,
    };
  }

  if (node.type === 'text') {
    return {
      label: node.text,
      role,
      color: node.color,
      shape: 'rounded',
      zone,
    };
  }

  if (node.type === 'shape') {
    return {
      label: node.name,
      role,
      color: node.color,
      shape: node.shape,
      zone,
    };
  }

  return {
    label: node.name,
    role,
    color: node.color,
    shape: 'rounded',
    zone,
  };
}
