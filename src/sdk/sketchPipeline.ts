import { ChalkColor, Point } from '../model/scene';
import { hashString, mulberry32 } from './random';
import { buildStrokePath, sketchPolyline, StrokePath } from './strokePath';
import {
  compileWorkflowGraph,
  createAtomicNode,
  GRAPH_INPUT_ID,
  WorkflowContext,
} from './workflowDag';

export interface SketchRawPolyline {
  id: string;
  points: Point[];
  closed: boolean;
  colorHint?: ChalkColor;
  fill?: boolean;
}

export interface SketchGrayBitmap {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface SketchBinaryMask {
  width: number;
  height: number;
  mask: Uint8Array;
}

export type SketchAssetInput =
  | { kind: 'svg'; svgText: string }
  | { kind: 'bitmap'; bitmap: SketchGrayBitmap; threshold?: number; invert?: boolean };

export interface SketchPipelineOptions {
  seed?: string;
  centerX?: number;
  centerY?: number;
  targetWidth?: number;
  targetHeight?: number;
  defaultColor?: ChalkColor;
  strokeWidth?: number;
  opacity?: number;
  wobbleAmp?: number;
  orderStrategy?: 'nearest-top-down' | 'longest-first' | 'preserve';
  fillClosedShapes?: boolean;
}

export interface SketchPipelineRequest {
  asset: SketchAssetInput;
  options?: SketchPipelineOptions;
}

interface ExtractedSketchSvgPath {
  id: string;
  d: string;
  colorHint?: ChalkColor;
  fill: boolean;
}

interface SketchBitmapBranchInput {
  bitmap: SketchGrayBitmap;
  threshold?: number;
  invert?: boolean;
}

interface SketchPostProcessInput {
  polylines: SketchRawPolyline[];
  options: SketchPipelineOptions;
}

function mapSvgStrokeColorHint(raw?: string): ChalkColor | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (!v || v === 'none' || v === 'transparent') return undefined;
  if (
    v === 'white' ||
    v === 'yellow' ||
    v === 'cyan' ||
    v === 'pink' ||
    v === 'green' ||
    v === 'orange'
  ) {
    return v;
  }
  if (v.includes('gold') || v.includes('amber')) return 'yellow';
  if (v.includes('blue') || v.includes('cyan') || v.includes('sky')) return 'cyan';
  if (v.includes('red') || v.includes('pink') || v.includes('rose')) return 'pink';
  if (v.includes('green') || v.includes('emerald') || v.includes('mint')) return 'green';
  if (v.includes('orange')) return 'orange';
  return undefined;
}

