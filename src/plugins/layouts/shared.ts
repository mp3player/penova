import {
  ConnectorSceneNode,
  Point,
  Rect,
  SceneNode,
} from '../../model/scene';
import {
  ComputedLayout,
  GroupBox,
  LayoutHelpers,
  MeasuredSceneNode,
  PositionedSceneNode,
} from '../contracts';
import { sceneNodeRegistry, shapeRegistry } from '../registry';
import { clipRayToRect } from '../shapes/clipHelpers';

export interface SplitSceneNodes {
  vertices: SceneNode[];
  ownerVertexIdMap: Map<string, string>;
  boundConnectors: ConnectorSceneNode[];
  unboundConnectors: ConnectorSceneNode[];
}

export function splitSceneNodes(nodes: SceneNode[]): SplitSceneNodes {
  const vertices = nodes.filter((n) => n.type !== 'connector');
  const ownerVertexIdMap = new Map<string, string>();
  const registerOwner = (node: SceneNode, topId: string) => {
    ownerVertexIdMap.set(node.id, topId);
    if (node.type === 'group') {
      for (const child of node.children) {
        if (child.type !== 'connector') {
          registerOwner(child, topId);
        }
      }
    }
  };
  for (const v of vertices) {
    registerOwner(v, v.id);
  }

  const boundConnectors: ConnectorSceneNode[] = [];
  const unboundConnectors: ConnectorSceneNode[] = [];

  for (const n of nodes) {
    if (n.type !== 'connector') continue;
    if (
      n.fromId &&
      n.toId &&
      n.fromId !== n.toId &&
      ownerVertexIdMap.has(n.fromId) &&
      ownerVertexIdMap.has(n.toId)
    ) {
      boundConnectors.push(n);
    } else {
      unboundConnectors.push(n);
    }
  }

  return { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors };
}

export function makePositionedNode(
  node: SceneNode,
  cx: number,
  cy: number,
  measured: MeasuredSceneNode,
  helpers: LayoutHelpers
): PositionedSceneNode {
  const finalCx = cx + (node.offset?.x ?? 0);
  const finalCy = cy + (node.offset?.y ?? 0);

  let children: PositionedSceneNode[] | undefined;
  if (node.type === 'group' && measured.type === 'group') {
    children = helpers.positionGroupChildren(node, finalCx, finalCy, measured);
  } else if (
    measured.type === 'custom' &&
    measured.composedNode &&
    measured.composedMeasured
  ) {
    if (
      measured.composedNode.type === 'group' &&
      measured.composedMeasured.type === 'group'
    ) {
      children = helpers.positionGroupChildren(
        measured.composedNode,
        finalCx,
        finalCy,
        measured.composedMeasured
      );
    } else {
      children = [
        makePositionedNode(
          measured.composedNode,
          finalCx,
          finalCy,
          measured.composedMeasured,
          helpers
        ),
      ];
    }
  }

  return {
    id: node.id,
    node,
    cx: finalCx,
    cy: finalCy,
    width: measured.width,
    height: measured.height,
    measured,
    children,
  };
}

/**
 * Ray-clip from a node's center toward an external target point via ShapePlugin or SceneNodePlugin.
 */
export function clipPointToNodeBorder(
  pNode: PositionedSceneNode,
  toward: Point,
  extraMargin = 4
): Point {
  if (pNode.node.type === 'shape') {
    return shapeRegistry
      .getOrDefault(pNode.node.shape)
      .clipRay(
        pNode.cx,
        pNode.cy,
        pNode.width,
        pNode.height,
        toward,
        extraMargin
      );
  }
  if (pNode.measured.type === 'group' && pNode.measured.primaryShape) {
    return shapeRegistry
      .getOrDefault(pNode.measured.primaryShape)
      .clipRay(
        pNode.cx,
        pNode.cy,
        pNode.width,
        pNode.height,
        toward,
        extraMargin
      );
  }
  if (pNode.measured.type === 'custom') {
    const plugin = sceneNodeRegistry.get(pNode.measured.kind);
    if (plugin?.clipRay) {
      return plugin.clipRay(pNode, toward, extraMargin);
    }
    if (
      pNode.measured.composedMeasured?.type === 'group' &&
      pNode.measured.composedMeasured.primaryShape
    ) {
      return shapeRegistry
        .getOrDefault(pNode.measured.composedMeasured.primaryShape)
        .clipRay(
          pNode.cx,
          pNode.cy,
          pNode.width,
          pNode.height,
          toward,
          extraMargin
        );
    }
  }
  return clipRayToRect(
    pNode.cx,
    pNode.cy,
    pNode.width,
    pNode.height,
    toward,
    extraMargin
  );
}

export function sampleQuadraticBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  segments = 18
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return pts;
}

export function sampleCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments = 20
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    pts.push({
      x:
        mt2 * mt * p0.x +
        3 * mt2 * t * p1.x +
        3 * mt * t2 * p2.x +
        t2 * t * p3.x,
      y:
        mt2 * mt * p0.y +
        3 * mt2 * t * p1.y +
        3 * mt * t2 * p2.y +
        t2 * t * p3.y,
    });
  }
  return pts;
}

export function midpointOnPolyline(points: Point[]): Point | undefined {
  if (points.length === 0) return undefined;
  if (points.length === 1) return points[0];

  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
    lengths.push(total);
  }
  if (total < 1e-3) return points[0];

  const target = total * 0.5;
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= target) {
      const segLen = lengths[i] - lengths[i - 1];
      const frac = segLen > 1e-4 ? (target - lengths[i - 1]) / segLen : 0;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * frac,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * frac,
      };
    }
  }
  return points[Math.floor(points.length / 2)];
}

