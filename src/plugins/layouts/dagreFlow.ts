import dagre from '@dagrejs/dagre';
import { LessonScene, Point } from '../../model/scene';
import {
  ComputedLayout,
  LayoutHelpers,
  MeasuredSceneNode,
  PositionedSceneNode,
} from '../contracts';
import {
  buildConnectorNode,
  clipPointToNodeBorder,
  computeConnectorBowMap,
  createPositionedConnectorFromPoints,
  finalizeLayout,
  makePositionedNode,
  sampleQuadraticBezier,
  splitSceneNodes,
} from './shared';

export function computeDagreFlowLayout(
  scene: LessonScene,
  helpers: LayoutHelpers,
  rankdir: 'LR' | 'TB'
): ComputedLayout {
  const { vertices, boundConnectors, unboundConnectors } = splitSceneNodes(
    scene.nodes
  );

  const measuredMap = new Map<string, MeasuredSceneNode>();
  for (const node of vertices) {
    measuredMap.set(node.id, helpers.measureNode(node));
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir,
    nodesep: 68,
    ranksep: 108,
    edgesep: 38,
    marginx: 80,
    marginy: 80,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of vertices) {
    const m = measuredMap.get(node.id)!;
    g.setNode(node.id, { width: m.width, height: m.height });
  }

  for (const conn of boundConnectors) {
    g.setEdge(conn.fromId!, conn.toId!, { id: conn.id });
  }

  dagre.layout(g);

  const positionedNodes: PositionedSceneNode[] = [];
  const vertexMap = new Map<string, PositionedSceneNode>();

  for (const node of vertices) {
    const m = measuredMap.get(node.id)!;
    const dagreNode = g.node(node.id);
    const pNode = makePositionedNode(
      node,
      dagreNode ? dagreNode.x : 0,
      dagreNode ? dagreNode.y : 0,
      m,
      helpers
    );
    positionedNodes.push(pNode);
    vertexMap.set(node.id, pNode);
  }

  const bowMap = computeConnectorBowMap(boundConnectors);
  const pairCounts = new Map<string, number>();
  for (const conn of boundConnectors) {
    const a = conn.fromId! < conn.toId! ? conn.fromId! : conn.toId!;
    const b = conn.fromId! < conn.toId! ? conn.toId! : conn.fromId!;
    const key = `${a}__${b}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  for (const conn of boundConnectors) {
    const fromNode = vertexMap.get(conn.fromId!)!;
    const toNode = vertexMap.get(conn.toId!)!;
    const a = conn.fromId! < conn.toId! ? conn.fromId! : conn.toId!;
    const b = conn.fromId! < conn.toId! ? conn.toId! : conn.fromId!;
    const isMultiEdge = (pairCounts.get(`${a}__${b}`) ?? 0) > 1;
    const hasOffset =
      Boolean(fromNode.node.offset?.x || fromNode.node.offset?.y) ||
      Boolean(toNode.node.offset?.x || toNode.node.offset?.y);

    const dagreEdge = g.edge(conn.fromId!, conn.toId!);
    if (
      !isMultiEdge &&
      !hasOffset &&
      dagreEdge &&
      dagreEdge.points &&
      dagreEdge.points.length >= 2
    ) {
      const rawPts = dagreEdge.points.map((p) => ({ x: p.x, y: p.y }));
      const firstTarget = rawPts[1] ?? { x: toNode.cx, y: toNode.cy };
      const lastSource =
        rawPts[rawPts.length - 2] ?? { x: fromNode.cx, y: fromNode.cy };
      rawPts[0] = clipPointToNodeBorder(fromNode, firstTarget, 5);
      rawPts[rawPts.length - 1] = clipPointToNodeBorder(toNode, lastSource, 6);

      let smoothPts: Point[];
      if (rawPts.length === 2) {
        smoothPts = buildConnectorNode(
          conn,
          vertexMap,
          conn.style === 'dashed' ? -24 : 0
        ).routedPoints!;
      } else if (rawPts.length === 3) {
        smoothPts = sampleQuadraticBezier(rawPts[0], rawPts[1], rawPts[2], 22);
      } else {
        smoothPts = [rawPts[0]];
        for (let i = 1; i < rawPts.length - 1; i++) {
          const prev =
            i === 1
              ? rawPts[0]
              : {
                  x: (rawPts[i - 1].x + rawPts[i].x) / 2,
                  y: (rawPts[i - 1].y + rawPts[i].y) / 2,
                };
          const next =
            i === rawPts.length - 2
              ? rawPts[rawPts.length - 1]
              : {
                  x: (rawPts[i].x + rawPts[i + 1].x) / 2,
                  y: (rawPts[i].y + rawPts[i + 1].y) / 2,
                };
          const seg = sampleQuadraticBezier(prev, rawPts[i], next, 8);
          smoothPts.push(...seg.slice(1));
        }
      }

      positionedNodes.push(
        createPositionedConnectorFromPoints(conn, smoothPts)
      );
    } else {
      positionedNodes.push(
        buildConnectorNode(conn, vertexMap, bowMap.get(conn.id) ?? 0)
      );
    }
  }

  for (const conn of unboundConnectors) {
    positionedNodes.push(buildConnectorNode(conn, vertexMap, 0));
  }

  return finalizeLayout(positionedNodes, []);
}
