import {
  ChalkColor,
  deriveTeachingSteps,
  Point,
  SceneNode,
} from '../../model/scene';
import { graphScriptCodec } from '../codecs/scriptParser';
import {
  GroupBox,
  LayoutPlugin,
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

export const conceptGraphPlugin: LayoutPlugin = {
  id: 'concept-graph',
  name: 'Concept Graph',
  category: 'diagram',
  icon: 'concept-graph',
  dragMode: 'offset',
  supportsEdges: true,
  supportsGroups: true,
  textCodec: graphScriptCodec,
  deriveSteps: deriveTeachingSteps,
  compute(scene, helpers) {
    const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
      splitSceneNodes(scene.nodes);

    if (vertices.length === 0) {
      const emptyMap = new Map<string, PositionedSceneNode>();
      const unbound = unboundConnectors.map((c) =>
        buildConnectorNode(c, emptyMap, 0)
      );
      return finalizeLayout(unbound, []);
    }

    const measuredMap = new Map<string, MeasuredSceneNode>();
    for (const n of vertices) {
      measuredMap.set(n.id, helpers.measureNode(n));
    }

    const groupOrder: string[] = [];
    const groupBuckets = new Map<string, SceneNode[]>();

    for (const node of vertices) {
      const rawZone = node.meta?.zone;
      const zoneName =
        typeof rawZone === 'string' && rawZone.trim()
          ? rawZone.trim()
          : '核心概念';
      if (!groupBuckets.has(zoneName)) {
        groupBuckets.set(zoneName, []);
        groupOrder.push(zoneName);
      }
      groupBuckets.get(zoneName)!.push(node);
    }

    const nodeGapX = 74;
    const nodeGapY = 62;
    const groupPad = 42;
    const groupHeader = 34;
    const groupGapX = 110;
    const groupGapY = 85;

    interface PackedGroup {
      title: string;
      color: ChalkColor;
      width: number;
      height: number;
      localCenters: Map<string, Point>;
      nodes: SceneNode[];
    }

    const packedGroups: PackedGroup[] = groupOrder.map((title) => {
      const members = groupBuckets.get(title)!;
      const cols =
        members.length === 1
          ? 1
          : scene.aspectRatio === '9:16' && members.length <= 2
          ? 1
          : members.length >= 7
          ? 3
          : 2;
      const rows = Math.ceil(members.length / cols);

      const colWidths = new Array<number>(cols).fill(0);
      const rowHeights = new Array<number>(rows).fill(0);

      members.forEach((n, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const m = measuredMap.get(n.id)!;
        colWidths[c] = Math.max(colWidths[c], m.width);
        rowHeights[r] = Math.max(rowHeights[r], m.height);
      });

      const contentW =
        colWidths.reduce((a, b) => a + b, 0) + Math.max(0, cols - 1) * nodeGapX;
      const contentH =
        rowHeights.reduce((a, b) => a + b, 0) +
        Math.max(0, rows - 1) * nodeGapY;

      const width = contentW + groupPad * 2;
      const height = groupHeader + contentH + groupPad * 2;

      const colOffsets: number[] = [];
      let cxCursor = groupPad;
      for (let c = 0; c < cols; c++) {
        colOffsets.push(cxCursor + colWidths[c] / 2);
        cxCursor += colWidths[c] + nodeGapX;
      }

      const rowOffsets: number[] = [];
      let cyCursor = groupPad + groupHeader;
      for (let r = 0; r < rows; r++) {
        rowOffsets.push(cyCursor + rowHeights[r] / 2);
        cyCursor += rowHeights[r] + nodeGapY;
      }

      const localCenters = new Map<string, Point>();
      members.forEach((n, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        localCenters.set(n.id, { x: colOffsets[c], y: rowOffsets[r] });
      });

      return {
        title,
        color: members[0].color,
        width,
        height,
        localCenters,
        nodes: members,
      };
    });

    const outerCols =
      packedGroups.length <= 1 || scene.aspectRatio === '9:16' ? 1 : 2;
    const outerRows = Math.ceil(packedGroups.length / outerCols);
    const outerColWidths = new Array<number>(outerCols).fill(0);
    const outerRowHeights = new Array<number>(outerRows).fill(0);

    packedGroups.forEach((pg, idx) => {
      const r = Math.floor(idx / outerCols);
      const c = idx % outerCols;
      outerColWidths[c] = Math.max(outerColWidths[c], pg.width);
      outerRowHeights[r] = Math.max(outerRowHeights[r], pg.height);
    });

    const outerColX: number[] = [];
    let gxCursor = 0;
    for (let c = 0; c < outerCols; c++) {
      outerColX.push(gxCursor);
      gxCursor += outerColWidths[c] + groupGapX;
    }

    const outerRowY: number[] = [];
    let gyCursor = 0;
    for (let r = 0; r < outerRows; r++) {
      outerRowY.push(gyCursor);
      gyCursor += outerRowHeights[r] + groupGapY;
    }

    const positionedNodes: PositionedSceneNode[] = [];
    const vertexMap = new Map<string, PositionedSceneNode>();
    const positionedVertices: PositionedSceneNode[] = [];
    const zones: GroupBox[] = [];

    packedGroups.forEach((pg, idx) => {
      const r = Math.floor(idx / outerCols);
      const c = idx % outerCols;
      const originX = outerColX[c] + (outerColWidths[c] - pg.width) / 2;
      const originY = outerRowY[r] + (outerRowHeights[r] - pg.height) / 2;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const node of pg.nodes) {
        const local = pg.localCenters.get(node.id)!;
        const m = measuredMap.get(node.id)!;
        const pNode = makePositionedNode(
          node,
          originX + local.x,
          originY + local.y,
          m,
          helpers
        );
        positionedNodes.push(pNode);
        positionedVertices.push(pNode);
        indexNodesRecursively([pNode], vertexMap);

        minX = Math.min(minX, pNode.cx - pNode.width / 2);
        minY = Math.min(minY, pNode.cy - pNode.height / 2);
        maxX = Math.max(maxX, pNode.cx + pNode.width / 2);
        maxY = Math.max(maxY, pNode.cy + pNode.height / 2);
      }

      zones.push({
        id: `group-${idx}-${pg.title}`,
        title: pg.title,
        x: minX - groupPad * 0.72,
        y: minY - groupPad * 0.72 - groupHeader,
        width: maxX - minX + groupPad * 1.44,
        height: maxY - minY + groupPad * 1.44 + groupHeader,
        color: pg.color,
      });
    });

    const bowMap = computeConnectorBowMap(boundConnectors);
    const routedMidpoints: Point[] = [];
    for (const conn of boundConnectors) {
      const fromNode = vertexMap.get(conn.fromId!)!;
      const toNode = vertexMap.get(conn.toId!)!;
      let bow = bowMap.get(conn.id) ?? 0;
      const dist = Math.hypot(
        toNode.cx - fromNode.cx,
        toNode.cy - fromNode.cy
      );
      if (bow === 0 && dist > 320) {
        bow = 28;
      }
      positionedNodes.push(
        routeObstacleAwareConnector(
          conn,
          vertexMap,
          positionedVertices,
          ownerVertexIdMap,
          {
            preferredBow: bow,
            routedMidpoints,
          }
        )
      );
    }

    for (const conn of unboundConnectors) {
      positionedNodes.push(buildConnectorNode(conn, vertexMap, 0));
    }

    return finalizeLayout(positionedNodes, zones);
  },
};
