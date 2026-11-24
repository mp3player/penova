import { Point } from '../../model/scene';
import { hashString, mulberry32 } from '../../sdk/random';
import { buildStrokePath } from '../../sdk/strokePath';
import { ShapePlugin } from '../contracts';
import { clipRayToRect } from './clipHelpers';

export const cloudShapePlugin: ShapePlugin = {
  id: 'cloud',
  name: 'Cloud',
  measureBox(contentW, contentH) {
    const padX = 38;
    const padY = 26;
    return {
      padX,
      padY,
      width: Math.max(156, Math.ceil(contentW + padX * 2)),
      height: Math.max(76, Math.ceil(contentH + padY * 2)),
    };
  },
  clipRay: clipRayToRect,
  generateStrokes(input) {
    const { id, cx, cy, width, height, color, emphasized, dashed } = input;
    const rand = mulberry32(hashString(`shape:${id}`));
    const baseWidth = emphasized ? 3.3 : 2.6;

    const bumps = 12;
    const rx = width * 0.45;
    const ry = height * 0.42;
    const pts: Point[] = [];
    const subSteps = 6;

    for (let b = 0; b < bumps; b++) {
      const a0 = (b / bumps) * Math.PI * 2 - Math.PI * 0.5;
      const a1 = ((b + 1) / bumps) * Math.PI * 2 - Math.PI * 0.5;
      const midA = (a0 + a1) / 2;
      const puffR = 11 + (rand() - 0.5) * 4;

      for (let s = 0; s < subSteps; s++) {
        const t = s / subSteps;
        const a = a0 + (a1 - a0) * t;
        const lobe = Math.sin(t * Math.PI) * puffR;
        const nx = Math.cos(midA);
        const ny = Math.sin(midA);
        pts.push({
          x: cx + Math.cos(a) * rx + nx * lobe + (rand() - 0.5) * 1.4,
          y: cy + Math.sin(a) * ry + ny * lobe + (rand() - 0.5) * 1.4,
        });
      }
    }
    if (pts.length > 0) pts.push({ ...pts[0] });

    return [
      buildStrokePath(`${id}-cloud`, pts, {
        width: baseWidth,
        color,
        opacity: 0.92,
        fillOpacity: 1,
        surfaceShadow: true,
        dashed,
        speedFactor: 1.15,
      }),
    ];
  },
};
