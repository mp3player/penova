import {
  CardRole,
  ChalkColor,
  ConnectorSceneNode,
  CustomSceneNode,
  GroupSceneNode,
  NodeShape,
  Point,
  SceneNode,
  ShapeSceneNode,
  TextAlign,
  TextSceneNode,
  isCustomSceneNode,
  resolveCustomNodeKind,
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

export function createCustomNode(opts: {
  id: string;
  kind: string;
  name?: string;
  color?: ChalkColor;
  props?: Record<string, string | number | boolean | undefined>;
  offset?: Point;
  meta?: Record<string, string | number | boolean | undefined>;
}): CustomSceneNode {
  return {
    id: opts.id,
    type: `custom:${opts.kind}`,
    kind: opts.kind,
    name: opts.name ?? opts.kind,
    color: opts.color ?? 'white',
    props: opts.props ? { ...opts.props } : undefined,
    offset: opts.offset,
    meta: opts.meta,
  };
}

/**
 * Layer 2 Builder: constructs a classroom diagram card as a composite GroupSceneNode
 * containing optional shape + title text + optional subtitle text.
 */
export function createCardNode(opts: {
  id: string;
  label: string;
  subtitle?: string;
  role?: CardRole;
  color: ChalkColor;
  shape?: NodeShape;
  icon?: string;
  zone?: string;
  say?: string;
  pause?: number;
  offset?: Point;
  meta?: Record<string, string | number | boolean | undefined>;
}): GroupSceneNode {
  const role: CardRole = opts.role ?? 'concept';
  const shape: NodeShape = opts.shape ?? 'rounded';
  const cleanIcon = opts.icon?.trim() ? opts.icon.trim().toLowerCase() : undefined;

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

  const iconNode: CustomSceneNode | null = cleanIcon
    ? {
        id: `${opts.id}-icon`,
        type: 'custom:icon',
        kind: 'icon',
        name: cleanIcon,
        color: opts.color,
        props: {
          icon: cleanIcon,
          size: role === 'root' ? 32 : 26,
        },
      }
    : null;

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

  const shapeNode: ShapeSceneNode | null =
    shape === 'none'
      ? null
      : {
          id: `${opts.id}-frame`,
          type: 'shape',
          name: `外框 (${shape})`,
          color: opts.color,
          shape,
          fitMode: 'auto-group',
          emphasized,
        };

  const contentNodes: SceneNode[] = [
    ...(iconNode ? [iconNode] : []),
    titleNode,
    ...(subtitleNode ? [subtitleNode] : []),
  ];

  // Child order naturally determines draw order:
  // underline draws after text; enclosed frames draw before text; shape === 'none' omits frame.
  const children: SceneNode[] = !shapeNode
    ? contentNodes
    : shape === 'underline'
    ? [...contentNodes, shapeNode]
    : [shapeNode, ...contentNodes];

  return {
    id: opts.id,
    type: 'group',
    name: opts.label,
    color: opts.color,
    arrange: 'card',
    gap: 6,
    offset: opts.offset,
    meta: {
      ...(opts.meta ?? {}),
      role,
      isCard: true,
      ...(cleanIcon ? { icon: cleanIcon } : {}),
      zone: opts.zone,
      ...(opts.say !== undefined ? { say: opts.say } : {}),
      ...(opts.pause !== undefined ? { pause: opts.pause } : {}),
    },
    children,
  };
}

export function isCardGroupNode(node: SceneNode): node is GroupSceneNode {
  if (node.type !== 'group' || (node.arrange ?? 'card') !== 'card') {
    return false;
  }
  let shapeCount = 0;
  let textCount = 0;
  let iconCount = 0;
  for (const child of node.children) {
    if (child.type === 'shape') {
      shapeCount++;
    } else if (child.type === 'text') {
      textCount++;
    } else if (
      isCustomSceneNode(child) &&
      resolveCustomNodeKind(child) === 'icon'
    ) {
      iconCount++;
    } else {
      return false;
    }
  }
  return shapeCount <= 1 && iconCount <= 1 && textCount >= 1 && textCount <= 2;
}

export function updateCardGroupNode(
  group: GroupSceneNode,
  patch: Partial<CardSummary> & { offset?: Point }
): GroupSceneNode {
  const current = getCardSummary(group);
  const nextLabel = patch.label !== undefined ? patch.label : current.label;
  const nextSubtitle =
    patch.subtitle !== undefined ? patch.subtitle : current.subtitle;
  const nextRole: CardRole = patch.role ?? current.role;
  const nextColor: ChalkColor = patch.color ?? current.color;
  const nextShape: NodeShape = patch.shape ?? current.shape;
  const nextIconRaw = patch.icon !== undefined ? patch.icon : current.icon;
  const nextIcon = nextIconRaw?.trim() ? nextIconRaw.trim().toLowerCase() : undefined;
  const nextZone = patch.zone !== undefined ? patch.zone : current.zone;
  const nextSay = patch.say !== undefined ? patch.say : current.say;
  const nextPause = patch.pause !== undefined ? patch.pause : current.pause;

  const titleFontSize =
    nextRole === 'root'
      ? 25
      : nextRole === 'highlight'
      ? 21
      : nextRole === 'note'
      ? 18
      : 20;
  const subtitleFontSize = nextRole === 'root' ? 14.5 : 13.5;

  const maxWidth =
    nextShape === 'circle'
      ? 162
      : nextShape === 'diamond'
      ? 168
      : nextRole === 'root'
      ? 230
      : 210;

  const emphasized = nextRole === 'root' || nextRole === 'highlight';

  const existingShape = group.children.find(
    (c): c is ShapeSceneNode => c.type === 'shape'
  );
  const existingIcon = group.children.find(
    (c): c is CustomSceneNode => isCustomSceneNode(c) && resolveCustomNodeKind(c) === 'icon'
  );
  const existingTexts = group.children.filter(
    (c): c is TextSceneNode => c.type === 'text'
  );
  const existingTitle = existingTexts[0];
  const existingSub = existingTexts[1];

  const iconNode: CustomSceneNode | null = nextIcon
    ? {
        ...(existingIcon ?? {}),
        id: existingIcon?.id ?? `${group.id}-icon`,
        type: 'custom:icon',
        kind: 'icon',
        name: nextIcon,
        color: nextColor,
        props: {
          icon: nextIcon,
          size: nextRole === 'root' ? 32 : 26,
        },
      }
    : null;

  const titleNode: TextSceneNode = {
    ...(existingTitle ?? {}),
    id: existingTitle?.id ?? `${group.id}-title`,
    type: 'text',
    name: nextLabel || '标题文字',
    color: nextColor,
    text: nextLabel,
    fontSize: titleFontSize,
    fontWeight: 700,
    maxWidth,
    align: 'center',
  };

  const trimmedSub = nextSubtitle?.trim() ? nextSubtitle : undefined;
  const subtitleNode: TextSceneNode | null = trimmedSub
    ? {
        ...(existingSub ?? {}),
        id: existingSub?.id ?? `${group.id}-sub`,
        type: 'text',
        name: '副标题',
        color: 'white',
        text: trimmedSub,
        fontSize: subtitleFontSize,
        fontWeight: 400,
        maxWidth: maxWidth + 18,
        align: 'center',
      }
    : null;

  const shapeNode: ShapeSceneNode | null =
    nextShape === 'none'
      ? null
      : {
          ...(existingShape ?? {}),
          id: existingShape?.id ?? `${group.id}-frame`,
          type: 'shape',
          name: `外框 (${nextShape})`,
          color: nextColor,
          shape: nextShape,
          fitMode: 'auto-group',
          emphasized,
        };

  const contentNodes: SceneNode[] = [
    ...(iconNode ? [iconNode] : []),
    titleNode,
    ...(subtitleNode ? [subtitleNode] : []),
  ];

  const children: SceneNode[] = !shapeNode
    ? contentNodes
    : nextShape === 'underline'
    ? [...contentNodes, shapeNode]
    : [shapeNode, ...contentNodes];

  const nextMeta: Record<string, string | number | boolean | undefined> = {
    ...(group.meta ?? {}),
    role: nextRole,
    isCard: true,
    icon: nextIcon,
    zone: nextZone || undefined,
    say: nextSay || undefined,
    pause:
      nextPause !== undefined && Number.isFinite(nextPause) && nextPause >= 0
        ? Math.round(nextPause)
        : undefined,
  };

  return {
    ...group,
    name: nextLabel,
    color: nextColor,
    arrange: 'card',
    gap: group.gap ?? 6,
    offset: patch.offset !== undefined ? patch.offset : group.offset,
    meta: nextMeta,
    children,
  };
}

export interface CardSummary {
  label: string;
  subtitle?: string;
  role: CardRole;
  color: ChalkColor;
  shape: NodeShape;
  icon?: string;
  zone?: string;
  say?: string;
  pause?: number;
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
  const iconFromMeta =
    typeof node.meta?.icon === 'string' && node.meta.icon.trim()
      ? node.meta.icon.trim()
      : undefined;
  const say =
    typeof node.meta?.say === 'string' && node.meta.say.trim()
      ? node.meta.say.trim()
      : undefined;
  const pause =
    typeof node.meta?.pause === 'number' &&
    Number.isFinite(node.meta.pause) &&
    node.meta.pause >= 0
      ? node.meta.pause
      : undefined;

  if (node.type === 'group') {
    const texts = node.children.filter(
      (c): c is TextSceneNode => c.type === 'text'
    );
    const frame = node.children.find(
      (c): c is ShapeSceneNode => c.type === 'shape'
    );
    const iconChild = node.children.find(
      (c): c is CustomSceneNode => isCustomSceneNode(c) && resolveCustomNodeKind(c) === 'icon'
    );
    const icon =
      (typeof iconChild?.props?.icon === 'string' && iconChild.props.icon.trim()
        ? iconChild.props.icon.trim()
        : undefined) ?? iconFromMeta;
    const titleText = texts[0]?.text ?? node.name;
    const subText = texts[1]?.text;
    return {
      label: titleText,
      subtitle: subText,
      role,
      color: texts[0]?.color ?? node.color,
      shape: frame?.shape ?? 'none',
      icon,
      zone,
      say,
      pause,
    };
  }

  if (node.type === 'text') {
    return {
      label: node.text,
      role,
      color: node.color,
      shape: 'none',
      zone,
      say,
      pause,
    };
  }

  if (node.type === 'shape') {
    return {
      label: node.name,
      role,
      color: node.color,
      shape: node.shape,
      zone,
      say,
      pause,
    };
  }

  if (isCustomSceneNode(node)) {
    return {
      label: node.name,
      role,
      color: node.color,
      shape: 'none',
      zone,
      say,
      pause,
    };
  }

  return {
    label: node.name,
    role,
    color: node.color,
    shape: 'rounded',
    zone,
    say,
    pause,
  };
}
