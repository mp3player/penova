export type BuiltinThemeId = 'chalkboard' | 'whiteboard' | 'blueprint' | 'letter-paper';
export type ThemeId = BuiltinThemeId | (string & {});

export type BuiltinLayoutMode =
  | 'flow-horizontal'
  | 'flow-vertical'
  | 'mindmap'
  | 'concept-graph'
  | 'document'
  | 'freeform';
export type LayoutMode = BuiltinLayoutMode | (string & {});

export type BuiltinCameraMode =
  | 'auto-follow'
  | 'progressive-fit'
  | 'static-overview'
  | 'pen-follow';
export type CameraMode = BuiltinCameraMode | (string & {});

export type AspectRatio = '16:9' | '9:16';

export type BuiltinHandStyle =
  | 'hand-chalk'
  | 'hand-minimal'
  | 'tip-only'
  | 'hidden';
export type HandStyle = BuiltinHandStyle | (string & {});

export type ChalkColor = 'white' | 'yellow' | 'cyan' | 'pink' | 'green' | 'orange';

export type BuiltinNodeShape =
  | 'rounded'
  | 'circle'
  | 'cloud'
  | 'underline'
  | 'diamond'
  | 'divider'
  | 'none';
export type NodeShape = BuiltinNodeShape | (string & {});

export type TextAlign = 'left' | 'center' | 'right';
export type BuiltinSceneNodeType = 'text' | 'shape' | 'connector' | 'group';
export type CustomSceneNodeType = 'custom' | `custom:${string}`;
export type SceneNodeType = BuiltinSceneNodeType | CustomSceneNodeType;
export type CardRole = 'root' | 'step' | 'concept' | 'highlight' | 'note';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseSceneNode {
  id: string;
  name: string;
  color: ChalkColor;
  visible?: boolean;
  offset?: Point;
  meta?: Record<string, string | number | boolean | undefined>;
}

export interface TextSceneNode extends BaseSceneNode {
  type: 'text';
  text: string;
  fontSize?: number;
  fontWeight?: 400 | 700;
  maxWidth?: number;
  align?: TextAlign;
  indentChars?: number;
}

export interface ShapeSceneNode extends BaseSceneNode {
  type: 'shape';
  shape: NodeShape;
  width?: number;
  height?: number;
  fitMode?: 'auto-group' | 'fixed';
  emphasized?: boolean;
  dashed?: boolean;
}

export interface ConnectorSceneNode extends BaseSceneNode {
  type: 'connector';
  fromId?: string;
  toId?: string;
  fromPoint?: Point;
  toPoint?: Point;
  label?: string;
  style?: 'solid' | 'dashed';
}

export interface GroupSceneNode extends BaseSceneNode {
  type: 'group';
  children: SceneNode[];
  arrange?: 'card' | 'stack' | 'free';
  gap?: number;
}

export interface CustomSceneNode extends BaseSceneNode {
  type: CustomSceneNodeType;
  kind: string;
  props?: Record<string, string | number | boolean | undefined>;
}

export type SceneNode =
  | TextSceneNode
  | ShapeSceneNode
  | ConnectorSceneNode
  | GroupSceneNode
  | CustomSceneNode;

export function isCustomSceneNode(node: SceneNode): node is CustomSceneNode {
  return (
    node.type !== 'text' &&
    node.type !== 'shape' &&
    node.type !== 'connector' &&
    node.type !== 'group'
  );
}

export function resolveCustomNodeKind(node: CustomSceneNode): string {
  if (node.kind && node.kind.trim()) return node.kind.trim();
  return node.type.startsWith('custom:')
    ? node.type.slice('custom:'.length)
    : node.type;
}

export interface TeachingStep {
  id: string;
  title: string;
  nodeIds: string[];
  pauseMs?: number;
}

export type BuiltinTransitionId =
  | 'chalkboard-eraser'
  | 'page-turn'
  | 'crossfade'
  | 'cut';
