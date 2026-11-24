import '../../plugins';
import { Point, Rect, ThemeId } from '../../model/scene';
import { GlyphStrokeSegment } from '../../plugins/contracts';
import {
  glyphProviderRegistry,
  presentationRegistry,
} from '../../plugins/registry';
import { hash2D, hashString } from '../../sdk/random';
import { estimateCharAdvanceWidth } from '../layout/textMeasure';

export type { GlyphStrokeSegment };

export interface GlyphStrokeData {
  char: string;
  fontSize: number;
  width: number;
  height: number;
  padX: number;
  advanceWidth: number;
  colorHex: string;
  segments: GlyphStrokeSegment[];
  totalLength: number;
  chalkCanvas?: HTMLCanvasElement;
}

const MAX_GLYPH_CACHE = 1600;
const glyphCache = new Map<string, GlyphStrokeData>();
let measureCanvasCtx: CanvasRenderingContext2D | null = null;

export function clearGlyphCache(): void {
  glyphCache.clear();
}

// Automatically invalidate cached glyph strokes whenever providers are registered/unregistered
glyphProviderRegistry.subscribe(clearGlyphCache);

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measureCanvasCtx) {
    const c = document.createElement('canvas');
    measureCanvasCtx = c.getContext('2d');
  }
  return measureCanvasCtx;
}

function isWide(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x3000 && code <= 0x303f)
  );
}

function cacheGlyphData(key: string, data: GlyphStrokeData): void {
  if (glyphCache.size >= MAX_GLYPH_CACHE) {
    const oldest = glyphCache.keys().next().value;
    if (oldest !== undefined) glyphCache.delete(oldest);
  }
  glyphCache.set(key, data);
}

function measureSegmentLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

function buildFallbackSegments(
  width: number,
  height: number,
  fontSize: number,
  char = ''
): GlyphStrokeSegment[] {
  const cx = width * 0.5;
  const cy = height * 0.52;
  const rx = Math.max(4, Math.min(width * 0.36, fontSize * 0.38));
  const ry = Math.max(5, Math.min(height * 0.34, fontSize * 0.42));
  const charSeed = hashString(char || '?');
  const jitter = (a: number, b: number, amp = 0.22) =>
    (((hash2D(a, b, charSeed) & 255) / 255) - 0.5) * 2 * amp;

  // Deterministic character-seeded multi-stroke calligraphic fallback (3-4 strokes)
  const strokes: Point[][] = [
    [
      { x: cx - rx * (0.85 + jitter(1, 1)), y: cy - ry * (0.62 + jitter(1, 2)) },
      { x: cx + rx * (0.05 + jitter(1, 3, 0.12)), y: cy - ry * (0.72 + jitter(1, 4, 0.14)) },
      { x: cx + rx * (0.88 + jitter(1, 5)), y: cy - ry * (0.58 + jitter(1, 6)) },
    ],
    [
      { x: cx + rx * jitter(2, 1, 0.28), y: cy - ry * (0.82 + jitter(2, 2, 0.12)) },
      { x: cx + rx * jitter(2, 3, 0.18), y: cy + ry * 0.08 },
      { x: cx + rx * jitter(2, 4, 0.28), y: cy + ry * (0.86 + jitter(2, 5, 0.12)) },
    ],
    [
      { x: cx - rx * (0.75 + jitter(3, 1)), y: cy + ry * (0.12 + jitter(3, 2)) },
      { x: cx, y: cy + ry * (0.05 + jitter(3, 3, 0.15)) },
      { x: cx + rx * (0.82 + jitter(3, 4)), y: cy + ry * (0.28 + jitter(3, 5)) },
    ],
  ];

  if (isWide(char) || (hash2D(4, 0, charSeed) & 1) === 1) {
    strokes.push([
      { x: cx - rx * (0.58 + jitter(4, 1)), y: cy + ry * (0.74 + jitter(4, 2, 0.14)) },
      { x: cx + rx * (0.74 + jitter(4, 3)), y: cy + ry * (0.68 + jitter(4, 4, 0.14)) },
    ]);
  }

  return strokes.map((points) => ({
    points,
    length: measureSegmentLength(points),
  }));
}

function computeInkBounds(
  imgData: ImageData,
  pixelW: number,
  pixelH: number,
  boxW: number,
  boxH: number
): Rect | undefined {
  const data = imgData.data;
  let minPx = pixelW;
  let minPy = pixelH;
  let maxPx = -1;
  let maxPy = -1;

  for (let py = 0; py < pixelH; py++) {
    const rowOff = py * pixelW * 4;
    for (let px = 0; px < pixelW; px++) {
      if (data[rowOff + px * 4 + 3] > 24) {
        if (px < minPx) minPx = px;
        if (px > maxPx) maxPx = px;
        if (py < minPy) minPy = py;
        if (py > maxPy) maxPy = py;
      }
    }
  }

  if (maxPx < minPx || maxPy < minPy) return undefined;

  return {
    x: (minPx / pixelW) * boxW,
    y: (minPy / pixelH) * boxH,
    width: Math.max(1, ((maxPx - minPx + 1) / pixelW) * boxW),
    height: Math.max(1, ((maxPy - minPy + 1) / pixelH) * boxH),
  };
}

