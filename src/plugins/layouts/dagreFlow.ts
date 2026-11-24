import { LessonScene, Point } from '../../model/scene';
import {
  ComputedLayout,
  LayoutHelpers,
  MeasuredSceneNode,
  PositionedSceneNode,
} from '../contracts';
import {
  buildConnectorNode,
  computeConnectorBowMap,
  finalizeLayout,
  indexNodesRecursively,
  makePositionedNode,
  routeObstacleAwareConnector,
  splitSceneNodes,
} from './shared';

interface LayeredDagResult {
  positions: Map<string, Point>;
  ranks: Map<string, number>;
}

/**
 * Self-contained Sugiyama layered DAG layout (zero external dependencies):
 * 1. Cycle-safe topological longest-path rank assignment
 * 2. Two-pass barycenter crossing minimization
 * 3. Symmetric horizontal (LR) or vertical (TB) coordinate placement
 */
function computeLayeredDagPositions(
  vertexIds: string[],
  rootIds: Set<string>,
  measuredMap: Map<string, MeasuredSceneNode>,
  edges: Array<{ from: string; to: string }>,
  rankdir: 'LR' | 'TB'
): LayeredDagResult {
  const indexOf = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  vertexIds.forEach((id, i) => {
    indexOf.set(id, i);
    outgoing.set(id, []);
    incoming.set(id, []);
    inDegree.set(id, 0);
  });

  const seenEdges = new Set<string>();
  for (const e of edges) {
    if (e.from === e.to) continue;
    const key = `${e.from}->${e.to}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    outgoing.get(e.from)?.push(e.to);
    incoming.get(e.to)?.push(e.from);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  // Kahn topological order with deterministic cycle breaking
  const remIn = new Map(inDegree);
  const visited = new Set<string>();
  const topoOrder: string[] = [];

  while (topoOrder.length < vertexIds.length) {
    const ready = vertexIds
      .filter((id) => !visited.has(id) && (remIn.get(id) ?? 0) <= 0)
      .sort((a, b) => {
        const ra = rootIds.has(a) ? 0 : 1;
        const rb = rootIds.has(b) ? 0 : 1;
        return ra !== rb ? ra - rb : (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
      });

    const pick =
      ready[0] ??
      vertexIds
        .filter((id) => !visited.has(id))
        .sort((a, b) => (remIn.get(a) ?? 0) - (remIn.get(b) ?? 0))[0];
    if (!pick) break;

    visited.add(pick);
    topoOrder.push(pick);
    for (const next of outgoing.get(pick) ?? []) {
      if (!visited.has(next)) {
        remIn.set(next, Math.max(0, (remIn.get(next) ?? 0) - 1));
      }
    }
  }

  const ranks = new Map<string, number>();
  const topoIdx = new Map<string, number>();
  topoOrder.forEach((id, i) => topoIdx.set(id, i));

  for (const id of topoOrder) {
    let r = 0;
    for (const prev of incoming.get(id) ?? []) {
      if ((topoIdx.get(prev) ?? 0) < (topoIdx.get(id) ?? 0)) {
        r = Math.max(r, (ranks.get(prev) ?? 0) + 1);
      }
    }
    ranks.set(id, r);
  }

  const maxRank = Math.max(0, ...ranks.values());
  const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const id of vertexIds) {
    layers[ranks.get(id) ?? 0].push(id);
  }

  // Crossing minimization via forward/backward neighbor barycenter sweeps
  const orderInLayer = new Map<string, number>();
  const refreshOrder = () => {
    for (const layer of layers) {
      layer.forEach((id, i) => orderInLayer.set(id, i));
    }
  };
  refreshOrder();

  const sortLayerByNeighbors = (
    r: number,
    neighborMap: Map<string, string[]>
  ) => {
    const layer = layers[r];
    if (layer.length <= 1) return;
    layer.sort((a, b) => {
      const avg = (id: string) => {
        const nbrs = neighborMap.get(id) ?? [];
        if (nbrs.length === 0) return orderInLayer.get(id) ?? 0;
        const sum = nbrs.reduce(
          (acc, n) => acc + (orderInLayer.get(n) ?? 0),
          0
        );
        return sum / nbrs.length;
      };
      const diff = avg(a) - avg(b);
      return Math.abs(diff) > 1e-4
        ? diff
        : (orderInLayer.get(a) ?? 0) - (orderInLayer.get(b) ?? 0);
    });
    refreshOrder();
  };

  for (let pass = 0; pass < 2; pass++) {
    for (let r = 1; r <= maxRank; r++) sortLayerByNeighbors(r, incoming);
    for (let r = maxRank - 1; r >= 0; r--) sortLayerByNeighbors(r, outgoing);
  }

  const nodesep = 68;
  const ranksep = 108;
  const positions = new Map<string, Point>();

  const rankBreadths = layers.map((layer) =>
    layer.reduce((maxB, id) => {
      const m = measuredMap.get(id)!;
      return Math.max(maxB, rankdir === 'LR' ? m.width : m.height);
    }, 0)
  );
  const totalPrimary =
    rankBreadths.reduce((a, b) => a + b, 0) +
    Math.max(0, layers.length - 1) * ranksep;

  let primaryCursor = -totalPrimary / 2;
  for (let r = 0; r < layers.length; r++) {
    const layer = layers[r];
    const layerPrimary = primaryCursor + rankBreadths[r] / 2;
    primaryCursor += rankBreadths[r] + ranksep;

    const totalSecondary =
      layer.reduce((acc, id) => {
        const m = measuredMap.get(id)!;
        return acc + (rankdir === 'LR' ? m.height : m.width);
      }, 0) +
      Math.max(0, layer.length - 1) * nodesep;

    let secCursor = -totalSecondary / 2;
    for (const id of layer) {
      const m = measuredMap.get(id)!;
      const span = rankdir === 'LR' ? m.height : m.width;
      const secCenter = secCursor + span / 2;
      secCursor += span + nodesep;
      positions.set(
        id,
        rankdir === 'LR'
          ? { x: layerPrimary, y: secCenter }
          : { x: secCenter, y: layerPrimary }
      );
    }
  }

  return { positions, ranks };
}

export function computeDagreFlowLayout(
  scene: LessonScene,
  helpers: LayoutHelpers,
  rankdir: 'LR' | 'TB'
): ComputedLayout {
  const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
    splitSceneNodes(scene.nodes);

  const measuredMap = new Map<string, MeasuredSceneNode>();
  const rootIds = new Set<string>();
  for (const node of vertices) {
    measuredMap.set(node.id, helpers.measureNode(node));
    if (node.meta?.role === 'root') rootIds.add(node.id);
  }

  const dagEdges: Array<{ from: string; to: string }> = [];
  for (const conn of boundConnectors) {
    const topFrom = ownerVertexIdMap.get(conn.fromId!);
    const topTo = ownerVertexIdMap.get(conn.toId!);
    if (topFrom && topTo && topFrom !== topTo) {
      dagEdges.push({ from: topFrom, to: topTo });
    }
  }

  const { positions, ranks } = computeLayeredDagPositions(
    vertices.map((v) => v.id),
    rootIds,
    measuredMap,
    dagEdges,
    rankdir
  );

  const positionedNodes: PositionedSceneNode[] = [];
  const vertexMap = new Map<string, PositionedSceneNode>();
  const positionedVertices: PositionedSceneNode[] = [];

  for (const node of vertices) {
    const m = measuredMap.get(node.id)!;
    const pt = positions.get(node.id) ?? { x: 0, y: 0 };
    const pNode = makePositionedNode(node, pt.x, pt.y, m, helpers);
    positionedNodes.push(pNode);
    positionedVertices.push(pNode);
    indexNodesRecursively([pNode], vertexMap);
  }

  const bowMap = computeConnectorBowMap(boundConnectors);
  const routedMidpoints: Point[] = [];
  for (const conn of boundConnectors) {
    const topFrom = ownerVertexIdMap.get(conn.fromId!);
    const topTo = ownerVertexIdMap.get(conn.toId!);
    const rankFrom = topFrom ? ranks.get(topFrom) ?? 0 : 0;
    const rankTo = topTo ? ranks.get(topTo) ?? 0 : 0;

    let preferredBow = bowMap.get(conn.id) ?? 0;
    if (preferredBow === 0 && rankTo < rankFrom) {
      preferredBow = -48;
    }

    positionedNodes.push(
      routeObstacleAwareConnector(
        conn,
        vertexMap,
        positionedVertices,
        ownerVertexIdMap,
        {
          preferredBow,
          preferredSide: rankTo > rankFrom ? -1 : 1,
          routedMidpoints,
        }
      )
    );
  }

  for (const conn of unboundConnectors) {
    positionedNodes.push(buildConnectorNode(conn, vertexMap, 0));
  }

  return finalizeLayout(positionedNodes, []);
}
