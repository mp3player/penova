import { ChalkColor, Point } from '../model/scene';
import { hashString, mulberry32 } from './random';

export type StrokeEasingMode = 'default' | 'linear' | 'crisp';

export interface StrokePath {
  id: string;
  points: Point[];
  width: number;
  color: ChalkColor;
  opacity: number;
  fillOpacity?: number;
  surfaceShadow?: boolean;
  dashed?: boolean;
  speedFactor?: number;
  easing?: StrokeEasingMode;
  cornerCosts?: number[];
  totalLength: number;
  cumLengths: number[];
}

function computeCornerCosts(points: Point[]): number[] {
  const n = points.length;
  if (n < 2) return [];
  const vertexSharp = new Array<number>(n).fill(0);

  for (let i = 1; i < n - 1; i++) {
    const dx1 = points[i].x - points[i - 1].x;
    const dy1 = points[i].y - points[i - 1].y;
    const dx2 = points[i + 1].x - points[i].x;
    const dy2 = points[i + 1].y - points[i].y;
    const l1 = Math.hypot(dx1, dy1);
    const l2 = Math.hypot(dx2, dy2);
    if (l1 < 1e-4 || l2 < 1e-4) continue;
    const dot = (dx1 * dx2 + dy1 * dy2) / (l1 * l2);
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const turn = Math.acos(clampedDot);
    vertexSharp[i] =
      turn > 0.35 ? Math.min(1, (turn - 0.35) / (Math.PI * 0.65)) : 0;
  }

  const costs = new Array<number>(n - 1);
  for (let k = 0; k < n - 1; k++) {
    costs[k] = 0.5 * vertexSharp[k] + 0.5 * vertexSharp[k + 1];
  }
  return costs;
}

export function buildStrokePath(
  id: string,
  points: Point[],
  options: {
    width: number;
    color: ChalkColor;
    opacity?: number;
    fillOpacity?: number;
    surfaceShadow?: boolean;
    dashed?: boolean;
    speedFactor?: number;
    easing?: StrokeEasingMode;
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
    fillOpacity: options.fillOpacity,
    surfaceShadow: options.surfaceShadow,
    dashed: options.dashed,
    speedFactor: options.speedFactor ?? 1,
    easing: options.easing,
    cornerCosts: computeCornerCosts(safePts),
    totalLength: total,
    cumLengths,
  };
}

export function buildStrokeCornerTimeTable(
  stroke: StrokePath,
  cornerSlowdown: number
): number[] | undefined {
  if (
    cornerSlowdown <= 0.01 ||
    !stroke.cornerCosts ||
    stroke.cornerCosts.length === 0 ||
    stroke.totalLength <= 1e-4
  ) {
    return undefined;
  }

  const cornerPenaltyScale = Math.min(36, stroke.totalLength * 0.18);
  const rawTimes: number[] = [0];
  let acc = 0;

  for (let k = 0; k < stroke.cornerCosts.length; k++) {
    const segLen = Math.max(0, stroke.cumLengths[k + 1] - stroke.cumLengths[k]);
    const extra = cornerSlowdown * stroke.cornerCosts[k] * cornerPenaltyScale;
    acc += segLen + extra;
    rawTimes.push(acc);
  }

  if (acc <= 1e-4) return undefined;
  return rawTimes.map((t) => t / acc);
}

export function evaluateStrokeProgress(
  stroke: StrokePath,
  rawU: number,
  opts?: {
    endDecel?: number;
    cornerSlowdown?: number;
    cumTime?: number[];
  }
): { progress: number; velocity: number } {
  const u = Math.max(0, Math.min(1, rawU));
  if (u <= 0) return { progress: 0, velocity: 0 };
  if (u >= 1) return { progress: 1, velocity: 0 };

  const baseDecel = opts?.endDecel ?? 0;
  const effDecel =
    stroke.easing === 'linear'
      ? 0
      : stroke.easing === 'crisp'
      ? baseDecel * 0.45
      : baseDecel;
  const d = Math.max(0, Math.min(1, effDecel));

  let easedU = u;
  let velocity = 1;
  if (d > 1e-4) {
    const pExp = 1 + 1.45 * d;
    const oneMinus = 1 - u;
    const base = 1 - Math.pow(oneMinus, pExp);
    const dBase = pExp * Math.pow(oneMinus, Math.max(0, pExp - 1));
    const smooth = u * u * (3 - 2 * u);
    const dSmooth = 6 * u * (1 - u);
    const wSmooth = 0.15 * d;
    easedU = (1 - wSmooth) * base + wSmooth * smooth;
    const derivU = (1 - wSmooth) * dBase + wSmooth * dSmooth;
    velocity = Math.max(0.08, Math.min(1, derivU / Math.max(1, pExp)));
  }

  const cumTime =
    opts?.cumTime ??
    ((opts?.cornerSlowdown ?? 0) > 0.01
      ? buildStrokeCornerTimeTable(stroke, opts!.cornerSlowdown!)
      : undefined);

  if (
    cumTime &&
    cumTime.length === stroke.cumLengths.length &&
    stroke.totalLength > 1e-4
  ) {
    let lo = 0;
    let hi = cumTime.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (cumTime[mid] <= easedU) lo = mid;
      else hi = mid;
    }
    const segTimeFrac = Math.max(1e-5, cumTime[lo + 1] - cumTime[lo]);
    const localU = Math.max(0, Math.min(1, (easedU - cumTime[lo]) / segTimeFrac));
    const spatialStart = stroke.cumLengths[lo];
    const segSpatialLen = stroke.cumLengths[lo + 1] - spatialStart;
    const segSpatialFrac = segSpatialLen / stroke.totalLength;
    const cornerScale = Math.max(
      0.22,
      Math.min(1.35, segSpatialFrac / segTimeFrac)
    );
    return {
      progress: Math.max(
        0,
        Math.min(1, (spatialStart + segSpatialLen * localU) / stroke.totalLength)
      ),
      velocity: Math.max(0.08, Math.min(1, velocity * cornerScale)),
    };
  }

  return {
    progress: Math.max(0, Math.min(1, easedU)),
    velocity,
  };
}

export function easeGlyphProgress(rawU: number, endDecel: number): number {
  const u = Math.max(0, Math.min(1, rawU));
  if (u <= 0 || u >= 1) return u;
  const d = Math.max(0, Math.min(1, endDecel));
  if (d <= 1e-4) return u;
  return 1 - Math.pow(1 - u, 1 + 0.75 * d);
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
