import { hashString, mulberry32 } from '../../sdk/random';
import {
  buildRoundedRectPoints,
  buildStrokePath,
  StrokePath,
} from '../../sdk/strokePath';
import { ShapePlugin } from '../contracts';
import { clipRayToRect } from './clipHelpers';

export const roundedShapePlugin: ShapePlugin = {
  id: 'rounded',
  name: '圆角框',
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
    const strokes: StrokePath[] = [];

    const primaryPts = buildRoundedRectPoints(x, y, width, height, 14, rand, 4);
    strokes.push(
      buildStrokePath(`${id}-box-1`, primaryPts, {
        width: baseWidth,
        color,
        opacity: 0.94,
        dashed,
        speedFactor: 1.12,
      })
    );

    if (emphasized) {
      const accentPts = buildRoundedRectPoints(
        x - 3.5,
        y - 3.5,
        width + 7,
        height + 7,
        16,
        rand,
        3
      );
      strokes.push(
        buildStrokePath(`${id}-box-2`, accentPts, {
          width: 1.8,
          color,
          opacity: 0.52,
          dashed,
          speedFactor: 1.4,
        })
      );
    }

    return strokes;
  },
};