function resolveGlyphStrokes(
  char: string,
  font: string,
  fontSize: number,
  boxW: number,
  boxH: number,
  inkBounds?: Rect,
  imgData?: ImageData,
  pixelW?: number,
  pixelH?: number
): GlyphStrokeSegment[] {
  if (char.trim().length === 0) return [];

  const providers = [...glyphProviderRegistry.list()].sort(
    (a, b) => b.priority - a.priority
  );
  for (const provider of providers) {
    const resolved = provider.resolveStrokes({
      char,
      font,
      fontSize,
      boxW,
      boxH,
      inkBounds,
      imgData,
      pixelW,
      pixelH,
    });
    if (resolved && resolved.length > 0) {
      return resolved;
    }
  }

  return buildFallbackSegments(boxW, boxH, fontSize, char);
}

export function getGlyphStrokeData(
  char: string,
  font: string,
  fontSize: number,
  colorHex: string,
  theme: ThemeId
): GlyphStrokeData {
  const key = `${char}|${font}|${Math.round(fontSize)}|${colorHex}|${theme}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;

  const mCtx = getMeasureCtx();
  if (!mCtx || typeof document === 'undefined') {
    const boldBoost =
      font.trim().startsWith('700') || font.includes('bold') ? 1.05 : 1.0;
    const advanceWidth = estimateCharAdvanceWidth(char, fontSize, boldBoost);
    const padX = Math.ceil(fontSize * 0.24);
    const width = Math.max(8, advanceWidth + padX * 2);
    const height = Math.max(12, fontSize * 1.48);
    const segments = resolveGlyphStrokes(char, font, fontSize, width, height);
    const totalLength = segments.reduce((a, s) => a + s.length, 0);

    const data: GlyphStrokeData = {
      char,
      fontSize,
      width,
      height,
      padX,
      advanceWidth,
      colorHex,
      segments,
      totalLength,
    };
    cacheGlyphData(key, data);
    return data;
  }

  mCtx.font = font;
  const advanceWidth = mCtx.measureText(char).width;
  const padX = Math.ceil(fontSize * 0.24);
  const boxW = Math.max(10, Math.ceil(advanceWidth + padX * 2));
  const boxH = Math.max(14, Math.ceil(fontSize * 1.48));

  if (char.trim().length === 0) {
    const spaceData: GlyphStrokeData = {
      char,
      fontSize,
      width: boxW,
      height: boxH,
      padX,
      advanceWidth,
      colorHex,
      segments: [],
      totalLength: 0,
    };
    cacheGlyphData(key, spaceData);
    return spaceData;
  }

  const scale = 2;
  const chalkCanvas = document.createElement('canvas');
  chalkCanvas.width = boxW * scale;
  chalkCanvas.height = boxH * scale;

  const gCtx = chalkCanvas.getContext('2d');
  let segments: GlyphStrokeSegment[] = [];

  if (gCtx) {
    gCtx.scale(scale, scale);
    gCtx.font = font;
    gCtx.fillStyle = colorHex;
    gCtx.textBaseline = 'middle';
    gCtx.textAlign = 'left';
    gCtx.fillText(char, padX, boxH * 0.52);

    const imgData = gCtx.getImageData(
      0,
      0,
      chalkCanvas.width,
      chalkCanvas.height
    );

    const grain = presentationRegistry.getOrDefault(theme).glyphGrain;
    if (grain?.enabled) {
      const minFactor = grain.minAlphaFactor ?? 0.8;
      const range = grain.range ?? 0.24;
      const pxData = imgData.data;
      const charSeed = hashString(char);
      const cw = chalkCanvas.width;
      const ch = chalkCanvas.height;
      for (let py = 0; py < ch; py++) {
        for (let px = 0; px < cw; px++) {
          const idx = (py * cw + px) * 4;
          const a = pxData[idx + 3];
          if (a === 0) continue;
          const h = hash2D(px, py, charSeed);
          const n = (h & 255) / 255;
          const factor = minFactor + n * range;
          pxData[idx + 3] = Math.min(255, Math.round(a * factor));
        }
      }
      gCtx.putImageData(imgData, 0, 0);
    }

    const inkBounds = computeInkBounds(
      imgData,
      chalkCanvas.width,
      chalkCanvas.height,
      boxW,
      boxH
    );

    segments = resolveGlyphStrokes(
      char,
      font,
      fontSize,
      boxW,
      boxH,
      inkBounds,
      imgData,
      chalkCanvas.width,
      chalkCanvas.height
    );
  }

  const totalLength = segments.reduce((acc, s) => acc + s.length, 0);
  const result: GlyphStrokeData = {
    char,
    fontSize,
    width: boxW,
    height: boxH,
    padX,
    advanceWidth,
    colorHex,
    segments,
    totalLength,
    chalkCanvas,
  };

  cacheGlyphData(key, result);
  return result;
}

export function getGlyphTipAtProgress(
  glyph: GlyphStrokeData,
  boxX: number,
  boxY: number,
  progress: number
): Point {
  if (glyph.segments.length === 0 || glyph.totalLength <= 1e-4) {
    return { x: boxX + glyph.width * 0.5, y: boxY + glyph.height * 0.52 };
  }

  const target = Math.max(0, Math.min(1, progress)) * glyph.totalLength;
  let acc = 0;

  for (const seg of glyph.segments) {
    if (
      acc + seg.length >= target ||
      seg === glyph.segments[glyph.segments.length - 1]
    ) {
      const localTarget = Math.max(0, target - acc);
      let segAcc = 0;
      for (let i = 1; i < seg.points.length; i++) {
        const a = seg.points[i - 1];
        const b = seg.points[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (segAcc + len >= localTarget || i === seg.points.length - 1) {
          const frac =
            len > 1e-4 ? Math.min(1, (localTarget - segAcc) / len) : 1;
          return {
            x: boxX + a.x + (b.x - a.x) * frac,
            y: boxY + a.y + (b.y - a.y) * frac,
          };
        }
        segAcc += len;
      }
      const last = seg.points[seg.points.length - 1];
      return { x: boxX + last.x, y: boxY + last.y };
    }
    acc += seg.length;
  }

  return { x: boxX + glyph.width * 0.5, y: boxY + glyph.height * 0.5 };
}

export function drawProgressiveGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphStrokeData,
  boxX: number,
  boxY: number,
  progress: number,
  scratchCanvas?: HTMLCanvasElement | null
): void {
  if (progress <= 0) return;

  if (!glyph.chalkCanvas || !scratchCanvas) {
    if (glyph.segments.length === 0 || glyph.totalLength <= 1e-4) return;
    ctx.save();
    ctx.translate(boxX, boxY);
    ctx.strokeStyle = glyph.colorHex;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.6, glyph.fontSize * 0.1);

    let remaining = Math.max(0, Math.min(1, progress)) * glyph.totalLength;
    for (const seg of glyph.segments) {
      if (remaining <= 0) break;
      const pts = seg.points;
      if (pts.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (remaining >= seg.length) {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        remaining -= seg.length;
      } else {
        let drawn = 0;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (drawn + len <= remaining) {
            ctx.lineTo(b.x, b.y);
            drawn += len;
          } else {
            const frac = len > 1e-4 ? (remaining - drawn) / len : 0;
            ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
            break;
          }
        }
        ctx.stroke();
        remaining = 0;
      }
    }
    ctx.restore();
    return;
  }

  if (
    progress >= 0.999 ||
    glyph.segments.length === 0 ||
    glyph.totalLength <= 1e-4
  ) {
    ctx.drawImage(glyph.chalkCanvas, boxX, boxY, glyph.width, glyph.height);
    return;
  }

  const cw = glyph.chalkCanvas.width;
  const ch = glyph.chalkCanvas.height;
  if (scratchCanvas.width !== cw) scratchCanvas.width = cw;
  if (scratchCanvas.height !== ch) scratchCanvas.height = ch;

  const sCtx = scratchCanvas.getContext('2d');
  if (!sCtx) {
    ctx.drawImage(glyph.chalkCanvas, boxX, boxY, glyph.width, glyph.height);
    return;
  }

  const scaleX = cw / glyph.width;
  const scaleY = ch / glyph.height;

  sCtx.save();
  try {
    sCtx.globalCompositeOperation = 'source-over';
    sCtx.setTransform(1, 0, 0, 1, 0, 0);
    sCtx.clearRect(0, 0, cw, ch);

    sCtx.scale(scaleX, scaleY);
    sCtx.strokeStyle = '#ffffff';
    sCtx.lineCap = 'round';
    sCtx.lineJoin = 'round';
    sCtx.lineWidth = Math.max(5.5, glyph.fontSize * 0.38);

    let remaining = Math.max(0, Math.min(1, progress)) * glyph.totalLength;

    for (const seg of glyph.segments) {
      if (remaining <= 0) break;
      const pts = seg.points;
      if (pts.length === 0) continue;

      sCtx.beginPath();
      sCtx.moveTo(pts[0].x, pts[0].y);

      if (remaining >= seg.length) {
        for (let i = 1; i < pts.length; i++) {
          sCtx.lineTo(pts[i].x, pts[i].y);
        }
        sCtx.stroke();
        remaining -= seg.length;
      } else {
        let drawn = 0;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (drawn + len <= remaining) {
            sCtx.lineTo(b.x, b.y);
            drawn += len;
          } else {
            const frac = len > 1e-4 ? (remaining - drawn) / len : 0;
            sCtx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
            break;
          }
        }
        sCtx.stroke();
        remaining = 0;
      }
    }

    sCtx.setTransform(1, 0, 0, 1, 0, 0);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.drawImage(glyph.chalkCanvas, 0, 0);
  } finally {
    sCtx.globalCompositeOperation = 'source-over';
    sCtx.restore();
  }

  ctx.drawImage(scratchCanvas, boxX, boxY, glyph.width, glyph.height);
}
