import { Point } from '../../model/scene';
import { hashString, mulberry32 } from '../../sdk/random';
import {
  buildStrokePath,
  sketchSegment,
  StrokePath,
} from '../../sdk/strokePath';
import { ShapePlugin } from '../contracts';
import { clipRayToRect } from './clipHelpers';

export const dividerShapePlugin: ShapePlugin = {
  id: 'divider',
  name: '手绘分割线',
  measureBox(contentW, contentH) {
    const padX = 16;
    const padY = 8;
    return {
      padX,
      padY,
      width: Math.max(280, Math.ceil(contentW + 40)),
      height: Math.max(24, Math.ceil(contentH + 16)),
    };
  },
  clipRay: clipRayToRect,
  generateStrokes(input) {
    const { id, cx, cy, width, height, color, emphasized, dashed } = input;
    const rand = mulberry32(hashString(`shape:${id}`));
    const baseWidth = emphasized ? 2.6 : 2.0;

    const halfSpan = Math.max(24, width / 2 - 8);
    const centerGap = Math.min(14, halfSpan * 0.35);
    const rX = Math.max(4, centerGap * 0.52);
    const rY = Math.min(6, Math.max(3.5, height * 0.24));

    const leftPts = sketchSegment(
      { x: cx - halfSpan, y: cy },
      { x: cx - centerGap, y: cy + 0.4 },
      rand,
      0.85,
      16
    );

    const diamondPts: Point[] = [
      ...sketchSegment({ x: cx - rX, y: cy }, { x: cx, y: cy - rY }, rand, 0.4, 4),
      ...sketchSegment({ x: cx, y: cy - rY }, { x: cx + rX, y: cy }, rand, 0.4, 4).slice(1),
      ...sketchSegment({ x: cx + rX, y: cy }, { x: cx, y: cy + rY }, rand, 0.4, 4).slice(1),
      ...sketchSegment({ x: cx, y: cy + rY }, { x: cx - rX, y: cy }, rand, 0.4, 4).slice(1),
    ];

    const rightPts = sketchSegment(
      { x: cx + centerGap, y: cy - 0.3 },
      { x: cx + halfSpan, y: cy },
      rand,
      0.85,
      16
    );

    const strokes: StrokePath[] = [
      buildStrokePath(`${id}-div-left`, leftPts, {
        width: baseWidth,
        color,
        opacity: 0.78,
        dashed,
        speedFactor: 1.45,
      }),
      buildStrokePath(`${id}-div-center`, diamondPts, {
        width: baseWidth * 0.9,
        color,
        opacity: 0.88,
        speedFactor: 1.5,
      }),
      buildStrokePath(`${id}-div-right`, rightPts, {
        width: baseWidth,
        color,
        opacity: 0.78,
        dashed,
        speedFactor: 1.45,
      }),
    ];

    return strokes;
  },
};
