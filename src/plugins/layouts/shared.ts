import {
  ConnectorSceneNode,
  isCustomSceneNode,
  Point,
  Rect,
  resolveCustomNodeKind,
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

export function isOverlaySceneNode(node: SceneNode): boolean {
  if (!isCustomSceneNode(node)) return false;
  return Boolean(sceneNodeRegistry.get(resolveCustomNodeKind(node))?.isOverlay);
}

export function splitSceneNodes(nodes: SceneNode[]): SplitSceneNodes {
  const vertices = nodes.filter(
    (n) => n.type !== 'connector' && !isOverlaySceneNode(n)
  );
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

export interface ObstacleAwareRouteOptions {
  preferredBow?: number;
  preferredSide?: -1 | 1;
  routedMidpoints?: Point[];
}

export function segmentIntersectsBox(
  a: Point,
  b: Point,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - minX, maxX - a.x, a.y - minY, maxY - a.y];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-8) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 <= t1;
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function pointInsideObstacle(
  pt: Point,
  obs: PositionedSceneNode,
  padX: number,
  padY = padX
): boolean {
  return (
    pt.x > obs.cx - obs.width / 2 - padX &&
    pt.x < obs.cx + obs.width / 2 + padX &&
    pt.y > obs.cy - obs.height / 2 - padY &&
    pt.y < obs.cy + obs.height / 2 + padY
  );
}

export function pointHitsAnyObstacle(
  pt: Point,
  obstacles: PositionedSceneNode[],
  padX: number,
  padY = padX
): boolean {
  return obstacles.some((obs) => pointInsideObstacle(pt, obs, padX, padY));
}

function segmentHitsAnyObstacle(
  a: Point,
  b: Point,
  obstacles: PositionedSceneNode[],
  pad: number
): boolean {
  for (const obs of obstacles) {
    if (
      segmentIntersectsBox(
        a,
        b,
        obs.cx - obs.width / 2 - pad,
        obs.cy - obs.height / 2 - pad,
        obs.cx + obs.width / 2 + pad,
        obs.cy + obs.height / 2 + pad
      )
    ) {
      return true;
    }
  }
  return false;
}

export function countPolylineCollisions(
  points: Point[],
  obstacles: PositionedSceneNode[],
  pad: number
): number {
  let count = 0;
  for (const obs of obstacles) {
    const minX = obs.cx - obs.width / 2 - pad;
    const maxX = obs.cx + obs.width / 2 + pad;
    const minY = obs.cy - obs.height / 2 - pad;
    const maxY = obs.cy + obs.height / 2 + pad;
    for (let i = 1; i < points.length; i++) {
      if (segmentIntersectsBox(points[i - 1], points[i], minX, minY, maxX, maxY)) {
        count++;
        break;
      }
    }
  }
  return count;
}

export function collectObstaclesForConnector(
  conn: ConnectorSceneNode,
  allVertices: PositionedSceneNode[],
  ownerVertexIdMap: Map<string, string>
): PositionedSceneNode[] {
  const fromOwner = conn.fromId
    ? ownerVertexIdMap.get(conn.fromId) ?? conn.fromId
    : undefined;
  const toOwner = conn.toId
    ? ownerVertexIdMap.get(conn.toId) ?? conn.toId
    : undefined;
  return allVertices.filter(
    (v) =>
      v.id !== conn.fromId &&
      v.id !== conn.toId &&
      v.id !== fromOwner &&
      v.id !== toOwner
  );
}

function findBlockingObstacles(
  points: Point[],
  obstacles: PositionedSceneNode[],
  pad: number
): PositionedSceneNode[] {
  const hit: PositionedSceneNode[] = [];
  for (const obs of obstacles) {
    const minX = obs.cx - obs.width / 2 - pad;
    const maxX = obs.cx + obs.width / 2 + pad;
    const minY = obs.cy - obs.height / 2 - pad;
    const maxY = obs.cy + obs.height / 2 + pad;
    for (let i = 1; i < points.length; i++) {
      if (segmentIntersectsBox(points[i - 1], points[i], minX, minY, maxX, maxY)) {
        hit.push(obs);
        break;
      }
    }
  }
  return hit;
}

function buildEnvelopeArchPoints(
  fromNode: PositionedSceneNode,
  toNode: PositionedSceneNode,
  obstacles: PositionedSceneNode[],
  initialBlockers: PositionedSceneNode[],
  side: -1 | 1,
  extraClearance: number
): Point[] {
  const dx = toNode.cx - fromNode.cx;
  const dy = toNode.cy - fromNode.cy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const nx = -uy;
  const ny = ux;

  const blockers = new Set<PositionedSceneNode>(initialBlockers);
  let points: Point[] = [];

  for (let iter = 0; iter < 5; iter++) {
    let extremeN = side === -1 ? Infinity : -Infinity;
    const envelopeNodes =
      blockers.size > 0 ? [...blockers, fromNode, toNode] : [fromNode, toNode];

    for (const node of envelopeNodes) {
      const hw = node.width / 2;
      const hh = node.height / 2;
      const corners = [
        { x: node.cx - hw, y: node.cy - hh },
        { x: node.cx + hw, y: node.cy - hh },
        { x: node.cx + hw, y: node.cy + hh },
        { x: node.cx - hw, y: node.cy + hh },
      ];
      for (const c of corners) {
        const projN = (c.x - fromNode.cx) * nx + (c.y - fromNode.cy) * ny;
        extremeN =
          side === -1 ? Math.min(extremeN, projN) : Math.max(extremeN, projN);
      }
    }

    const targetN = extremeN + side * extraClearance;
    const inset = Math.min(84, Math.max(22, dist * 0.14));

    const aim1 = {
      x: fromNode.cx + ux * inset + nx * targetN,
      y: fromNode.cy + uy * inset + ny * targetN,
    };
    const aim2 = {
      x: toNode.cx - ux * inset + nx * targetN,
      y: toNode.cy - uy * inset + ny * targetN,
    };
    const start = clipPointToNodeBorder(fromNode, aim1, 5);
    const end = clipPointToNodeBorder(toNode, aim2, 6);

    const startN = (start.x - fromNode.cx) * nx + (start.y - fromNode.cy) * ny;
    const endN = (end.x - fromNode.cx) * nx + (end.y - fromNode.cy) * ny;
    const avgEndN = (startN + endN) / 2;
    const rawCtrlN = (targetN - 0.25 * avgEndN) / 0.75;
    const ctrlN =
      side === -1 ? Math.min(targetN, rawCtrlN) : Math.max(targetN, rawCtrlN);

    const c1 = {
      x: fromNode.cx + ux * inset + nx * ctrlN,
      y: fromNode.cy + uy * inset + ny * ctrlN,
    };
    const c2 = {
      x: toNode.cx - ux * inset + nx * ctrlN,
      y: toNode.cy - uy * inset + ny * ctrlN,
    };
    points = sampleCubicBezier(start, c1, c2, end, 28);

    const newHits = findBlockingObstacles(points, obstacles, 12);
    let added = false;
    for (const h of newHits) {
      if (!blockers.has(h)) {
        blockers.add(h);
        added = true;
      }
    }
    if (!added) break;
  }

  return points;
}

function sampleSubdividedLine(a: Point, b: Point, steps = 6): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });
  }
  return out;
}

