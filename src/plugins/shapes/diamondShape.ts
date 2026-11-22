import { hashString, mulberry32 } from '../../sdk/random';
import { buildStrokePath, sketchSegment } from '../../sdk/strokePath';
import { ShapePlugin } from '../contracts';
import { clipRayToDiamond } from './clipHelpers';

export const diamondShapePlugin: ShapePlugin = {
  id: 'diamond',
  name: '菱形判断',
  maxTextWidth() {
    return 168;
  },
  measureBox(contentW, contentH) {
    const padX = 48;
    const padY = 34;
    return {
      padX,
      padY,
      width: Math.max(198, Math.ceil(contentW * 1.62 + 52)),
      height: Math.max(118, Math.ceil(contentH * 1.72 + 48)),
    };
  },
  clipRay: clipRayToDiamond,
  generateStrokes(input) {
    const { id, cx, cy, width, height, color, emphasized, dashed } = input;
    const x = cx - width / 2;
    const y = cy - height / 2;
    const rand = mulberry32(hashString(`shape:${id}`));
    const baseWidth = emphasized ? 3.3 : 2.6;

    const top = { x: cx, y };
    const right = { x: x + width, y: cy };
    const bottom = { x: cx, y: y + height };
    const left = { x, y: cy };

    const edges = [
      [top, right],
      [right, bottom],
      [bottom, left],
      [left, top],
    ];

    return edges.map(([a, b], idx) =>
      buildStrokePath(
        `${id}-diamond-${idx}`,
        sketchSegment(a, b, rand, 1.5, 14),
        {
          width: baseWidth,
          color,
          opacity: 0.94,
          dashed,
          speedFactor: 1.15,
        }
      )
    );
  },
};
