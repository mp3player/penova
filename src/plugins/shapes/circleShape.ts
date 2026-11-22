import { Point } from '../../model/scene';
import { hashString, mulberry32 } from '../../sdk/random';
import { buildStrokePath, StrokePath } from '../../sdk/strokePath';
import { ShapePlugin } from '../contracts';
import { clipRayToEllipse } from './clipHelpers';

export const circleShapePlugin: ShapePlugin = {
  id: 'circle',
  name: '椭圆圈',
  maxTextWidth() {
    return 162;
  },
  measureBox(contentW, contentH) {
    const padX = 34;
    const padY = 28;
    const width = Math.max(
      148,
      Math.ceil(contentW + padX * 2),
      Math.ceil(contentH + 56)
    );
    const height = Math.max(
      94,
      Math.ceil(contentH + padY * 2),
      Math.round(width * 0.64)
    );
    return { padX, padY, width, height };
  },
  clipRay: clipRayToEllipse,
  generateStrokes(input) {
    const { id, cx, cy, width, height, color, emphasized, dashed } = input;
    const rand = mulberry32(hashString(`shape:${id}`));
    const baseWidth = emphasized ? 3.3 : 2.6;
    const strokes: StrokePath[] = [];

    const rx = width / 2;
    const ry = height / 2;
    const steps = 42;
    const pts: Point[] = [];
    const startAngle = -Math.PI * 0.55;
    const totalAngle = Math.PI * 2.08;
    const phase = rand() * Math.PI * 2;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = startAngle + totalAngle * t;
      const radialJitter =
        1 +
        Math.sin(ang * 3 + phase) * 0.025 +
        (rand() - 0.5) * 0.022;
      const spiral = 1 + (t - 0.5) * 0.02;
      pts.push({
        x: cx + Math.cos(ang) * rx * radialJitter * spiral,
        y: cy + Math.sin(ang) * ry * radialJitter * spiral,
      });
    }

    strokes.push(
      buildStrokePath(`${id}-circle-1`, pts, {
        width: baseWidth,
        color,
        opacity: 0.94,
        dashed,
        speedFactor: 1.1,
      })
    );

    if (emphasized) {
      const pts2: Point[] = [];
      for (let i = 0; i <= 34; i++) {
        const t = i / 34;
        const ang = startAngle + 0.35 + Math.PI * 1.92 * t;
        pts2.push({
          x: cx + Math.cos(ang) * (rx + 2.5 + (rand() - 0.5) * 3),
          y: cy + Math.sin(ang) * (ry + 2.5 + (rand() - 0.5) * 3),
        });
      }
      strokes.push(
        buildStrokePath(`${id}-circle-2`, pts2, {
          width: 1.9,
          color,
          opacity: 0.55,
          dashed,
          speedFactor: 1.35,
        })
      );
    }

    return strokes;
  },
};