function smoothFilletPolyline(pts: Point[], maxRadius = 34): Point[] {
  if (pts.length <= 2) {
    return pts.length === 2
      ? sampleQuadraticBezier(
          pts[0],
          { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
          pts[1],
          14
        )
      : pts;
  }
  const out: Point[] = [pts[0]];
  let cursor = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const lenIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(maxRadius, lenIn * 0.35, lenOut * 0.35);
    if (r < 2 || lenIn < 1e-3 || lenOut < 1e-3) {
      out.push(...sampleSubdividedLine(cursor, curr, 6).slice(1));
      cursor = curr;
      continue;
    }
    const enterPt = {
      x: curr.x - ((curr.x - prev.x) / lenIn) * r,
      y: curr.y - ((curr.y - prev.y) / lenIn) * r,
    };
    const exitPt = {
      x: curr.x + ((next.x - curr.x) / lenOut) * r,
      y: curr.y + ((next.y - curr.y) / lenOut) * r,
    };
    if (Math.hypot(enterPt.x - cursor.x, enterPt.y - cursor.y) > 0.5) {
      out.push(...sampleSubdividedLine(cursor, enterPt, 6).slice(1));
    }
    out.push(...sampleQuadraticBezier(enterPt, curr, exitPt, 10).slice(1));
    cursor = exitPt;
  }
  out.push(...sampleSubdividedLine(cursor, pts[pts.length - 1], 6).slice(1));
  return out;
}

