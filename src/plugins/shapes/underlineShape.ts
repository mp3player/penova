import { hashString, mulberry32 } from '../../sdk/random';
import { buildStrokePath, sketchSegment } from '../../sdk/strokePath';
import { ShapePlugin } from '../contracts';
import { clipRayToRect } from './clipHelpers';

export const underlineShapePlugin: ShapePlugin = {
  id: 'underline',
  name: '双下划线',
  measureBox(contentW, contentH) {
    const padX = 20;
    const padY = 14;
    return {
      padX,
      padY,
      textOffsetY: -4,
      width: Math.max(128, Math.ceil(contentW + padX * 2)),
      height: Math.max(54, Math.ceil(contentH + padY * 2 + 6)),
    };
  },
  clipRay: clipRayToRect,
  generateStrokes(input) {
    const { id, cx, cy, width, height, color, emphasized, dashed } = input;
    const x = cx - width / 2;
    const y = cy - height / 2;
    const rand = mulberry32(hashString(`shape:${id}`));
    const baseWidth = emphasized ? 3.3 : 2.6;

    const lineY1 = y + height - 10;
    const lineY2 = lineY1 + 5.5;
    const leftX = x + 12;
    const rightX = x + width - 12;

    const u1 = sketchSegment(
      { x: leftX, y: lineY1 },
      { x: rightX, y: lineY1 - 1.2 },
      rand,
      1.3,
      14
    );
    const u2 = sketchSegment(
      { x: leftX + 8, y: lineY2 },
      { x: rightX - 6, y: lineY2 - 0.8 },
      rand,
      1.2,
      14
    );

    return [
      buildStrokePath(`${id}-ul-1`, u1, {
        width: baseWidth + 0.4,
        color,
        opacity: 0.95,
        dashed,
        speedFactor: 1.25,
      }),
      buildStrokePath(`${id}-ul-2`, u2, {
        width: 1.9,
        color,
        opacity: 0.72,
        dashed,
        speedFactor: 1.35,
      }),
    ];
  },
};
