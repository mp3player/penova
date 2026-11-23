import {
  deriveTeachingSteps,
  Point,
  SceneNode,
} from '../../model/scene';
import { graphScriptCodec } from '../codecs/scriptParser';
import {
  LayoutPlugin,
  MeasuredSceneNode,
  PositionedSceneNode,
} from '../contracts';
import {
  buildConnectorNode,
  clipPointToNodeBorder,
  computeConnectorBowMap,
  createPositionedConnectorFromPoints,
  finalizeLayout,
  indexNodesRecursively,
  makePositionedNode,
  sampleCubicBezier,
  splitSceneNodes,
} from './shared';

export const mindmapPlugin: LayoutPlugin = {
  id: 'mindmap',
  name: 'Mind Map',
  category: 'diagram',
  icon: 'mindmap',
  dragMode: 'offset',
  supportsEdges: true,
  textCodec: graphScriptCodec,
  deriveSteps: deriveTeachingSteps,
  compute(scene, helpers) {
    const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
      splitSceneNodes(scene.nodes);

    if (vertices.length === 0) {
      const emptyVertexMap = new Map<string, PositionedSceneNode>();
      const unbound = unboundConnectors.map((c) =>
        buildConnectorNode(c, emptyVertexMap, 0)
      );
      return finalizeLayout(unbound, []);
    }

    const measuredMap = new Map<string, MeasuredSceneNode>();
    const nodeById = new Map<string, SceneNode>();
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const n of vertices) {
      measuredMap.set(n.id, helpers.measureNode(n));
      nodeById.set(n.id, n);
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    }

    for (const c of boundConnectors) {
      const topFrom = ownerVertexIdMap.get(c.fromId!);
      const topTo = ownerVertexIdMap.get(c.toId!);
      if (topFrom && topTo && topFrom !== topTo) {
        adj.get(topFrom)!.push(topTo);
        inDegree.set(topTo, (inDegree.get(topTo) ?? 0) + 1);
      }
    }

    const rootNode =
      vertices.find((n) => n.meta?.role === 'root') ??
      vertices.find((n) => (inDegree.get(n.id) ?? 0) === 0) ??
      vertices[0];

    const treeChildren = new Map<string, string[]>();
    for (const n of vertices) treeChildren.set(n.id, []);
    const treeEdgeSet = new Set<string>();
    const visited = new Set<string>([rootNode.id]);
    const bfsQueue: string[] = [rootNode.id];

    while (bfsQueue.length > 0) {
      const curr = bfsQueue.shift()!;
      for (const nextId of adj.get(curr) ?? []) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          treeChildren.get(curr)!.push(nextId);
          treeEdgeSet.add(`${curr}->${nextId}`);
          bfsQueue.push(nextId);
        }
      }
    }

    const gapX = 115;
    const gapY = 38;

    const weightCache = new Map<string, number>();
    const computeSubtreeWeight = (id: string): number => {
      if (weightCache.has(id)) return weightCache.get(id)!;
      const children = treeChildren.get(id) ?? [];
      const w =
        children.length === 0
          ? 1
          : children.reduce((acc, c) => acc + computeSubtreeWeight(c), 0);
      weightCache.set(id, w);
      return w;
    };

    const heightCache = new Map<string, number>();
    const computeSubtreeHeight = (id: string): number => {
      if (heightCache.has(id)) return heightCache.get(id)!;
      const ownH = measuredMap.get(id)!.height;
      const children = treeChildren.get(id) ?? [];
      if (children.length === 0) {
        heightCache.set(id, ownH);
        return ownH;
      }
      const childrenSum =
        children.reduce((acc, c) => acc + computeSubtreeHeight(c), 0) +
        (children.length - 1) * gapY;
      const total = Math.max(ownH, childrenSum);
      heightCache.set(id, total);
      return total;
    };

    const baseCenters = new Map<string, Point>();
    const branchDir = new Map<string, 1 | -1>();
    baseCenters.set(rootNode.id, { x: 0, y: 0 });

    const rootChildren = treeChildren.get(rootNode.id) ?? [];
    const rightChildren: string[] = [];
    const leftChildren: string[] = [];

    if (rootChildren.length === 1) {
      rightChildren.push(rootChildren[0]);
    } else {
      let rightWeight = 0;
      let leftWeight = 0;
      for (const childId of rootChildren) {
        const w = computeSubtreeWeight(childId);
        if (rightWeight <= leftWeight) {
          rightChildren.push(childId);
          rightWeight += w;
        } else {
          leftChildren.push(childId);
          leftWeight += w;
        }
      }
    }

    const layoutSubtree = (
      parentId: string,
      children: string[],
      dir: 1 | -1
    ) => {
      if (children.length === 0) return;
      const parentCenter = baseCenters.get(parentId)!;
      const parentM = measuredMap.get(parentId)!;

      const totalChildrenH =
        children.reduce((acc, c) => acc + computeSubtreeHeight(c), 0) +
        (children.length - 1) * gapY;

      let cursorY = parentCenter.y - totalChildrenH / 2;

      for (const childId of children) {
        const subH = computeSubtreeHeight(childId);
        const childM = measuredMap.get(childId)!;
        const childCy = cursorY + subH / 2;
        const childCx =
          parentCenter.x + dir * (parentM.width / 2 + gapX + childM.width / 2);

        baseCenters.set(childId, { x: childCx, y: childCy });
        branchDir.set(childId, dir);
        cursorY += subH + gapY;

        layoutSubtree(childId, treeChildren.get(childId) ?? [], dir);
      }
    };

    layoutSubtree(rootNode.id, rightChildren, 1);
    layoutSubtree(rootNode.id, leftChildren, -1);

    const unvisitedNodes = vertices.filter((n) => !baseCenters.has(n.id));
    if (unvisitedNodes.length > 0) {
      let maxBottom = measuredMap.get(rootNode.id)!.height / 2;
      for (const [id, pt] of baseCenters.entries()) {
        maxBottom = Math.max(
          maxBottom,
          pt.y + measuredMap.get(id)!.height / 2
        );
      }

      const rowGapX = 56;
      const rowGapY = 44;
      const rowWidthLimit = 980;
      let rowNodes: SceneNode[] = [];
      let rowWidth = 0;
      let cursorY = maxBottom + 96;

      const flushRow = () => {
        if (rowNodes.length === 0) return;
        const maxH = Math.max(
          ...rowNodes.map((n) => measuredMap.get(n.id)!.height)
        );
        let cursorX = -rowWidth / 2;
        for (const n of rowNodes) {
          const m = measuredMap.get(n.id)!;
          baseCenters.set(n.id, {
            x: cursorX + m.width / 2,
            y: cursorY + maxH / 2,
          });
          cursorX += m.width + rowGapX;
        }
        cursorY += maxH + rowGapY;
        rowNodes = [];
        rowWidth = 0;
      };

      for (const n of unvisitedNodes) {
        const m = measuredMap.get(n.id)!;
        const nextW =
          rowNodes.length === 0 ? m.width : rowWidth + rowGapX + m.width;
        if (rowNodes.length > 0 && nextW > rowWidthLimit) {
          flushRow();
        }
        rowNodes.push(n);
        rowWidth =
          rowNodes.length === 1 ? m.width : rowWidth + rowGapX + m.width;
      }
      flushRow();
    }

    const positionedNodes: PositionedSceneNode[] = [];
    const vertexMap = new Map<string, PositionedSceneNode>();
    for (const n of vertices) {
      const pt = baseCenters.get(n.id)!;
      const pNode = makePositionedNode(
        n,
        pt.x,
        pt.y,
        measuredMap.get(n.id)!,
        helpers
      );
      positionedNodes.push(pNode);
      indexNodesRecursively([pNode], vertexMap);
    }

    const bowMap = computeConnectorBowMap(boundConnectors);

    for (const conn of boundConnectors) {
      const fromNode = vertexMap.get(conn.fromId!)!;
      const toNode = vertexMap.get(conn.toId!)!;

      if (treeEdgeSet.has(`${conn.fromId}->${conn.toId}`)) {
        const dir: 1 | -1 =
          branchDir.get(conn.toId!) ?? (toNode.cx >= fromNode.cx ? 1 : -1);
        const start = clipPointToNodeBorder(
          fromNode,
          { x: fromNode.cx + dir * 200, y: fromNode.cy },
          5
        );
        const end = clipPointToNodeBorder(
          toNode,
          { x: toNode.cx - dir * 200, y: toNode.cy },
          6
        );
        const spanX = Math.max(Math.abs(end.x - start.x) * 0.48, 36);
        const c1 = { x: start.x + dir * spanX, y: start.y };
        const c2 = { x: end.x - dir * spanX, y: end.y };
        const pts = sampleCubicBezier(start, c1, c2, end, 20);

        positionedNodes.push(createPositionedConnectorFromPoints(conn, pts));
      } else {
        positionedNodes.push(
          buildConnectorNode(conn, vertexMap, bowMap.get(conn.id) || 44)
        );
      }
    }

    for (const conn of unboundConnectors) {
      positionedNodes.push(buildConnectorNode(conn, vertexMap, 0));
    }

    return finalizeLayout(positionedNodes, []);
  },
};
