import { hashString, mulberry32 } from '../../sdk/random';
import {
  buildRoundedRectPoints,
  buildStrokePath,
} from '../../sdk/strokePath';
import { ShapePlugin } from '../contracts';
import { clipRayToRect } from './clipHelpers';

export const roundedShapePlugin: ShapePlugin = {
  id: 'rounded',
  name: 'Rounded Box',
  measureBox(contentW, contentH) {
    const padX = 28;
    const padY = 18;
    return {
      padX,
      padY,
      width: Math.max(136, Math.ceil(contentW + padX * 2)),
      height: Math.max(62, Math.ceil(contentH + padY * 2)),
    };
  },
  clipRay: clipRayToRect,
  generateStrokes(input) {
    const { id, cx, cy, width, height, color, emphasized, dashed } = input;
    const x = cx - width / 2;
    const y = cy - height / 2;
    const rand = mulberry32(hashString(`shape:${id}`));
    const baseWidth = emphasized ? 3.3 : 2.6;
    const primaryPts = buildRoundedRectPoints(x, y, width, height, 14, rand, 4);
    return [
      buildStrokePath(`${id}-box-1`, primaryPts, {
        width: baseWidth,
        color,
        opacity: 0.94,
        fillOpacity: 1,
        surfaceShadow: true,
        dashed,
        speedFactor: 1.12,
      }),
    ];
  },
};
