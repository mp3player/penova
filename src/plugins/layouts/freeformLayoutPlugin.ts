import { deriveTeachingSteps, Point } from '../../model/scene';
import { graphScriptCodec } from '../codecs/scriptParser';
import { LayoutPlugin, PositionedSceneNode } from '../contracts';
import {
  buildConnectorNode,
  computeConnectorBowMap,
  finalizeLayout,
  indexNodesRecursively,
  makePositionedNode,
  routeObstacleAwareConnector,
  splitSceneNodes,
} from './shared';

export const freeformLayoutPlugin: LayoutPlugin = {
  id: 'freeform',
  name: 'Freeform',
  category: 'basic',
  icon: 'freeform',
  dragMode: 'absolute',
  supportsEdges: true,
  supportsGroups: false,
  textCodec: graphScriptCodec,
  deriveSteps: deriveTeachingSteps,
  compute(scene, helpers) {
    const { vertices, ownerVertexIdMap, boundConnectors, unboundConnectors } =
      splitSceneNodes(scene.nodes);

    const positionedNodes: PositionedSceneNode[] = [];
    const positionedVertices: PositionedSceneNode[] = [];
    const nodeMap = new Map<string, PositionedSceneNode>();

    if (vertices.length > 0) {
      const cols =
        vertices.length <= 2
          ? vertices.length
          : scene.aspectRatio === '9:16'
          ? 2
          : 3;
      const rows = Math.ceil(vertices.length / cols);
      const measuredList = vertices.map((v) => helpers.measureNode(v));

      const colWidths = new Array<number>(cols).fill(120);
      const rowHeights = new Array<number>(rows).fill(60);

      measuredList.forEach((m, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        colWidths[c] = Math.max(colWidths[c], m.width);
        rowHeights[r] = Math.max(rowHeights[r], m.height);
      });

      const gapX = 64;
      const gapY = 56;
      const totalW =
        colWidths.reduce((s, w) => s + w, 0) + Math.max(0, cols - 1) * gapX;
      const totalH =
        rowHeights.reduce((s, h) => s + h, 0) + Math.max(0, rows - 1) * gapY;

      const colCenters: number[] = [];
      let xCursor = -totalW / 2;
      for (let c = 0; c < cols; c++) {
        colCenters.push(xCursor + colWidths[c] / 2);
        xCursor += colWidths[c] + gapX;
      }

      const rowCenters: number[] = [];
      let yCursor = -totalH / 2;
      for (let r = 0; r < rows; r++) {
        rowCenters.push(yCursor + rowHeights[r] / 2);
        yCursor += rowHeights[r] + gapY;
      }

      vertices.forEach((v, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const pNode = makePositionedNode(
          v,
          colCenters[c],
          rowCenters[r],
          measuredList[idx],
          helpers
        );
        positionedNodes.push(pNode);
        positionedVertices.push(pNode);
        indexNodesRecursively([pNode], nodeMap);
      });
    }

    const bowMap = computeConnectorBowMap(boundConnectors);
    const routedMidpoints: Point[] = [];
    for (const conn of boundConnectors) {
      positionedNodes.push(
        routeObstacleAwareConnector(
          conn,
          nodeMap,
          positionedVertices,
          ownerVertexIdMap,
          {
            preferredBow: bowMap.get(conn.id) ?? 0,
            routedMidpoints,
          }
        )
      );
    }
    for (const conn of unboundConnectors) {
      positionedNodes.push(buildConnectorNode(conn, nodeMap, 0));
    }

    return finalizeLayout(positionedNodes, []);
  },
};