export type TransitionId = BuiltinTransitionId | (string & {});

export interface SceneTransitionConfig {
  type: TransitionId;
  durationMs?: number;
}

export interface LessonScene {
  id: string;
  title: string;
  theme: ThemeId;
  layoutMode: LayoutMode;
  cameraMode: CameraMode;
  aspectRatio: AspectRatio;
  handStyle: HandStyle;
  nodes: SceneNode[];
  customSteps?: TeachingStep[];
  transitionOut?: SceneTransitionConfig;
}

export function cloneSceneNode(node: SceneNode): SceneNode {
  const baseCopy = {
    ...node,
    offset: node.offset ? { ...node.offset } : undefined,
    meta: node.meta ? { ...node.meta } : undefined,
  };
  if (baseCopy.type === 'group') {
    return {
      ...baseCopy,
      children: baseCopy.children.map(cloneSceneNode),
    };
  }
  if (baseCopy.type === 'connector') {
    return {
      ...baseCopy,
      fromPoint: baseCopy.fromPoint ? { ...baseCopy.fromPoint } : undefined,
      toPoint: baseCopy.toPoint ? { ...baseCopy.toPoint } : undefined,
    };
  }
  if (isCustomSceneNode(baseCopy)) {
    return {
      ...baseCopy,
      props: baseCopy.props ? { ...baseCopy.props } : undefined,
    };
  }
  return baseCopy;
}

export function findNodeById(
  nodes: SceneNode[],
  id: string
): SceneNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'group') {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function collectSubtreeIds(node: SceneNode, target: Set<string>): void {
  target.add(node.id);
  if (node.type === 'group') {
    for (const child of node.children) {
      collectSubtreeIds(child, target);
    }
  }
}

export function updateNodeInTree(
  nodes: SceneNode[],
  id: string,
  updater: (node: SceneNode) => SceneNode
): SceneNode[] {
  let changed = false;
  const next = nodes.map((node) => {
    if (node.id === id) {
      changed = true;
      return updater(node);
    }
    if (node.type === 'group') {
      const nextChildren = updateNodeInTree(node.children, id, updater);
      if (nextChildren !== node.children) {
        changed = true;
        if ((node.arrange ?? 'card') === 'card') {
          const prevTitle = node.children.find(
            (c): c is TextSceneNode => c.type === 'text'
          );
          const nextTitle = nextChildren.find(
            (c): c is TextSceneNode => c.type === 'text'
          );
          if (nextTitle) {
            const nameChanged =
              prevTitle?.text !== nextTitle.text ? nextTitle.text : node.name;
            const colorChanged =
              prevTitle?.color !== nextTitle.color &&
              node.color === prevTitle?.color;
            const syncedColor = colorChanged ? nextTitle.color : node.color;
            const syncedChildren = colorChanged
              ? nextChildren.map((child) =>
                  child.type === 'shape' &&
                  (child.fitMode ?? 'auto-group') === 'auto-group'
                    ? { ...child, color: syncedColor }
                    : child
                )
              : nextChildren;
            return {
              ...node,
              name: nameChanged,
              color: syncedColor,
              children: syncedChildren,
            };
          }
        }
        return { ...node, children: nextChildren };
      }
    }
    return node;
  });
  return changed ? next : nodes;
}

function removeNodeWithSet(
  nodes: SceneNode[],
  removedIds: Set<string>
): SceneNode[] {
  const filtered: SceneNode[] = [];
  for (const node of nodes) {
    if (removedIds.has(node.id)) continue;
    if (
      node.type === 'connector' &&
      ((node.fromId && removedIds.has(node.fromId)) ||
        (node.toId && removedIds.has(node.toId)))
    ) {
      continue;
    }
    if (node.type === 'group') {
      filtered.push({
        ...node,
        children: removeNodeWithSet(node.children, removedIds),
      });
    } else {
      filtered.push(node);
    }
  }
  return filtered;
}

export function removeNodeInTree(nodes: SceneNode[], id: string): SceneNode[] {
  const removedIds = new Set<string>();
  const target = findNodeById(nodes, id);
  if (target) {
    collectSubtreeIds(target, removedIds);
  } else {
    removedIds.add(id);
  }
  return removeNodeWithSet(nodes, removedIds);
}

export function moveNodeInTree(
  nodes: SceneNode[],
  id: string,
  delta: -1 | 1
): SceneNode[] {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx !== -1) {
    const target = idx + delta;
    if (target < 0 || target >= nodes.length) return nodes;
    const copy = [...nodes];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    return copy;
  }

  let changed = false;
  const next = nodes.map((node) => {
    if (node.type === 'group') {
      const nextChildren = moveNodeInTree(node.children, id, delta);
      if (nextChildren !== node.children) {
        changed = true;
        return { ...node, children: nextChildren };
      }
    }
    return node;
  });
  return changed ? next : nodes;
}

