import '../../plugins';
import {
  getCardSummary,
  isCardGroupNode,
} from '../../model/builders';
import {
  CustomSceneNode,
  isCustomSceneNode,
  LessonScene,
  Rect,
  resolveCustomNodeKind,
  SceneNode,
} from '../../model/scene';
import {
  ComputedLayout,
  GroupBox,
  PositionedSceneNode,
} from '../../plugins/contracts';
import {
  clipPointToNodeBorder,
  isOverlaySceneNode,
} from '../../plugins/layouts/shared';
import {
  layoutRegistry,
  presentationRegistry,
  sceneNodeRegistry,
} from '../../plugins/registry';
import {
  measureSceneNode,
  MeasureTextFn,
  positionGroupChildren,
} from './textMeasure';
import { resolveSceneFontFamily } from '../render/fonts';

export type { PositionedSceneNode, GroupBox, ComputedLayout };
export { clipPointToNodeBorder };

function getNodeSearchLabels(node: SceneNode): string[] {
  const labels: string[] = [];
  if (node.name) labels.push(node.name);
  if (isCardGroupNode(node)) {
    const summary = getCardSummary(node);
    if (summary.label) labels.push(summary.label);
  }
  return labels;
}

function findOverlayTarget(
  overlayNode: CustomSceneNode,
  computed: ComputedLayout
): PositionedSceneNode | undefined {
  const props = overlayNode.props ?? {};
  const rawTarget =
    (typeof props.target === 'string' && props.target) ||
    (typeof props.for === 'string' && props.for) ||
    (typeof props.on === 'string' && props.on) ||
    (typeof props.ref === 'string' && props.ref) ||
    '';
  const trimmed = rawTarget.trim();
  if (!trimmed) return undefined;

  const strippedId = trimmed.startsWith('#') ? trimmed.slice(1).trim() : trimmed;
  const direct = computed.nodeMap.get(strippedId) ?? computed.nodeMap.get(trimmed);
  if (direct) return direct;

  const allNodes = Array.from(computed.nodeMap.values()).filter(
    (p) => p.node.type !== 'connector' && !isOverlaySceneNode(p.node)
  );
  for (const cand of allNodes) {
    if (getNodeSearchLabels(cand.node).some((lbl) => lbl === trimmed)) {
      return cand;
    }
  }
  const lower = trimmed.toLowerCase();
  for (const cand of allNodes) {
    if (
      getNodeSearchLabels(cand.node).some(
        (lbl) => lbl.trim().toLowerCase() === lower
      )
    ) {
      return cand;
    }
  }
  return undefined;
}

function expandBounds(bounds: Rect, other: Rect): Rect {
  const minX = Math.min(bounds.x, other.x);
  const minY = Math.min(bounds.y, other.y);
  const maxX = Math.max(bounds.x + bounds.width, other.x + other.width);
  const maxY = Math.max(bounds.y + bounds.height, other.y + other.height);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function computeDiagramLayout(
  scene: LessonScene,
  measureFn?: MeasureTextFn
): ComputedLayout {
  const layoutPlugin = layoutRegistry.getOrDefault(scene.layoutMode);
  const presentation = presentationRegistry.getOrDefault(scene.theme);
  const boardFontFamily = resolveSceneFontFamily(scene, presentation.fontFamily);
  const measureNode = (node: SceneNode) =>
    measureSceneNode(node, measureFn, undefined, boardFontFamily);

  const overlayNodes = scene.nodes.filter((n): n is CustomSceneNode =>
    isCustomSceneNode(n) && isOverlaySceneNode(n)
  );
  const baseScene =
    overlayNodes.length > 0
      ? { ...scene, nodes: scene.nodes.filter((n) => !isOverlaySceneNode(n)) }
      : scene;

  const computed = layoutPlugin.compute(baseScene, {
    measureNode,
    positionGroupChildren,
  });

  if (overlayNodes.length === 0) {
    return computed;
  }

  let nextBounds = { ...computed.bounds };
  for (const overlayNode of overlayNodes) {
    const kind = resolveCustomNodeKind(overlayNode);
    const plugin = sceneNodeRegistry.get(kind);
    const target = findOverlayTarget(overlayNode, computed);
    const measured = measureNode(overlayNode);

    const fallbackCx =
      overlayNode.offset?.x !== undefined && overlayNode.offset.x !== 0
        ? overlayNode.offset.x
        : nextBounds.x + nextBounds.width / 2;
    const fallbackCy =
      overlayNode.offset?.y !== undefined && overlayNode.offset.y !== 0
        ? overlayNode.offset.y
        : nextBounds.y + nextBounds.height / 2;

    const cx = target ? target.cx + (overlayNode.offset?.x ?? 0) : fallbackCx;
    const cy = target ? target.cy + (overlayNode.offset?.y ?? 0) : fallbackCy;
    const width = target ? Math.max(48, target.width) : measured.width;
    const height = target ? Math.max(36, target.height) : measured.height;

    const existingPayload =
      measured.type === 'custom' && measured.payload
        ? (measured.payload as Record<string, unknown>)
        : {};
    const payload = { ...existingPayload, resolvedTargetId: target?.id };

    const positionedOverlay: PositionedSceneNode = {
      id: overlayNode.id,
      node: overlayNode,
      cx,
      cy,
      width,
      height,
      measured:
        measured.type === 'custom'
          ? { ...measured, payload }
          : {
              type: 'custom',
              kind: plugin?.id ?? kind,
              width,
              height,
              payload,
            },
    };

    computed.nodes.push(positionedOverlay);
    computed.nodeMap.set(overlayNode.id, positionedOverlay);

    const rawPad = overlayNode.props?.pad;
    const pad =
      typeof rawPad === 'number' && Number.isFinite(rawPad) ? rawPad : 14;
    nextBounds = expandBounds(nextBounds, {
      x: cx - width / 2 - pad - 12,
      y: cy - height / 2 - pad - 24,
      width: width + (pad + 12) * 2,
      height: height + (pad + 24) * 2,
    });
  }

  return {
    ...computed,
    bounds: nextBounds,
  };
}
