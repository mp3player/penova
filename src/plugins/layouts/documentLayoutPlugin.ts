import { documentScriptCodec } from '../codecs/documentParser';
import { ConnectorSceneNode, LessonScene, TeachingStep } from '../../model/scene';
import { LayoutPlugin, PositionedSceneNode } from '../contracts';
import {
  buildConnectorNode,
  computeConnectorBowMap,
  finalizeLayout,
  makePositionedNode,
  splitSceneNodes,
} from './shared';

export const documentLayoutPlugin: LayoutPlugin = {
  id: 'document',
  name: '信纸文稿',
  category: 'basic',
  icon: 'document',
  dragMode: 'offset',
  supportsEdges: false,
  supportsGroups: false,
  textCodec: documentScriptCodec,
  deriveSteps(scene: LessonScene): TeachingStep[] {
    if (scene.customSteps && scene.customSteps.length > 0) {
      return scene.customSteps;
    }

    const vertexIds = new Set(
      scene.nodes.filter((n) => n.type !== 'connector').map((n) => n.id)
    );
    const boundConnectors = scene.nodes.filter(
      (n): n is ConnectorSceneNode =>
        n.type === 'connector' &&
        Boolean(n.fromId && n.toId) &&
        n.fromId !== n.toId &&
        vertexIds.has(n.fromId!) &&
        vertexIds.has(n.toId!)
    );

    const visitedVertices = new Set<string>();
    const placedConnectors = new Set<string>();
    const steps: TeachingStep[] = [];

    for (const node of scene.nodes) {
      if (node.type === 'connector') {
        const isBound = boundConnectors.some((c) => c.id === node.id);
        if (!isBound && !placedConnectors.has(node.id)) {
          placedConnectors.add(node.id);
          steps.push({
            id: `doc-step-${steps.length + 1}-${node.id}`,
            title: node.name || '线条',
            nodeIds: [node.id],
          });
        }
        continue;
      }

      visitedVertices.add(node.id);
      const readyConns: string[] = [];
      for (const c of boundConnectors) {
        if (
          !placedConnectors.has(c.id) &&
          visitedVertices.has(c.fromId!) &&
          visitedVertices.has(c.toId!)
        ) {
          placedConnectors.add(c.id);
          readyConns.push(c.id);
        }
      }

      steps.push({
        id: `doc-step-${steps.length + 1}-${node.id}`,
        title: node.name || '段落',
        nodeIds: [...readyConns, node.id],
      });
    }

    return steps;
  },
  compute(scene, helpers) {
    const { vertices, boundConnectors, unboundConnectors } = splitSceneNodes(
      scene.nodes
    );

    const pageWidth = scene.aspectRatio === '9:16' ? 440 : 600;
    const gap = 26;

    const measuredList = vertices.map((v) => {
      let measured = helpers.measureNode(v);
      if (
        v.type === 'shape' &&
        v.shape === 'divider' &&
        measured.type === 'shape'
      ) {
        const targetW =
          v.width !== undefined ? Math.min(pageWidth, v.width) : pageWidth;
        measured = { ...measured, width: targetW };
      }
      return { v, measured };
    });

    let totalHeight = 0;
    measuredList.forEach(({ measured }, idx) => {
      totalHeight += measured.height + (idx > 0 ? gap : 0);
    });

    const nodeMap = new Map<string, PositionedSceneNode>();
    const positionedNodes: PositionedSceneNode[] = [];
    let cursorY = -totalHeight / 2;

    for (const { v, measured } of measuredList) {
      let cx = 0;
      if (v.type === 'text') {
        if (v.align === 'left') {
          cx = -pageWidth / 2 + measured.width / 2;
        } else if (v.align === 'right') {
          cx = pageWidth / 2 - measured.width / 2;
        }
      }
      const cy = cursorY + measured.height / 2;
      cursorY += measured.height + gap;

      const pNode = makePositionedNode(v, cx, cy, measured, helpers);
      positionedNodes.push(pNode);
      nodeMap.set(v.id, pNode);
    }

    const bowMap = computeConnectorBowMap(boundConnectors);
    for (const conn of boundConnectors) {
      positionedNodes.push(
        buildConnectorNode(conn, nodeMap, bowMap.get(conn.id) ?? 0)
      );
    }
    for (const conn of unboundConnectors) {
      positionedNodes.push(buildConnectorNode(conn, nodeMap, 0));
    }

    return finalizeLayout(positionedNodes, []);
  },
};
