import { ChalkColor } from '../../model/scene';
import { GroupBox, PositionedSceneNode } from '../../plugins/contracts';
import { shapeRegistry } from '../../plugins/registry';
import { hashString, mulberry32 } from './random';
import {
  buildRoundedRectPoints,
  buildStrokePath,
  samplePointAlongStroke,
  sketchPolyline,
  sketchSegment,
  StrokePath,
} from './strokePath';

export type { StrokePath };
export { buildStrokePath, samplePointAlongStroke };

export function generateShapeStrokes(pNode: PositionedSceneNode): StrokePath[] {
  if (pNode.node.type !== 'shape') return [];
  const sNode = pNode.node;
  return shapeRegistry.getOrDefault(sNode.shape).generateStrokes({
    id: pNode.id,
    cx: pNode.cx,
    cy: pNode.cy,
    width: pNode.width,
    height: pNode.height,
    color: sNode.color,
    emphasized: sNode.emphasized,
    dashed: sNode.dashed,
  });
}

export function generateGroupFrameStrokes(zone: GroupBox): StrokePath[] {
  const rand = mulberry32(hashString(`group:${zone.id}`));
  const pts = buildRoundedRectPoints(
    zone.x,
    zone.y,
    zone.width,
    zone.height,
    18,
    rand,
    0
  );
  return [
    buildStrokePath(`${zone.id}-frame`, pts, {
      width: 2.1,
      color: zone.color,
      opacity: 0.52,
      dashed: true,
      speedFactor: 1.45,
    }),
  ];
}

export function generateConnectorStrokes(
  pNode: PositionedSceneNode,
  colorOverride?: ChalkColor
): StrokePath[] {
  const pts = pNode.routedPoints;
  if (!pts || pts.length < 2) return [];
  const color = colorOverride ?? pNode.node.color;
  const isDashed =
    pNode.node.type === 'connector' && pNode.node.style === 'dashed';

  const mainPts = sketchPolyline(pts, `edge:${pNode.id}`, 1.25);
  const strokes: StrokePath[] = [
    buildStrokePath(`${pNode.id}-shaft`, mainPts, {
      width: 2.5,
      color,
      opacity: 0.92,
      dashed: isDashed,
      speedFactor: 1.22,
    }),
  ];

  // Hand-drawn 2-stroke arrowhead aligned with final tangent
  const tip = mainPts[mainPts.length - 1];
  const prevIdx = Math.max(0, mainPts.length - 4);
  const prev = mainPts[prevIdx];
  const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const headLen = 13;
  const wingSpread = 0.45;
  const rand = mulberry32(hashString(`head:${pNode.id}`));

  const wing1 = {
    x: tip.x - Math.cos(angle - wingSpread) * headLen,
    y: tip.y - Math.sin(angle - wingSpread) * headLen,
  };
  const wing2 = {
    x: tip.x - Math.cos(angle + wingSpread) * headLen,
    y: tip.y - Math.sin(angle + wingSpread) * headLen,
  };

  strokes.push(
    buildStrokePath(
      `${pNode.id}-head-1`,
      sketchSegment(wing1, tip, rand, 0.7, 7),
      {
        width: 2.6,
        color,
        opacity: 0.95,
        speedFactor: 1.5,
      }
    )
  );
  strokes.push(
    buildStrokePath(
      `${pNode.id}-head-2`,
      sketchSegment(tip, wing2, rand, 0.7, 7),
      {
        width: 2.6,
        color,
        opacity: 0.95,
        speedFactor: 1.5,
      }
    )
  );

  return strokes;
}