export function addChildToGroup(
  nodes: SceneNode[],
  groupId: string,
  child: SceneNode
): SceneNode[] {
  return updateNodeInTree(nodes, groupId, (node) => {
    if (node.type !== 'group') return node;
    return {
      ...node,
      children: [...node.children, child],
    };
  });
}

export function hasAnyOffset(nodes: SceneNode[]): boolean {
  for (const n of nodes) {
    if ((n.offset?.x ?? 0) !== 0 || (n.offset?.y ?? 0) !== 0) return true;
    if (n.type === 'group' && hasAnyOffset(n.children)) return true;
  }
  return false;
}

export function clearAllOffsets(nodes: SceneNode[]): SceneNode[] {
  return nodes.map((n) => {
    if (n.type === 'group') {
      return {
        ...n,
        offset: undefined,
        children: clearAllOffsets(n.children),
      };
    }
    return { ...n, offset: undefined };
  });
}

/**
 * Derive classroom teaching order from unified SceneNode[] graph:
 * starts from root / zero-in-degree vertices, advancing via BFS + topological readiness
 * so each new step draws incoming bound connectors together with the newly revealed node.
 */
export function deriveTeachingSteps(scene: LessonScene): TeachingStep[] {
  if (scene.customSteps && scene.customSteps.length > 0) {
    return scene.customSteps;
  }

  const allVertexCandidates = scene.nodes.filter((n) => n.type !== 'connector');
  const ownerTopId = new Map<string, string>();
  const registerTopOwner = (node: SceneNode, topId: string) => {
    ownerTopId.set(node.id, topId);
    if (node.type === 'group') {
      for (const child of node.children) {
        if (child.type !== 'connector') {
          registerTopOwner(child, topId);
        }
      }
    }
  };
  for (const v of allVertexCandidates) {
    registerTopOwner(v, v.id);
  }

  const isBoundConnector = (n: SceneNode): n is ConnectorSceneNode =>
    n.type === 'connector' &&
    Boolean(n.fromId && n.toId) &&
    n.fromId !== n.toId &&
    ownerTopId.has(n.fromId!) &&
    ownerTopId.has(n.toId!);

  const boundConnectors = scene.nodes.filter(isBoundConnector);
  const vertices = scene.nodes.filter((n) => !isBoundConnector(n));

  const nodeMap = new Map<string, SceneNode>();
  const orderIndex = new Map<string, number>();
  vertices.forEach((node, idx) => {
    nodeMap.set(node.id, node);
    orderIndex.set(node.id, idx);
  });

  const outgoing = new Map<string, ConnectorSceneNode[]>();
  const incoming = new Map<string, ConnectorSceneNode[]>();
  const selfConnectors = new Map<string, ConnectorSceneNode[]>();
  const inDegree = new Map<string, number>();

  for (const node of vertices) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
    selfConnectors.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const conn of boundConnectors) {
    const topFrom = ownerTopId.get(conn.fromId!)!;
    const topTo = ownerTopId.get(conn.toId!)!;
    if (topFrom === topTo) {
      selfConnectors.get(topFrom)?.push(conn);
    } else {
      outgoing.get(topFrom)?.push(conn);
      incoming.get(topTo)?.push(conn);
      inDegree.set(topTo, (inDegree.get(topTo) ?? 0) + 1);
    }
  }

  const visited = new Set<string>();
  const placedConnectors = new Set<string>();
  const steps: TeachingStep[] = [];

  const roots = vertices.filter((n) => n.meta?.role === 'root');
  const zeroIn = vertices.filter(
    (n) => n.meta?.role !== 'root' && (inDegree.get(n.id) ?? 0) === 0
  );
  const queue: string[] = [...roots.map((n) => n.id), ...zeroIn.map((n) => n.id)];

  if (queue.length === 0 && vertices.length > 0) {
    queue.push(vertices[0].id);
  }

  const emitVertexStep = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = nodeMap.get(nodeId)!;
    const stepConnIds: string[] = [];

    for (const conn of incoming.get(nodeId) ?? []) {
      const topFrom = ownerTopId.get(conn.fromId!)!;
      if (visited.has(topFrom) && !placedConnectors.has(conn.id)) {
        placedConnectors.add(conn.id);
        stepConnIds.push(conn.id);
      }
    }

    for (const conn of outgoing.get(nodeId) ?? []) {
      const topTo = ownerTopId.get(conn.toId!)!;
      if (visited.has(topTo) && !placedConnectors.has(conn.id)) {
        placedConnectors.add(conn.id);
        stepConnIds.push(conn.id);
      }
    }

    for (const conn of selfConnectors.get(nodeId) ?? []) {
      if (!placedConnectors.has(conn.id)) {
        placedConnectors.add(conn.id);
        stepConnIds.push(conn.id);
      }
    }

    const rawPause = node.meta?.pause;
    const pauseMs =
      typeof rawPause === 'number' && Number.isFinite(rawPause) && rawPause >= 0
        ? Math.round(rawPause)
        : undefined;

    steps.push({
      id: `step-${steps.length + 1}-${node.id}`,
      title: node.name || '节点',
      nodeIds: [...stepConnIds, node.id],
      ...(pauseMs !== undefined ? { pauseMs } : {}),
    });

    const nextNeighbors = (outgoing.get(nodeId) ?? [])
      .map((c) => ownerTopId.get(c.toId!)!)
      .filter((id) => !visited.has(id))
      .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));

    for (const nextId of nextNeighbors) {
      if (!queue.includes(nextId)) {
        queue.push(nextId);
      }
    }
  };

  while (visited.size < vertices.length) {
    if (queue.length === 0) {
      const nextUnvisited = vertices.find((n) => !visited.has(n.id));
      if (!nextUnvisited) break;
      queue.push(nextUnvisited.id);
    }

    let pickIdx = queue.findIndex((id) => {
      if (visited.has(id)) return false;
      const preds = incoming.get(id) ?? [];
      return preds.every((c) => visited.has(ownerTopId.get(c.fromId!)!));
    });

    if (pickIdx === -1) {
      pickIdx = queue.findIndex((id) => !visited.has(id));
    }

    if (pickIdx === -1) {
      queue.length = 0;
      continue;
    }

    const [pickedId] = queue.splice(pickIdx, 1);
    emitVertexStep(pickedId);
  }

  const leftoverConnectors = boundConnectors.filter(
    (c) => !placedConnectors.has(c.id)
  );
  if (leftoverConnectors.length > 0) {
    if (steps.length > 0) {
      const last = steps[steps.length - 1];
      last.nodeIds = [...last.nodeIds, ...leftoverConnectors.map((c) => c.id)];
    } else {
      steps.push({
        id: 'step-connectors',
        title: '关联连线',
        nodeIds: leftoverConnectors.map((c) => c.id),
      });
    }
  }

  return steps;
}
