import { ChalkColor, Point } from '../model/scene';
import { hashString, mulberry32 } from './random';

export interface StrokePath {
  id: string;
  points: Point[];
  width: number;
  color: ChalkColor;
  opacity: number;
  dashed?: boolean;
  speedFactor?: number;
  totalLength: number;
  cumLengths: number[];
}

export function buildStrokePath(
  id: string,
  points: Point[],
  options: {
    width: number;
    color: ChalkColor;
    opacity?: number;
    dashed?: boolean;
    speedFactor?: number;
  }
): StrokePath {
  const safePts =
    points.length >= 2
      ? points
      : [points[0] ?? { x: 0, y: 0 }, points[0] ?? { x: 0, y: 0 }];
  const cumLengths: number[] = [0];
  let total = 0;

  for (let i = 1; i < safePts.length; i++) {
    total += Math.hypot(
      safePts[i].x - safePts[i - 1].x,
      safePts[i].y - safePts[i - 1].y
    );
    cumLengths.push(total);
  }

  return {
    id,
    points: safePts,
    width: options.width,
    color: options.color,
    opacity: options.opacity ?? 0.94,
    dashed: options.dashed,
    speedFactor: options.speedFactor ?? 1,
    totalLength: total,
    cumLengths,
  };
}

export function samplePointAlongStroke(
  stroke: StrokePath,
  progress: number
): Point {
  const clamped = Math.max(0, Math.min(1, progress));
  const pts = stroke.points;
  if (pts.length === 0) return { x: 0, y: 0 };
  if (clamped <= 0) return pts[0];
  if (clamped >= 1 || stroke.totalLength <= 1e-4) return pts[pts.length - 1];

  const target = clamped * stroke.totalLength;
  const cum = stroke.cumLengths;
  let lo = 0;
  let hi = cum.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const segLen = cum[lo + 1] - cum[lo];
  const frac = segLen > 1e-5 ? (target - cum[lo]) / segLen : 0;
  return {
    x: pts[lo].x + (pts[lo + 1].x - pts[lo].x) * frac,
    y: pts[lo].y + (pts[lo + 1].y - pts[lo].y) * frac,
  };
}

export function sketchSegment(
  a: Point,
  b: Point,
  rand: () => number,
  wobbleAmp = 1.6,
  stepSize = 14
): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return [a, b];

  const steps = Math.max(3, Math.ceil(len / stepSize));
  const nx = -dy / len;
  const ny = dx / len;
  const bow = (rand() - 0.5) * wobbleAmp * 1.4;
  const phase = rand() * Math.PI * 2;
  const pts: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const envelope = Math.sin(t * Math.PI);
    const wave =
      bow * envelope +
      Math.sin(t * Math.PI * 2.5 + phase) * wobbleAmp * 0.45 * envelope +
      (rand() - 0.5) * wobbleAmp * 0.45 * envelope;
    pts.push({
      x: a.x + dx * t + nx * wave,
      y: a.y + dy * t + ny * wave,
    });
  }
  return pts;
}

export function sketchPolyline(
  points: Point[],
  seedStr: string,
  wobbleAmp = 1.4
): Point[] {
  if (points.length < 2) return points;
  const rand = mulberry32(hashString(seedStr));
  const out: Point[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const seg = sketchSegment(points[i], points[i + 1], rand, wobbleAmp, 12);
    if (i === 0) {
      out.push(...seg);
    } else {
      out.push(...seg.slice(1));
    }
  }
  return out;
}

export function buildRoundedRectPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  rand: () => number,
  overshoot = 4
): Point[] {
  const r = Math.min(radius, w * 0.25, h * 0.35);
  const corners: Point[] = [];
  const arcSteps = 5;

  const addArc = (cx: number, cy: number, startAng: number, endAng: number) => {
    for (let i = 0; i <= arcSteps; i++) {
      const a = startAng + ((endAng - startAng) * i) / arcSteps;
      corners.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };

  addArc(x + w - r, y + r, -Math.PI / 2, 0);
  addArc(x + w - r, y + h - r, 0, Math.PI / 2);
  addArc(x + r, y + h - r, Math.PI / 2, Math.PI);
  addArc(x + r, y + r, Math.PI, Math.PI * 1.5);

  const startPt = { x: x + r - overshoot * 0.5, y: y + (rand() - 0.5) * 1.5 };
  const endPt = { x: x + r + overshoot, y: y + (rand() - 0.5) * 1.8 };
  const baseLoop = [startPt, ...corners, endPt];

  const out: Point[] = [];
  for (let i = 0; i < baseLoop.length - 1; i++) {
    const seg = sketchSegment(baseLoop[i], baseLoop[i + 1], rand, 1.15, 16);
    if (i === 0) out.push(...seg);
    else out.push(...seg.slice(1));
  }
  return out;
}