function readSvgAttr(tag: string, name: string): string | undefined {
  const re = new RegExp(`(?:^|[\\s<])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const m = tag.match(re);
  return m ? m[1] ?? m[2] : undefined;
}

function readSvgNum(tag: string, name: string, fallback = 0): number {
  const raw = readSvgAttr(tag, name);
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function stripHiddenSvgBlocks(svgText: string): string {
  return svgText
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(defs|clipPath|mask|symbol)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
}

function extractSvgPrimitivesFn(svgText: string): ExtractedSketchSvgPath[] {
  const out: ExtractedSketchSvgPath[] = [];
  const cleanedSvg = stripHiddenSvgBlocks(svgText);
  const tagRe = /<(path|line|rect|circle|ellipse|polyline|polygon)\b([^>]*?)\/?>/gi;
  let match: RegExpExecArray | null;
  let seq = 0;

  while ((match = tagRe.exec(cleanedSvg)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = match[2];
    const id = readSvgAttr(attrs, 'id') ?? `svg-${tagName}-${seq++}`;
    const strokeAttr = readSvgAttr(attrs, 'stroke');
    const fillAttr = readSvgAttr(attrs, 'fill');
    const fillNorm = fillAttr?.trim().toLowerCase();
    const fill = fillNorm !== 'none' && fillNorm !== 'transparent';
    const colorHint = mapSvgStrokeColorHint(strokeAttr);

    if (tagName === 'path') {
      const d = readSvgAttr(attrs, 'd');
      if (d && d.trim()) out.push({ id, d, colorHint, fill });
      continue;
    }

    if (tagName === 'line') {
      const x1 = readSvgNum(attrs, 'x1');
      const y1 = readSvgNum(attrs, 'y1');
      const x2 = readSvgNum(attrs, 'x2');
      const y2 = readSvgNum(attrs, 'y2');
      out.push({ id, d: `M ${x1} ${y1} L ${x2} ${y2}`, colorHint, fill: false });
      continue;
    }

    if (tagName === 'rect') {
      const x = readSvgNum(attrs, 'x');
      const y = readSvgNum(attrs, 'y');
      const w = readSvgNum(attrs, 'width');
      const h = readSvgNum(attrs, 'height');
      if (w <= 0 || h <= 0) continue;
      let rx = readSvgNum(attrs, 'rx', readSvgNum(attrs, 'ry', 0));
      let ry = readSvgNum(attrs, 'ry', rx);
      rx = Math.max(0, Math.min(rx, w / 2));
      ry = Math.max(0, Math.min(ry, h / 2));
      const d =
        rx > 0.2 || ry > 0.2
          ? `M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} L ${x + w} ${y + h - ry} A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} L ${x + rx} ${y + h} A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} L ${x} ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
          : `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      out.push({ id, d, colorHint, fill });
      continue;
    }

    if (tagName === 'circle' || tagName === 'ellipse') {
      const cx = readSvgNum(attrs, 'cx');
      const cy = readSvgNum(attrs, 'cy');
      const rx =
        tagName === 'circle' ? readSvgNum(attrs, 'r') : readSvgNum(attrs, 'rx');
      const ry = tagName === 'circle' ? rx : readSvgNum(attrs, 'ry', rx);
      if (rx <= 0 || ry <= 0) continue;
      const d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
      out.push({ id, d, colorHint, fill });
      continue;
    }

    if (tagName === 'polyline' || tagName === 'polygon') {
      const rawPts = readSvgAttr(attrs, 'points') ?? '';
      const nums = rawPts
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter(Number.isFinite);
      if (nums.length < 4) continue;
      const segs = [`M ${nums[0]} ${nums[1]}`];
      for (let i = 2; i + 1 < nums.length; i += 2) {
        segs.push(`L ${nums[i]} ${nums[i + 1]}`);
      }
      if (tagName === 'polygon') segs.push('Z');
      out.push({ id, d: segs.join(' '), colorHint, fill });
    }
  }

  return out;
}

function sampleSvgArc(
  p0: Point,
  rxRaw: number,
  ryRaw: number,
  angleDeg: number,
  largeArcFlag: number,
  sweepFlag: number,
  p1: Point
): Point[] {
  if (Math.hypot(p1.x - p0.x, p1.y - p0.y) < 1e-5) return [];
  if (rxRaw === 0 || ryRaw === 0) return [p1];

  let rx = Math.abs(rxRaw);
  let ry = Math.abs(ryRaw);
  const phi = (angleDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (p0.x - p1.x) / 2;
  const dy2 = (p0.y - p1.y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;
  const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
  const den = rx2 * y1p2 + ry2 * x1p2;
  const coef =
    (largeArcFlag !== sweepFlag ? 1 : -1) *
    (den > 1e-9 ? Math.sqrt(num / den) : 0);

  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

  const vecAngle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
    const ang = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    return ux * vy - uy * vx < 0 ? -ang : ang;
  };

  const theta1 = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = vecAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );
  if (!sweepFlag && dTheta > 0) dTheta -= Math.PI * 2;
  if (sweepFlag && dTheta < 0) dTheta += Math.PI * 2;

  const steps = Math.max(8, Math.ceil((Math.abs(dTheta) / (Math.PI * 2)) * 28));
  const pts: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = theta1 + (dTheta * i) / steps;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    pts.push({
      x: cx + cosPhi * rx * cosT - sinPhi * ry * sinT,
      y: cy + sinPhi * rx * cosT + cosPhi * ry * sinT,
    });
  }
  return pts;
}

function sampleSvgDToPolylines(
  baseId: string,
  d: string,
  colorHint?: ChalkColor,
  fill = false
): SketchRawPolyline[] {
  const polylines: SketchRawPolyline[] = [];
  let pos = 0;
  const len = d.length;
  let cmd = '';
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let currentPts: Point[] = [];
  let lastCubicCtrl: Point | null = null;
  let lastQuadCtrl: Point | null = null;
  let subSeq = 0;

  const flushSubpath = (closed: boolean) => {
    if (currentPts.length >= 2) {
      polylines.push({
        id: subSeq === 0 ? baseId : `${baseId}-${subSeq}`,
        points: currentPts,
        closed,
        colorHint,
        fill,
      });
      subSeq++;
    }
    currentPts = [];
  };

  const skipSep = () => {
    while (pos < len) {
      const ch = d[pos];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') {
        pos++;
      } else {
        break;
      }
    }
  };

  const numRe = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y;
  const hasNumberAhead = (): boolean => {
    skipSep();
    if (pos >= len) return false;
    numRe.lastIndex = pos;
    return numRe.test(d);
  };

  const readNumber = (): number | null => {
    skipSep();
    if (pos >= len) return null;
    numRe.lastIndex = pos;
    const m = numRe.exec(d);
    if (!m) return null;
    const n = Number.parseFloat(m[0]);
    if (!Number.isFinite(n)) return null;
    pos = numRe.lastIndex;
    return n;
  };

  const readFlag = (): number | null => {
    skipSep();
    if (pos >= len) return null;
    const ch = d[pos];
    if (ch === '0' || ch === '1') {
      pos++;
      return ch === '1' ? 1 : 0;
    }
    return null;
  };

  let abort = false;
  while (pos < len && !abort) {
    skipSep();
    if (pos >= len) break;

    if (/[MmLlHhVvQqTtCcSsAaZz]/.test(d[pos])) {
      cmd = d[pos++];
      if (cmd === 'Z' || cmd === 'z') {
        if (
          currentPts.length > 0 &&
          Math.hypot(cur.x - start.x, cur.y - start.y) > 0.5
        ) {
          currentPts.push({ ...start });
        }
        cur = { ...start };
        flushSubpath(true);
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        continue;
      }
    } else if (!cmd || !hasNumberAhead()) {
      pos++;
      continue;
    }

    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    if (C === 'M') {
      const rx = readNumber();
      const ry = readNumber();
      if (rx === null || ry === null) {
        abort = true;
        break;
      }
      flushSubpath(false);
      const x = rx + (rel ? cur.x : 0);
      const y = ry + (rel ? cur.y : 0);
      cur = { x, y };
      start = { x, y };
      currentPts = [{ x, y }];
      lastCubicCtrl = null;
      lastQuadCtrl = null;
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      while (hasNumberAhead()) {
        const rx = readNumber();
        const ry = readNumber();
        if (rx === null || ry === null) {
          abort = true;
          break;
        }
        const x = rx + (rel ? cur.x : 0);
        const y = ry + (rel ? cur.y : 0);
        cur = { x, y };
        currentPts.push({ x, y });
        lastCubicCtrl = null;
        lastQuadCtrl = null;
      }
    } else if (C === 'H') {
      while (hasNumberAhead()) {
        const rx = readNumber();
        if (rx === null) {
          abort = true;
          break;
        }
        const x = rx + (rel ? cur.x : 0);
        cur = { x, y: cur.y };
        currentPts.push({ ...cur });
        lastCubicCtrl = null;
        lastQuadCtrl = null;
      }
    } else if (C === 'V') {
      while (hasNumberAhead()) {
        const ry = readNumber();
        if (ry === null) {
          abort = true;
          break;
        }
        const y = ry + (rel ? cur.y : 0);
        cur = { x: cur.x, y };
        currentPts.push({ ...cur });
        lastCubicCtrl = null;
        lastQuadCtrl = null;
      }
    } else if (C === 'Q' || C === 'T') {
      while (hasNumberAhead()) {
        let cp: Point;
        if (C === 'Q') {
          const cx1 = readNumber();
          const cy1 = readNumber();
          if (cx1 === null || cy1 === null) {
            abort = true;
            break;
          }
          cp = {
            x: cx1 + (rel ? cur.x : 0),
            y: cy1 + (rel ? cur.y : 0),
          };
        } else {
          cp = lastQuadCtrl
            ? { x: 2 * cur.x - lastQuadCtrl.x, y: 2 * cur.y - lastQuadCtrl.y }
            : { ...cur };
        }
        const rx2 = readNumber();
        const ry2 = readNumber();
        if (rx2 === null || ry2 === null) {
          abort = true;
          break;
        }
        const p2 = {
          x: rx2 + (rel ? cur.x : 0),
          y: ry2 + (rel ? cur.y : 0),
        };
        const p0 = { ...cur };
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const mt = 1 - t;
          currentPts.push({
            x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p2.y,
          });
        }
        cur = p2;
        lastQuadCtrl = cp;
        lastCubicCtrl = null;
      }
    } else if (C === 'C' || C === 'S') {
      while (hasNumberAhead()) {
        let c1: Point;
        if (C === 'C') {
          const cx1 = readNumber();
          const cy1 = readNumber();
          if (cx1 === null || cy1 === null) {
            abort = true;
            break;
          }
          c1 = {
            x: cx1 + (rel ? cur.x : 0),
            y: cy1 + (rel ? cur.y : 0),
          };
        } else {
          c1 = lastCubicCtrl
            ? { x: 2 * cur.x - lastCubicCtrl.x, y: 2 * cur.y - lastCubicCtrl.y }
            : { ...cur };
        }
        const cx2 = readNumber();
        const cy2 = readNumber();
        const rx3 = readNumber();
        const ry3 = readNumber();
        if (cx2 === null || cy2 === null || rx3 === null || ry3 === null) {
          abort = true;
          break;
        }
        const c2 = {
          x: cx2 + (rel ? cur.x : 0),
          y: cy2 + (rel ? cur.y : 0),
        };
        const p3 = {
          x: rx3 + (rel ? cur.x : 0),
          y: ry3 + (rel ? cur.y : 0),
        };
        const p0 = { ...cur };
        const steps = 12;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const mt = 1 - t;
          currentPts.push({
            x:
              mt * mt * mt * p0.x +
              3 * mt * mt * t * c1.x +
              3 * mt * t * t * c2.x +
              t * t * t * p3.x,
            y:
              mt * mt * mt * p0.y +
              3 * mt * mt * t * c1.y +
              3 * mt * t * t * c2.y +
              t * t * t * p3.y,
          });
        }
        cur = p3;
        lastCubicCtrl = c2;
        lastQuadCtrl = null;
      }
    } else if (C === 'A') {
      while (hasNumberAhead()) {
        const rx = readNumber();
        const ry = readNumber();
        const rot = readNumber();
        const largeArc = readFlag();
        const sweep = readFlag();
        const rxEnd = readNumber();
        const ryEnd = readNumber();
        if (
          rx === null ||
          ry === null ||
          rot === null ||
          largeArc === null ||
          sweep === null ||
          rxEnd === null ||
          ryEnd === null
        ) {
          abort = true;
          break;
        }
        const p1 = {
          x: rxEnd + (rel ? cur.x : 0),
          y: ryEnd + (rel ? cur.y : 0),
        };
        const arcPts = sampleSvgArc(cur, rx, ry, rot, largeArc, sweep, p1);
        currentPts.push(...arcPts);
        cur = p1;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
      }
    } else {
      break;
    }
  }

  flushSubpath(false);
  return polylines;
}

export const extractSvgPrimitivesNode = createAtomicNode<
  string,
  ExtractedSketchSvgPath[]
>('svg.extractPrimitives', extractSvgPrimitivesFn);

export const sampleSvgCurvesNode = createAtomicNode<
  ExtractedSketchSvgPath[],
  SketchRawPolyline[]
>('svg.sampleCurves', (items) => {
  const out: SketchRawPolyline[] = [];
  for (const item of items) {
    out.push(...sampleSvgDToPolylines(item.id, item.d, item.colorHint, item.fill));
  }
  return out;
});

export const svgToPolylinesWorkflow = compileWorkflowGraph<
  string,
  SketchRawPolyline[]
>({
  id: 'svg.toPolylines',
  nodes: [
    {
      id: 'svg.extractPrimitives',
      node: extractSvgPrimitivesNode,
      from: [GRAPH_INPUT_ID],
    },
    {
      id: 'svg.sampleCurves',
      node: sampleSvgCurvesNode,
      from: ['svg.extractPrimitives'],
    },
  ],
  output: 'svg.sampleCurves',
});

function computeOtsuThreshold(data: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) {
    hist[data[i]]++;
  }
  const total = data.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

export const binarizeBitmapNode = createAtomicNode<
  SketchBitmapBranchInput,
  SketchBinaryMask
>('bitmap.binarize', ({ bitmap, threshold, invert }) => {
  const { width, height, data } = bitmap;
  if (width <= 0 || height <= 0 || data.length < width * height) {
    return {
      width: Math.max(0, width),
      height: Math.max(0, height),
      mask: new Uint8Array(0),
    };
  }
  const pixelCount = width * height;
  const thresh = threshold ?? computeOtsuThreshold(data);
  const mask = new Uint8Array(pixelCount);

  let below = 0;
  for (let i = 0; i < pixelCount; i++) {
    if (data[i] <= thresh) below++;
  }
  const darkIsInk = invert !== undefined ? !invert : below <= pixelCount / 2;

  for (let i = 0; i < pixelCount; i++) {
    const isDark = data[i] <= thresh;
    mask[i] = darkIsInk ? (isDark ? 1 : 0) : isDark ? 0 : 1;
  }
  return { width, height, mask };
});

export const zhangSuenThinningNode = createAtomicNode<
  SketchBinaryMask,
  SketchBinaryMask
>('bitmap.thinning', ({ width, height, mask }) => {
  if (width < 3 || height < 3 || mask.length < width * height) {
    return { width, height, mask: new Uint8Array(mask) };
  }
  const img = new Uint8Array(mask);
  for (let x = 0; x < width; x++) {
    img[x] = 0;
    img[(height - 1) * width + x] = 0;
  }
  for (let y = 0; y < height; y++) {
    img[y * width] = 0;
    img[y * width + (width - 1)] = 0;
  }

  const toDelete: number[] = [];

  for (let pass = 0; pass < 64; pass++) {
    let changed = false;

    for (let sub = 0; sub < 2; sub++) {
      toDelete.length = 0;
      for (let y = 1; y < height - 1; y++) {
        const row = y * width;
        for (let x = 1; x < width - 1; x++) {
          const idx = row + x;
          if (img[idx] === 0) continue;

          const p2 = img[idx - width];
          const p3 = img[idx - width + 1];
          const p4 = img[idx + 1];
          const p5 = img[idx + width + 1];
          const p6 = img[idx + width];
          const p7 = img[idx + width - 1];
          const p8 = img[idx - 1];
          const p9 = img[idx - width - 1];

          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;

          let a = 0;
          if (p2 === 0 && p3 === 1) a++;
          if (p3 === 0 && p4 === 1) a++;
          if (p4 === 0 && p5 === 1) a++;
          if (p5 === 0 && p6 === 1) a++;
          if (p6 === 0 && p7 === 1) a++;
          if (p7 === 0 && p8 === 1) a++;
          if (p8 === 0 && p9 === 1) a++;
          if (p9 === 0 && p2 === 1) a++;
          if (a !== 1) continue;

          if (sub === 0) {
            if (p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
              toDelete.push(idx);
            }
          } else {
            if (p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
              toDelete.push(idx);
            }
          }
        }
      }
      if (toDelete.length > 0) {
        changed = true;
        for (const idx of toDelete) img[idx] = 0;
      }
    }

    if (!changed) break;
  }

  // Sequential staircase-elbow cleanup preserving 8-connectivity and endpoints
  const ringCoords = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      if (img[idx] === 0) continue;

      const p2 = img[idx - width];
      const p3 = img[idx - width + 1];
      const p4 = img[idx + 1];
      const p5 = img[idx + width + 1];
      const p6 = img[idx + width];
      const p7 = img[idx + width - 1];
      const p8 = img[idx - 1];
      const p9 = img[idx - width - 1];

      const hasOrthElbow =
        (p2 === 1 && p4 === 1) ||
        (p4 === 1 && p6 === 1) ||
        (p6 === 1 && p8 === 1) ||
        (p8 === 1 && p2 === 1);
      if (!hasOrthElbow) continue;

      const ring = [p2, p3, p4, p5, p6, p7, p8, p9];
      const seen = [false, false, false, false, false, false, false, false];
      let components = 0;
      for (let s = 0; s < 8; s++) {
        if (ring[s] === 0 || seen[s]) continue;
        components++;
        if (components > 1) break;
        const stack = [s];
        seen[s] = true;
        while (stack.length > 0) {
          const u = stack.pop()!;
          for (let v = 0; v < 8; v++) {
            if (ring[v] === 1 && !seen[v]) {
              const dx = Math.abs(ringCoords[u][0] - ringCoords[v][0]);
              const dy = Math.abs(ringCoords[u][1] - ringCoords[v][1]);
              if (dx <= 1 && dy <= 1) {
                seen[v] = true;
                stack.push(v);
              }
            }
          }
        }
      }
      if (components === 1) {
        img[idx] = 0;
      }
    }
  }

  return { width, height, mask: img };
});

const SKELETON_NEIGHBORS = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
] as const;

function skelEdgeKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function sketchPolylineLen(pts: Point[]): number {
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    sum += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return sum;
}

export const traceSkeletonPolylinesNode = createAtomicNode<
  SketchBinaryMask,
  SketchRawPolyline[]
>('bitmap.tracePolylines', ({ width, height, mask }) => {
  const neighborsOf = new Map<number, number[]>();
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (mask[idx] === 0) continue;
      const nbs: number[] = [];
      for (const [dx, dy] of SKELETON_NEIGHBORS) {
        const nIdx = (y + dy) * width + (x + dx);
        if (mask[nIdx] === 1) nbs.push(nIdx);
      }
      neighborsOf.set(idx, nbs);
    }
  }

  const visitedEdges = new Set<string>();
  const rawChains: number[][] = [];

  const walkChain = (startIdx: number, firstNextIdx: number): number[] => {
    const chain = [startIdx, firstNextIdx];
    visitedEdges.add(skelEdgeKey(startIdx, firstNextIdx));
    let prev = startIdx;
    let curr = firstNextIdx;

    while (true) {
      const nbs = neighborsOf.get(curr) ?? [];
      if (curr === startIdx) break;
      if (nbs.length !== 2 && nbs.length > 0) {
        const unvisited = nbs.filter((n) => !visitedEdges.has(skelEdgeKey(curr, n)));
        if (nbs.length >= 3 || unvisited.length === 0) break;
      }

      const dirX = (curr % width) - (prev % width);
      const dirY = Math.floor(curr / width) - Math.floor(prev / width);
      const dirLen = Math.hypot(dirX, dirY) || 1;

      const candidates = nbs.filter(
        (n) => n !== prev && !visitedEdges.has(skelEdgeKey(curr, n))
      );
      if (candidates.length === 0) break;

      candidates.sort((a, b) => {
        const ax = (a % width) - (curr % width);
        const ay = Math.floor(a / width) - Math.floor(curr / width);
        const bx = (b % width) - (curr % width);
        const by = Math.floor(b / width) - Math.floor(curr / width);
        const dotA = (ax * dirX + ay * dirY) / ((Math.hypot(ax, ay) || 1) * dirLen);
        const dotB = (bx * dirX + by * dirY) / ((Math.hypot(bx, by) || 1) * dirLen);
        return dotB - dotA;
      });

      const next = candidates[0];
      visitedEdges.add(skelEdgeKey(curr, next));
      chain.push(next);
      prev = curr;
      curr = next;
    }
    return chain;
  };

  const anchors = [...neighborsOf.entries()]
    .filter(([, nbs]) => nbs.length === 1 || nbs.length >= 3)
    .sort((a, b) => a[1].length - b[1].length);

  for (const [startIdx, nbs] of anchors) {
    for (const nextIdx of nbs) {
      if (!visitedEdges.has(skelEdgeKey(startIdx, nextIdx))) {
        rawChains.push(walkChain(startIdx, nextIdx));
      }
    }
  }

  for (const [startIdx, nbs] of neighborsOf.entries()) {
    for (const nextIdx of nbs) {
      if (!visitedEdges.has(skelEdgeKey(startIdx, nextIdx))) {
        rawChains.push(walkChain(startIdx, nextIdx));
      }
    }
  }

  const chains = rawChains.map((c) => [...c]);
  const junctionOutTangent = (chain: number[], atStart: boolean): Point => {
    const a = atStart ? chain[0] : chain[chain.length - 1];
    const lookIdx = atStart
      ? Math.min(chain.length - 1, 5)
      : Math.max(0, chain.length - 1 - 5);
    const b = chain[lookIdx];
    const dx = (b % width) - (a % width);
    const dy = Math.floor(b / width) - Math.floor(a / width);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  };

  const mergeCosThreshold = Math.cos((42 * Math.PI) / 180);
  let mergedAny = true;
  while (mergedAny) {
    mergedAny = false;
    for (let i = 0; i < chains.length; i++) {
      if (chains[i].length === 0) continue;
      for (const endIsStart of [false, true]) {
        const jNode = endIsStart ? chains[i][0] : chains[i][chains[i].length - 1];
        if ((neighborsOf.get(jNode)?.length ?? 0) < 3) continue;
        const tI = junctionOutTangent(chains[i], endIsStart);

        let bestJ = -1;
        let bestJAtStart = true;
        let bestAlign = -Infinity;

        for (let j = i + 1; j < chains.length; j++) {
          if (chains[j].length === 0) continue;
          for (const jStart of [true, false]) {
            const candNode = jStart ? chains[j][0] : chains[j][chains[j].length - 1];
            if (candNode !== jNode) continue;
            const tJ = junctionOutTangent(chains[j], jStart);
            const align = -(tI.x * tJ.x + tI.y * tJ.y);
            if (align > mergeCosThreshold && align > bestAlign) {
              bestAlign = align;
              bestJ = j;
              bestJAtStart = jStart;
            }
          }
        }

        if (bestJ !== -1) {
          const cA = endIsStart ? [...chains[i]].reverse() : chains[i];
          const cB = bestJAtStart ? chains[bestJ] : [...chains[bestJ]].reverse();
          chains[i] = [...cA, ...cB.slice(1)];
          chains[bestJ] = [];
          mergedAny = true;
          break;
        }
      }
      if (mergedAny) break;
    }
  }

  const polylines: SketchRawPolyline[] = [];
  let seq = 0;
  for (const ch of chains) {
    if (ch.length < 4) continue;
    const pts: Point[] = ch.map((idx) => ({
      x: idx % width,
      y: Math.floor(idx / width),
    }));
    if (sketchPolylineLen(pts) < 4) continue;
    const head = pts[0];
    const tail = pts[pts.length - 1];
    const closed = Math.hypot(tail.x - head.x, tail.y - head.y) <= 2.5;
    polylines.push({
      id: `skel-${seq++}`,
      points: pts,
      closed,
    });
  }

  return polylines;
});

function perpendicularPtDist(pt: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return Math.hypot(pt.x - a.x, pt.y - a.y);
  return Math.abs(dy * pt.x - dx * pt.y + b.x * a.y - b.y * a.x) / len;
}

function rdpSimplifyPts(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularPtDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplifyPts(points.slice(0, index + 1), epsilon);
    const right = rdpSimplifyPts(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function chaikinSmoothPts(points: Point[], closed: boolean): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [];
  if (!closed) out.push(points[0]);
  const limit = closed ? points.length : points.length - 1;
  for (let i = 0; i < limit; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
    out.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
  }
  if (!closed) {
    out.push(points[points.length - 1]);
  } else if (out.length > 0) {
    out.push({ ...out[0] });
  }
  return out;
}

export const simplifyBitmapPolylinesNode = createAtomicNode<
  SketchRawPolyline[],
  SketchRawPolyline[]
>('bitmap.simplify', (polylines) => {
  return polylines
    .map((poly) => ({
      ...poly,
      points: chaikinSmoothPts(rdpSimplifyPts(poly.points, 1.4), poly.closed),
    }))
    .filter((p) => p.points.length >= 2);
});

export const bitmapToPolylinesWorkflow = compileWorkflowGraph<
  SketchBitmapBranchInput,
  SketchRawPolyline[]
>({
  id: 'bitmap.toPolylines',
  nodes: [
    {
      id: 'bitmap.binarize',
      node: binarizeBitmapNode,
      from: [GRAPH_INPUT_ID],
    },
    {
      id: 'bitmap.thinning',
      node: zhangSuenThinningNode,
      from: ['bitmap.binarize'],
    },
    {
      id: 'bitmap.tracePolylines',
      node: traceSkeletonPolylinesNode,
      from: ['bitmap.thinning'],
    },
    {
      id: 'bitmap.simplify',
      node: simplifyBitmapPolylinesNode,
      from: ['bitmap.tracePolylines'],
    },
  ],
  output: 'bitmap.simplify',
});

export const normalizeSketchFitNode = createAtomicNode<
  SketchPostProcessInput,
  SketchPostProcessInput
>('sketch.normalizeFit', ({ polylines, options }) => {
  if (polylines.length === 0) return { polylines: [], options };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const poly of polylines) {
    for (const pt of poly.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
  }

  const srcW = Math.max(1e-3, maxX - minX);
  const srcH = Math.max(1e-3, maxY - minY);
  const targetW = options.targetWidth ?? 180;
  const targetH = options.targetHeight ?? 180;
  const cx = options.centerX ?? 0;
  const cy = options.centerY ?? 0;

  const scale = Math.min(targetW / srcW, targetH / srcH);
  const srcMidX = (minX + maxX) / 2;
  const srcMidY = (minY + maxY) / 2;

  return {
    polylines: polylines.map((poly) => ({
      ...poly,
      points: poly.points.map((pt) => ({
        x: cx + (pt.x - srcMidX) * scale,
        y: cy + (pt.y - srcMidY) * scale,
      })),
    })),
    options,
  };
});

export const orderSketchStrokesNode = createAtomicNode<
  SketchPostProcessInput,
  SketchPostProcessInput
>('sketch.orderStrokes', ({ polylines, options }) => {
  const strategy = options.orderStrategy ?? 'nearest-top-down';
  if (polylines.length <= 1 || strategy === 'preserve') {
    return { polylines, options };
  }

  if (strategy === 'longest-first') {
    return {
      polylines: [...polylines].sort(
        (a, b) => sketchPolylineLen(b.points) - sketchPolylineLen(a.points)
      ),
      options,
    };
  }

  const remaining = polylines.map((p) => ({
    ...p,
    points: [...p.points],
  }));

  let bestStartIdx = 0;
  let bestScore = Infinity;
  for (let i = 0; i < remaining.length; i++) {
    const pts = remaining[i].points;
    const head = pts[0];
    const lenBonus = Math.min(60, sketchPolylineLen(pts) * 0.12);
    const score = head.y * 1.15 + head.x * 0.7 - lenBonus;
    if (score < bestScore) {
      bestScore = score;
      bestStartIdx = i;
    }
  }

  const ordered: SketchRawPolyline[] = [];
  let current = remaining.splice(bestStartIdx, 1)[0];
  ordered.push(current);

  while (remaining.length > 0) {
    const penPos = current.points[current.points.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    let shouldReverse = false;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const head = cand.points[0];
      const tail = cand.points[cand.points.length - 1];
      const dHead = Math.hypot(head.x - penPos.x, head.y - penPos.y);
      const dTail = cand.closed
        ? Infinity
        : Math.hypot(tail.x - penPos.x, tail.y - penPos.y);

      if (dHead < nearestDist) {
        nearestDist = dHead;
        nearestIdx = i;
        shouldReverse = false;
      }
      if (dTail < nearestDist) {
        nearestDist = dTail;
        nearestIdx = i;
        shouldReverse = true;
      }
    }

    const nextPoly = remaining.splice(nearestIdx, 1)[0];
    if (shouldReverse) nextPoly.points.reverse();
    ordered.push(nextPoly);
    current = nextPoly;
  }

  return { polylines: ordered, options };
});

function subdivideSketchPolyline(points: Point[], maxStep = 12): Point[] {
  if (points.length < 2) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / maxStep));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

export const wobbleSketchStrokesNode = createAtomicNode<
  SketchPostProcessInput,
  SketchPostProcessInput
>('sketch.wobble', ({ polylines, options }) => {
  const wobbleAmp = options.wobbleAmp ?? 0.85;
  const seedPrefix = options.seed ?? 'sketch';

  const wobbled = polylines.map((poly, idx) => {
    if (wobbleAmp <= 0.01) {
      return {
        ...poly,
        points: subdivideSketchPolyline(poly.points, 12),
      };
    }

    const pts = poly.points;
    const rand = mulberry32(hashString(`${seedPrefix}:${poly.id}:${idx}`));
    const arc = sketchPolylineLen(pts);
    const localAmp = Math.min(wobbleAmp, Math.max(0.22, arc * 0.012));
    const basePts = sketchPolyline(pts, `${seedPrefix}:${poly.id}:${idx}`, localAmp);

    if (poly.closed && basePts.length >= 3) {
      const first = basePts[0];
      basePts[basePts.length - 1] = {
        x: first.x + (rand() - 0.5) * 0.4,
        y: first.y + (rand() - 0.5) * 0.4,
      };
    }

    return {
      ...poly,
      points: basePts,
    };
  });

  return { polylines: wobbled, options };
});

export const sketchToStrokePathsNode = createAtomicNode<
  SketchPostProcessInput,
  StrokePath[]
>('sketch.toStrokePaths', ({ polylines, options }) => {
  const defaultColor = options.defaultColor ?? 'white';
  const strokeWidth = options.strokeWidth ?? 2.3;
  const opacity = options.opacity ?? 0.94;
  const fillClosed = options.fillClosedShapes ?? false;

  return polylines.map((poly, idx) =>
    buildStrokePath(`${options.seed ?? 'sketch'}-${poly.id}-${idx}`, poly.points, {
      width: strokeWidth,
      color: poly.colorHint ?? defaultColor,
      opacity,
      fillOpacity: fillClosed && poly.closed && poly.fill !== false ? 0.75 : undefined,
      speedFactor: 1.25,
    })
  );
});

export const polylinesToSketchWorkflow = compileWorkflowGraph<
  SketchPostProcessInput,
  StrokePath[]
>({
  id: 'sketch.postProcess',
  nodes: [
    {
      id: 'sketch.normalizeFit',
      node: normalizeSketchFitNode,
      from: [GRAPH_INPUT_ID],
    },
    {
      id: 'sketch.orderStrokes',
      node: orderSketchStrokesNode,
      from: ['sketch.normalizeFit'],
    },
    {
      id: 'sketch.wobble',
      node: wobbleSketchStrokesNode,
      from: ['sketch.orderStrokes'],
    },
    {
      id: 'sketch.toStrokePaths',
      node: sketchToStrokePathsNode,
      from: ['sketch.wobble'],
    },
  ],
  output: 'sketch.toStrokePaths',
});

export const dispatchSketchIngestNode = createAtomicNode<
  SketchPipelineRequest,
  SketchPostProcessInput
>('sketch.ingest', (req: SketchPipelineRequest, ctx?: WorkflowContext) => {
  const polylines =
    req.asset.kind === 'svg'
      ? svgToPolylinesWorkflow.run(req.asset.svgText, ctx)
      : bitmapToPolylinesWorkflow.run(
          {
            bitmap: req.asset.bitmap,
            threshold: req.asset.threshold,
            invert: req.asset.invert,
          },
          ctx
        );
  return {
    polylines,
    options: req.options ?? {},
  };
});

export const sketchPipeline = compileWorkflowGraph<
  SketchPipelineRequest,
  StrokePath[]
>({
  id: 'sketch.pipeline',
  nodes: [
    {
      id: 'sketch.ingest',
      node: dispatchSketchIngestNode,
      from: [GRAPH_INPUT_ID],
    },
    {
      id: 'sketch.postProcess',
      node: polylinesToSketchWorkflow,
      from: ['sketch.ingest'],
    },
  ],
  output: 'sketch.postProcess',
});

export const SKETCH_ICON_LIBRARY: Record<string, string> = {
  browser: `<svg viewBox="0 0 120 120">
    <rect x="14" y="22" width="92" height="76" rx="8"/>
    <line x1="14" y1="42" x2="106" y2="42"/>
    <circle cx="26" cy="32" r="2.6"/>
    <circle cx="35" cy="32" r="2.6"/>
    <circle cx="44" cy="32" r="2.6"/>
    <path fill="none" d="M38 62 L28 70 L38 78"/>
    <path fill="none" d="M82 62 L92 70 L82 78"/>
    <line x1="65" y1="58" x2="55" y2="82"/>
  </svg>`,
  server: `<svg viewBox="0 0 120 120">
    <rect x="20" y="18" width="80" height="24" rx="5"/>
    <rect x="20" y="48" width="80" height="24" rx="5"/>
    <rect x="20" y="78" width="80" height="24" rx="5"/>
    <circle cx="34" cy="30" r="3"/>
    <circle cx="34" cy="60" r="3"/>
    <circle cx="34" cy="90" r="3"/>
    <line x1="54" y1="30" x2="86" y2="30"/>
    <line x1="54" y1="60" x2="86" y2="60"/>
    <line x1="54" y1="90" x2="86" y2="90"/>
  </svg>`,
  database: `<svg viewBox="0 0 120 120">
    <ellipse cx="60" cy="28" rx="34" ry="12"/>
    <path fill="none" d="M26 28 L26 90 A34 12 0 0 0 94 90 L94 28"/>
    <path fill="none" d="M26 50 A34 12 0 0 0 94 50"/>
    <path fill="none" d="M26 70 A34 12 0 0 0 94 70"/>
  </svg>`,
  globe: `<svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="40"/>
    <ellipse cx="60" cy="60" rx="18" ry="40"/>
    <line x1="20" y1="60" x2="100" y2="60"/>
    <path fill="none" d="M26 42 Q60 48 94 42"/>
    <path fill="none" d="M26 78 Q60 72 94 78"/>
  </svg>`,
  lock: `<svg viewBox="0 0 120 120">
    <rect x="28" y="52" width="64" height="48" rx="8"/>
    <path fill="none" d="M40 52 L40 38 A20 20 0 0 1 80 38 L80 52"/>
    <circle cx="60" cy="72" r="5.5"/>
    <line x1="60" y1="78" x2="60" y2="88"/>
  </svg>`,
  handshake: `<svg viewBox="0 0 120 120">
    <path fill="none" d="M16 56 L36 38 L58 50 L74 38 L104 54"/>
    <path fill="none" d="M24 64 L48 86 L62 84 L88 64"/>
    <path fill="none" d="M44 62 L58 72 M54 54 L70 66 M66 48 L80 60"/>
    <circle cx="60" cy="30" r="8"/>
  </svg>`,
  cpu: `<svg viewBox="0 0 120 120">
    <rect x="30" y="30" width="60" height="60" rx="6"/>
    <rect x="44" y="44" width="32" height="32" rx="3"/>
    <line x1="44" y1="16" x2="44" y2="30"/>
    <line x1="60" y1="16" x2="60" y2="30"/>
    <line x1="76" y1="16" x2="76" y2="30"/>
    <line x1="44" y1="90" x2="44" y2="104"/>
    <line x1="60" y1="90" x2="60" y2="104"/>
    <line x1="76" y1="90" x2="76" y2="104"/>
    <line x1="16" y1="44" x2="30" y2="44"/>
    <line x1="16" y1="60" x2="30" y2="60"/>
    <line x1="16" y1="76" x2="30" y2="76"/>
    <line x1="90" y1="44" x2="104" y2="44"/>
    <line x1="90" y1="60" x2="104" y2="60"/>
    <line x1="90" y1="76" x2="104" y2="76"/>
  </svg>`,
  brain: `<svg viewBox="0 0 120 120">
    <path d="M58 24 C42 18 24 28 24 44 C16 48 16 64 24 70 C22 86 38 96 54 90 C56 96 58 98 58 98"/>
    <path d="M62 24 C78 18 96 28 96 44 C104 48 104 64 96 70 C98 86 82 96 66 90 C64 96 62 98 62 98"/>
    <line x1="60" y1="24" x2="60" y2="98"/>
    <path fill="none" d="M38 44 Q48 48 44 58"/>
    <path fill="none" d="M82 44 Q72 48 76 58"/>
    <path fill="none" d="M36 72 Q46 68 50 76"/>
    <path fill="none" d="M84 72 Q74 68 70 76"/>
  </svg>`,
  spark: `<svg viewBox="0 0 120 120">
    <path d="M60 14 Q64 52 104 60 Q64 68 60 106 Q56 68 16 60 Q56 52 60 14 Z"/>
    <line x1="24" y1="24" x2="34" y2="34"/>
    <line x1="96" y1="24" x2="86" y2="34"/>
    <line x1="24" y1="96" x2="34" y2="86"/>
  </svg>`,
  code: `<svg viewBox="0 0 120 120">
    <path fill="none" d="M40 34 L16 60 L40 86"/>
    <path fill="none" d="M80 34 L104 60 L80 86"/>
    <line x1="68" y1="26" x2="52" y2="94"/>
  </svg>`,
  puzzle: `<svg viewBox="0 0 120 120">
    <path d="M26 36 L48 36 A10 10 0 1 1 68 36 L88 36 L88 58 A10 10 0 1 1 88 76 L88 94 L26 94 L26 76 A10 10 0 1 0 26 58 Z"/>
  </svg>`,
  user: `<svg viewBox="0 0 120 120">
    <circle cx="60" cy="40" r="18"/>
    <path fill="none" d="M24 98 C24 72 96 72 96 98"/>
  </svg>`,
  document: `<svg viewBox="0 0 120 120">
    <path d="M28 18 L74 18 L92 36 L92 102 L28 102 Z"/>
    <path fill="none" d="M74 18 L74 36 L92 36"/>
    <line x1="42" y1="54" x2="78" y2="54"/>
    <line x1="42" y1="70" x2="78" y2="70"/>
    <line x1="42" y1="86" x2="64" y2="86"/>
  </svg>`,
  rocket: `<svg viewBox="0 0 120 120">
    <path d="M60 12 C78 28 84 56 80 82 L40 82 C36 56 42 28 60 12 Z"/>
    <circle cx="60" cy="48" r="10"/>
    <path fill="none" d="M40 64 L22 82 L40 84"/>
    <path fill="none" d="M80 64 L98 82 L80 84"/>
    <path fill="none" d="M48 86 Q54 106 60 100 Q66 108 72 86"/>
  </svg>`,
  lightbulb: `<svg viewBox="0 0 120 120">
    <path d="M44 76 C32 66 28 48 36 34 C44 20 76 20 84 34 C92 48 88 66 76 76 L74 88 L46 88 Z"/>
    <line x1="48" y1="95" x2="72" y2="95"/>
    <line x1="52" y1="102" x2="68" y2="102"/>
    <path fill="none" d="M52 54 L58 64 L64 54"/>
    <line x1="60" y1="10" x2="60" y2="18"/>
    <line x1="20" y1="48" x2="28" y2="48"/>
    <line x1="92" y1="48" x2="100" y2="48"/>
  </svg>`,
  cat: `<svg viewBox="0 0 120 120">
    <path d="M28 52 L24 22 L46 36 Q60 32 74 36 L96 22 L92 52 C100 72 88 98 60 98 C32 98 20 72 28 52 Z"/>
    <circle cx="46" cy="58" r="4.5"/>
    <circle cx="74" cy="58" r="4.5"/>
    <polygon points="56,68 64,68 60,74"/>
    <path fill="none" d="M60 74 Q54 82 48 78"/>
    <path fill="none" d="M60 74 Q66 82 72 78"/>
    <line x1="16" y1="66" x2="36" y2="68"/>
    <line x1="18" y1="76" x2="36" y2="74"/>
    <line x1="104" y1="66" x2="84" y2="68"/>
    <line x1="102" y1="76" x2="84" y2="74"/>
  </svg>`,
  chart: `<svg viewBox="0 0 120 120">
    <path fill="none" d="M20 22 L20 96 L102 96"/>
    <rect x="32" y="64" width="14" height="32" rx="2"/>
    <rect x="54" y="44" width="14" height="52" rx="2"/>
    <rect x="76" y="28" width="14" height="68" rx="2"/>
  </svg>`,
  gear: `<svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="24"/>
    <circle cx="60" cy="60" r="10"/>
    <line x1="60" y1="22" x2="60" y2="36"/>
    <line x1="60" y1="84" x2="60" y2="98"/>
    <line x1="22" y1="60" x2="36" y2="60"/>
    <line x1="84" y1="60" x2="98" y2="60"/>
    <line x1="33" y1="33" x2="43" y2="43"/>
    <line x1="77" y1="77" x2="87" y2="87"/>
    <line x1="87" y1="33" x2="77" y2="43"/>
    <line x1="43" y1="77" x2="33" y2="87"/>
  </svg>`,
  check: `<svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="38"/>
    <path fill="none" d="M40 62 L54 76 L82 44"/>
  </svg>`,
  layers: `<svg viewBox="0 0 120 120">
    <polygon points="60,20 100,40 60,60 20,40"/>
    <path fill="none" d="M20 60 L60 80 L100 60"/>
    <path fill="none" d="M20 80 L60 100 L100 80"/>
  </svg>`,
};

const sketchIconListeners = new Set<() => void>();
let cachedSketchIconNames: string[] | null = null;

export function registerSketchIcon(name: string, svgText: string): void {
  const key = name.trim().toLowerCase();
  if (key && svgText.trim()) {
    SKETCH_ICON_LIBRARY[key] = svgText;
    cachedSketchIconNames = null;
    for (const listener of sketchIconListeners) {
      listener();
    }
  }
}

export function getSketchIconSvg(name: string): string | undefined {
  return SKETCH_ICON_LIBRARY[name.trim().toLowerCase()];
}

export function listSketchIcons(): string[] {
  if (!cachedSketchIconNames) {
    cachedSketchIconNames = Object.keys(SKETCH_ICON_LIBRARY);
  }
  return cachedSketchIconNames;
}

export function subscribeSketchIcons(listener: () => void): () => void {
  sketchIconListeners.add(listener);
  return () => {
    sketchIconListeners.delete(listener);
  };
}
