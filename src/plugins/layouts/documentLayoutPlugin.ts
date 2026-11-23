import { documentScriptCodec } from '../codecs/documentParser';
import { LessonScene, TeachingStep } from '../../model/scene';
import { LayoutPlugin, PositionedSceneNode } from '../contracts';
import {
  buildConnectorNode,
  computeConnectorBowMap,
  finalizeLayout,
  indexNodesRecursively,
  makePositionedNode,
  splitSceneNodes,
} from './shared';

export const documentLayoutPlugin: LayoutPlugin = {
  id: 'document',
  name: 'Letter / Doc',
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

    const { ownerVertexIdMap: ownerTopId, boundConnectors } = splitSceneNodes(
      scene.nodes
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
        const topFrom = ownerTopId.get(c.fromId!);
        const topTo = ownerTopId.get(c.toId!);
        if (
          !placedConnectors.has(c.id) &&
          topFrom &&
          topTo &&
          visitedVertices.has(topFrom) &&
          visitedVertices.has(topTo)
        ) {
          placedConnectors.add(c.id);
          readyConns.push(c.id);
        }
      }

      const rawPause = node.meta?.pause;
      const pauseMs =
        typeof rawPause === 'number' &&
        Number.isFinite(rawPause) &&
        rawPause >= 0
          ? Math.round(rawPause)
          : undefined;

      steps.push({
        id: `doc-step-${steps.length + 1}-${node.id}`,
        title: node.name || '段落',
        nodeIds: [...readyConns, node.id],
        ...(pauseMs !== undefined ? { pauseMs } : {}),
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
      indexNodesRecursively([pNode], nodeMap);
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