export function createPositionedConnectorFromPoints(
  conn: ConnectorSceneNode,
  points: Point[]
): PositionedSceneNode {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  return {
    id: conn.id,
    node: conn,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: Math.max(12, maxX - minX),
    height: Math.max(12, maxY - minY),
    measured: { type: 'connector', width: 0, height: 0 },
    routedPoints: points,
    labelPoint: conn.label ? midpointOnPolyline(points) : undefined,
  };
}

export function buildConnectorNode(
  conn: ConnectorSceneNode,
  nodeMap: Map<string, PositionedSceneNode>,
  bowOffset = 0
): PositionedSceneNode {
  const fromNode = conn.fromId ? nodeMap.get(conn.fromId) : undefined;
  const toNode = conn.toId ? nodeMap.get(conn.toId) : undefined;

  if (fromNode && toNode) {
    const dx = toNode.cx - fromNode.cx;
    const dy = toNode.cy - fromNode.cy;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;

    const mid = {
      x: (fromNode.cx + toNode.cx) / 2 + nx * bowOffset,
      y: (fromNode.cy + toNode.cy) / 2 + ny * bowOffset,
    };

    const start = clipPointToNodeBorder(fromNode, mid, 5);
    const end = clipPointToNodeBorder(toNode, mid, 6);

    const ctrl = {
      x: (start.x + end.x) / 2 + nx * bowOffset * 0.85,
      y: (start.y + end.y) / 2 + ny * bowOffset * 0.85,
    };

    const points = sampleQuadraticBezier(start, ctrl, end, 18);
    return createPositionedConnectorFromPoints(conn, points);
  }

  // Unbound / standalone coordinate arrow
  const ox = conn.offset?.x ?? 0;
  const oy = conn.offset?.y ?? 0;
  const startPt = {
    x: (conn.fromPoint?.x ?? -90) + ox,
    y: (conn.fromPoint?.y ?? 0) + oy,
  };
  const endPt = {
    x: (conn.toPoint?.x ?? 90) + ox,
    y: (conn.toPoint?.y ?? 0) + oy,
  };
  const ctrl = {
    x: (startPt.x + endPt.x) / 2,
    y: (startPt.y + endPt.y) / 2,
  };
  const points = sampleQuadraticBezier(startPt, ctrl, endPt, 14);
  return createPositionedConnectorFromPoints(conn, points);
}

export function computeConnectorBowMap(
  connectors: ConnectorSceneNode[]
): Map<string, number> {
  const pairGroups = new Map<string, ConnectorSceneNode[]>();
  for (const conn of connectors) {
    if (!conn.fromId || !conn.toId) continue;
    const a = conn.fromId < conn.toId ? conn.fromId : conn.toId;
    const b = conn.fromId < conn.toId ? conn.toId : conn.fromId;
    const key = `${a}__${b}`;
    const list = pairGroups.get(key) ?? [];
    list.push(conn);
    pairGroups.set(key, list);
  }

  const bowMap = new Map<string, number>();
  for (const list of pairGroups.values()) {
    if (list.length === 1) {
      const c = list[0];
      bowMap.set(c.id, c.style === 'dashed' ? -36 : 0);
    } else {
      const step = 42;
      list.forEach((c, idx) => {
        const offsetIndex = idx - (list.length - 1) / 2;
        const dirSign = c.fromId! < c.toId! ? 1 : -1;
        bowMap.set(c.id, offsetIndex * step * dirSign);
      });
    }
  }
  return bowMap;
}

export function computeBounds(
  nodes: PositionedSceneNode[],
  zones: GroupBox[]
): Rect {
  if (nodes.length === 0 && zones.length === 0) {
    return { x: -400, y: -225, width: 800, height: 450 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visitNode = (n: PositionedSceneNode) => {
    if (n.routedPoints && n.routedPoints.length > 0) {
      for (const pt of n.routedPoints) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    } else {
      minX = Math.min(minX, n.cx - n.width / 2);
      minY = Math.min(minY, n.cy - n.height / 2);
      maxX = Math.max(maxX, n.cx + n.width / 2);
      maxY = Math.max(maxY, n.cy + n.height / 2);
    }
    if (n.children && n.children.length > 0) {
      for (const child of n.children) {
        visitNode(child);
      }
    }
  };

  for (const n of nodes) {
    visitNode(n);
  }

  for (const g of zones) {
    minX = Math.min(minX, g.x);
    minY = Math.min(minY, g.y);
    maxX = Math.max(maxX, g.x + g.width);
    maxY = Math.max(maxY, g.y + g.height);
  }

  if (!Number.isFinite(minX)) {
    return { x: -400, y: -225, width: 800, height: 450 };
  }

  const margin = 48;
  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}

export function indexNodesRecursively(
  nodes: PositionedSceneNode[],
  nodeMap: Map<string, PositionedSceneNode>
): void {
  for (const n of nodes) {
    nodeMap.set(n.id, n);
    if (n.children && n.children.length > 0) {
      indexNodesRecursively(n.children, nodeMap);
    }
  }
}

export function finalizeLayout(
  nodes: PositionedSceneNode[],
  zones: GroupBox[] = []
): ComputedLayout {
  const nodeMap = new Map<string, PositionedSceneNode>();
  indexNodesRecursively(nodes, nodeMap);
  return {
    nodes,
    nodeMap,
    zones,
    bounds: computeBounds(nodes, zones),
  };
}