function buildVisibilityDetourPoints(
  fromNode: PositionedSceneNode,
  toNode: PositionedSceneNode,
  obstacles: PositionedSceneNode[]
): Point[] | null {
  if (obstacles.length === 0) return null;

  const minX = Math.min(fromNode.cx - fromNode.width / 2, toNode.cx - toNode.width / 2) - 240;
  const maxX = Math.max(fromNode.cx + fromNode.width / 2, toNode.cx + toNode.width / 2) + 240;
  const minY = Math.min(fromNode.cy - fromNode.height / 2, toNode.cy - toNode.height / 2) - 240;
  const maxY = Math.max(fromNode.cy + fromNode.height / 2, toNode.cy + toNode.height / 2) + 240;

  const midX = (fromNode.cx + toNode.cx) / 2;
  const midY = (fromNode.cy + toNode.cy) / 2;
  const localObstacles = obstacles
    .filter(
      (o) =>
        o.cx + o.width / 2 >= minX &&
        o.cx - o.width / 2 <= maxX &&
        o.cy + o.height / 2 >= minY &&
        o.cy - o.height / 2 <= maxY
    )
    .sort(
      (a, b) =>
        Math.hypot(a.cx - midX, a.cy - midY) - Math.hypot(b.cx - midX, b.cy - midY)
    )
    .slice(0, 24);

  const waypoints: Point[] = [];
  const startPortIndices: number[] = [];
  const endPortIndices: number[] = [];

  const cardinalPorts = (node: PositionedSceneNode, pad = 16): Point[] => [
    { x: node.cx, y: node.cy - node.height / 2 - pad },
    { x: node.cx + node.width / 2 + pad, y: node.cy },
    { x: node.cx, y: node.cy + node.height / 2 + pad },
    { x: node.cx - node.width / 2 - pad, y: node.cy },
  ];

  for (const pt of cardinalPorts(fromNode)) {
    const borderPt = clipPointToNodeBorder(fromNode, pt, 5);
    if (
      !pointHitsAnyObstacle(pt, obstacles, 10) &&
      !segmentHitsAnyObstacle(borderPt, pt, obstacles, 4)
    ) {
      startPortIndices.push(waypoints.length);
      waypoints.push(pt);
    }
  }
  for (const pt of cardinalPorts(toNode)) {
    const borderPt = clipPointToNodeBorder(toNode, pt, 6);
    if (
      !pointHitsAnyObstacle(pt, obstacles, 10) &&
      !segmentHitsAnyObstacle(pt, borderPt, obstacles, 4)
    ) {
      endPortIndices.push(waypoints.length);
      waypoints.push(pt);
    }
  }

  if (startPortIndices.length === 0 || endPortIndices.length === 0) {
    return null;
  }

  const cornerPad = 24;
  for (const obs of localObstacles) {
    const hw = obs.width / 2 + cornerPad;
    const hh = obs.height / 2 + cornerPad;
    const corners = [
      { x: obs.cx - hw, y: obs.cy - hh },
      { x: obs.cx + hw, y: obs.cy - hh },
      { x: obs.cx + hw, y: obs.cy + hh },
      { x: obs.cx - hw, y: obs.cy + hh },
    ];
    for (const c of corners) {
      if (
        !pointHitsAnyObstacle(c, obstacles, 10) &&
        !pointInsideObstacle(c, fromNode, 4) &&
        !pointInsideObstacle(c, toNode, 4)
      ) {
        waypoints.push(c);
      }
    }
  }

  const n = waypoints.length;
  const edges: Array<Array<{ to: number; cost: number }>> = Array.from(
    { length: n },
    () => []
  );
  const endpointObstacles = [fromNode, toNode];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = waypoints[i];
      const b = waypoints[j];
      // Do not slice across source/target bodies or any padded obstacle
      if (
        segmentHitsAnyObstacle(a, b, obstacles, 10) ||
        segmentHitsAnyObstacle(a, b, endpointObstacles, -2)
      ) {
        continue;
      }
      const d = Math.hypot(b.x - a.x, b.y - a.y) + 22;
      edges[i].push({ to: j, cost: d });
      edges[j].push({ to: i, cost: d });
    }
  }

  // Multi-source Dijkstra from start ports to end ports
  const distArr = new Array<number>(n).fill(Infinity);
  const prevArr = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(n).fill(false);
  const endSet = new Set<number>(endPortIndices);

  for (const sIdx of startPortIndices) {
    distArr[sIdx] = 0;
  }

  let reachedEnd = -1;
  for (let step = 0; step < n; step++) {
    let u = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (!used[i] && distArr[i] < bestD) {
        bestD = distArr[i];
        u = i;
      }
    }
    if (u === -1 || !Number.isFinite(bestD)) break;
    used[u] = true;
    if (endSet.has(u)) {
      reachedEnd = u;
      break;
    }
    for (const e of edges[u]) {
      const alt = bestD + e.cost;
      if (alt < distArr[e.to]) {
        distArr[e.to] = alt;
        prevArr[e.to] = u;
      }
    }
  }

  if (reachedEnd === -1) return null;

  const rawPath: Point[] = [];
  let cur = reachedEnd;
  while (cur !== -1) {
    rawPath.push(waypoints[cur]);
    cur = prevArr[cur];
  }
  rawPath.reverse();
  if (rawPath.length < 2) return null;

  // Greedy string-pulling to remove collinear / unnecessary turns
  const pulled: Point[] = [rawPath[0]];
  let idx = 0;
  while (idx < rawPath.length - 1) {
    let farthest = idx + 1;
    for (let cand = rawPath.length - 1; cand > idx + 1; cand--) {
      if (
        !segmentHitsAnyObstacle(rawPath[idx], rawPath[cand], obstacles, 14) &&
        !segmentHitsAnyObstacle(rawPath[idx], rawPath[cand], [fromNode, toNode], -2)
      ) {
        farthest = cand;
        break;
      }
    }
    pulled.push(rawPath[farthest]);
    idx = farthest;
  }

  const fullWaypoints: Point[] = [];
  const startPort = pulled[0];
  const endPort = pulled[pulled.length - 1];
  const startClip = clipPointToNodeBorder(fromNode, startPort, 5);
  const endClip = clipPointToNodeBorder(toNode, endPort, 6);

  fullWaypoints.push(startClip);
  // Keep startPort unless skipping directly to pulled[1] stays completely clear of obstacles & endpoints
  const canSkipStartPort =
    pulled.length >= 2 &&
    !segmentHitsAnyObstacle(startClip, pulled[1], obstacles, 10) &&
    !segmentHitsAnyObstacle(startClip, pulled[1], [fromNode], -2);
  if (!canSkipStartPort && Math.hypot(startPort.x - startClip.x, startPort.y - startClip.y) > 2) {
    fullWaypoints.push(startPort);
  }

  for (let k = 1; k < pulled.length - 1; k++) {
    fullWaypoints.push(pulled[k]);
  }

  const prevBeforeEnd = fullWaypoints[fullWaypoints.length - 1];
  const canSkipEndPort =
    pulled.length >= 2 &&
    !segmentHitsAnyObstacle(prevBeforeEnd, endClip, obstacles, 10) &&
    !segmentHitsAnyObstacle(prevBeforeEnd, endClip, [toNode], -2);
  if (!canSkipEndPort && Math.hypot(endClip.x - endPort.x, endClip.y - endPort.y) > 2) {
    fullWaypoints.push(endPort);
  }
  fullWaypoints.push(endClip);

  for (const r of [28, 14, 6]) {
    const smooth = smoothFilletPolyline(fullWaypoints, r);
    if (countPolylineCollisions(smooth, obstacles, 6) === 0) {
      return smooth;
    }
  }
  return smoothFilletPolyline(fullWaypoints, 4);
}

/**
 * General obstacle-aware connector router across all graph layouts:
 * 1. Keeps crisp direct / bowed Bezier curves when collision-free.
 * 2. On collision, compares dual-side smooth envelope arches against a 2D visibility-graph fillet spline.
 */
export function routeObstacleAwareConnector(
  conn: ConnectorSceneNode,
  vertexMap: Map<string, PositionedSceneNode>,
  allVertices: PositionedSceneNode[],
  ownerVertexIdMap: Map<string, string>,
  options: ObstacleAwareRouteOptions = {}
): PositionedSceneNode {
  const fromNode = conn.fromId ? vertexMap.get(conn.fromId) : undefined;
  const toNode = conn.toId ? vertexMap.get(conn.toId) : undefined;
  if (!fromNode || !toNode) {
    return buildConnectorNode(conn, vertexMap, options.preferredBow ?? 0);
  }

  const obstacles = collectObstaclesForConnector(conn, allVertices, ownerVertexIdMap);
  const directNode = buildConnectorNode(conn, vertexMap, options.preferredBow ?? 0);
  const directPts = directNode.routedPoints ?? [];
  const directHits = countPolylineCollisions(directPts, obstacles, 10);
  const directLabelHit =
    directNode.labelPoint && pointHitsAnyObstacle(directNode.labelPoint, obstacles, 24, 12);

  if (obstacles.length === 0 || (directHits === 0 && !directLabelHit)) {
    const directMid =
      directNode.labelPoint ?? midpointOnPolyline(directPts);
    if (directMid && options.routedMidpoints) {
      options.routedMidpoints.push(directMid);
    }
    return directNode;
  }

  const initialBlockers = findBlockingObstacles(directPts, obstacles, 10);
  const baseClearance = 40 + (conn.label ? 18 : 0);
  const routedMidpoints = options.routedMidpoints ?? [];
  const candidates: Array<{
    node: PositionedSceneNode;
    side?: -1 | 1;
    isDirect?: boolean;
  }> = [{ node: directNode, isDirect: true }];

  for (const side of [-1, 1] as const) {
    const pts0 = buildEnvelopeArchPoints(
      fromNode,
      toNode,
      obstacles,
      initialBlockers,
      side,
      baseClearance
    );
    const node0 = createPositionedConnectorFromPoints(conn, pts0);
    candidates.push({ node: node0, side });

    // If midpoint crowds an existing detoured curve, evaluate an extra lane offset
    const mid0 = node0.labelPoint ?? midpointOnPolyline(pts0);
    if (
      mid0 &&
      routedMidpoints.some((m) => Math.hypot(m.x - mid0.x, m.y - mid0.y) < 38)
    ) {
      const pts1 = buildEnvelopeArchPoints(
        fromNode,
        toNode,
        obstacles,
        initialBlockers,
        side,
        baseClearance + 46
      );
      candidates.push({
        node: createPositionedConnectorFromPoints(conn, pts1),
        side,
      });
    }
  }

  const visPts = buildVisibilityDetourPoints(fromNode, toNode, obstacles);
  if (visPts && visPts.length >= 2) {
    candidates.push({ node: createPositionedConnectorFromPoints(conn, visPts) });
  }

  let bestNode = directNode;
  let bestScore = Infinity;

  for (const cand of candidates) {
    const pts = cand.node.routedPoints ?? [];
    if (pts.length < 2) continue;
    const segHits = countPolylineCollisions(pts, obstacles, 6);
    const labelHit =
      cand.node.labelPoint && pointHitsAnyObstacle(cand.node.labelPoint, obstacles, 16, 8)
        ? 1
        : 0;
    const arcLen = polylineLength(pts);
    const mid = cand.node.labelPoint ?? midpointOnPolyline(pts);
    const crowded =
      mid && routedMidpoints.some((m) => Math.hypot(m.x - mid.x, m.y - mid.y) < 34)
        ? 140
        : 0;
    const sideBias =
      options.preferredSide && cand.side && cand.side !== options.preferredSide ? 28 : 0;
    const grazePenalty =
      cand.isDirect && segHits === 0 ? directHits * 120 : 0;

    const score =
      arcLen + segHits * 10000 + labelHit * 4000 + crowded + sideBias + grazePenalty;
    if (score < bestScore) {
      bestScore = score;
      bestNode = cand.node;
    }
  }

  const bestMid = bestNode.labelPoint ?? midpointOnPolyline(bestNode.routedPoints ?? []);
  if (bestMid && options.routedMidpoints) {
    options.routedMidpoints.push(bestMid);
  }
  return bestNode;
}
