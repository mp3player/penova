import { Point, Rect } from '../../model/scene';
import { isVectorKaitiFont } from '../../engine/render/fonts';
import { GlyphProviderPlugin, GlyphStrokeSegment } from '../contracts';
import { glyphProviderRegistry } from '../registry';

const dynamicImport = new Function('spec', 'return import(spec)') as (
  spec: string
) => Promise<Record<string, unknown>>;

interface NodeProcessLike {
  versions?: { node?: string };
  env?: Record<string, string | undefined>;
  cwd: () => string;
}

function getNodeProcess(): NodeProcessLike | undefined {
  return (globalThis as unknown as { process?: NodeProcessLike }).process;
}

const cjkMediansMap = new Map<string, number[][]>();
const cjkOutlinesMap = new Map<string, string[]>();

let mediansLoadPromise: Promise<boolean> | null = null;
let outlinesLoadPromise: Promise<boolean> | null = null;

export interface CjkStrokeLoadOptions {
  includeOutlines?: boolean;
  dataDirs?: string[];
}

export function registerCjkStrokeMedians(
  entries: Record<string, number[][]>
): void {
  for (const [char, strokes] of Object.entries(entries)) {
    if (Array.isArray(strokes) && strokes.length > 0) {
      cjkMediansMap.set(char, strokes);
    }
  }
  glyphProviderRegistry.notifyChanged();
}

export function registerCjkStrokeOutlines(
  entries: Record<string, string[]>
): void {
  for (const [char, paths] of Object.entries(entries)) {
    if (Array.isArray(paths) && paths.length > 0) {
      cjkOutlinesMap.set(char, paths);
    }
  }
  glyphProviderRegistry.notifyChanged();
}

export function getCjkStrokeMedians(char: string): number[][] | undefined {
  return cjkMediansMap.get(char);
}

export function getCjkStrokeOutlines(char: string): string[] | undefined {
  return cjkOutlinesMap.get(char);
}

export function hasCjkMediansLoaded(): boolean {
  return cjkMediansMap.size > 0;
}

export function hasCjkOutlinesLoaded(): boolean {
  return cjkOutlinesMap.size > 0;
}

export function computeVectorKaitiTransform(
  fontSize: number,
  boxW: number,
  boxH: number
): { emScale: number; ox: number; oy: number } {
  const emScale = (fontSize * 0.96) / 1024;
  const ox = (boxW - 1024 * emScale) * 0.5;
  const oy = (boxH - 1024 * emScale) * 0.5;
  return { emScale, ox, oy };
}

async function loadJsonAsset(
  filename: string,
  extraDataDirs: string[] = []
): Promise<unknown | null> {
  if (typeof window !== 'undefined') {
    if (typeof fetch !== 'function') return null;
    try {
      const resp = await fetch(`/data/${filename}`);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  const nodeProc = getNodeProcess();
  if (!nodeProc?.versions?.node) return null;

  try {
    const fs = (await dynamicImport('node:fs')) as {
      existsSync: (p: string) => boolean;
      readFileSync: (p: string, enc: string) => string;
    };
    const path = (await dynamicImport('node:path')) as {
      join: (...parts: string[]) => string;
    };

    const cwd = nodeProc.cwd();
    const rawEnvDirs = nodeProc.env?.PENOVA_DATA_DIR ?? '';
    const envDirs = rawEnvDirs ? rawEnvDirs.split(':').filter(Boolean) : [];
    const candidateDirs = [
      ...extraDataDirs,
      ...envDirs,
      path.join(cwd, 'public', 'data'),
      '/opt/data/profiles/operation/skills/penova-animation/data',
    ];

    for (const dir of candidateDirs) {
      const candidate = path.join(dir, filename);
      if (!fs.existsSync(candidate)) continue;
      return JSON.parse(fs.readFileSync(candidate, 'utf8'));
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Lazily load MakeMeAHanzi CJK stroke medians (and optionally vector SVG outlines)
 * from `/data/*.json` in browser or local/skill data directories in Node.js.
 * Returns true if new data was loaded into memory during this call.
 */
export async function ensureCjkStrokeDataLoaded(
  options: CjkStrokeLoadOptions = {}
): Promise<boolean> {
  let loadedAny = false;

  if (!hasCjkMediansLoaded()) {
    if (!mediansLoadPromise) {
      mediansLoadPromise = (async () => {
        const parsed = await loadJsonAsset('cjk-medians.json', options.dataDirs);
        if (!parsed || typeof parsed !== 'object') {
          mediansLoadPromise = null;
          return false;
        }
        registerCjkStrokeMedians(parsed as Record<string, number[][]>);
        return true;
      })();
    }
    if (await mediansLoadPromise) {
      loadedAny = true;
    }
  }

  if (options.includeOutlines && !hasCjkOutlinesLoaded()) {
    if (!outlinesLoadPromise) {
      outlinesLoadPromise = (async () => {
        const parsed = await loadJsonAsset(
          'cjk-outlines.json',
          options.dataDirs
        );
        if (!parsed || typeof parsed !== 'object') {
          outlinesLoadPromise = null;
          return false;
        }
        registerCjkStrokeOutlines(parsed as Record<string, string[]>);
        return true;
      })();
    }
    if (await outlinesLoadPromise) {
      loadedAny = true;
    }
  }

  return loadedAny;
}

function measureLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return Math.max(1, len);
}

function resolveTargetRect(
  inkBounds: Rect | undefined,
  boxW: number,
  boxH: number
): Rect {
  if (inkBounds) {
    return {
      x: inkBounds.x,
      y: inkBounds.y,
      width: Math.max(4, inkBounds.width),
      height: Math.max(4, inkBounds.height),
    };
  }
  const padX = boxW * 0.16;
  const padY = boxH * 0.16;
  return {
    x: padX,
    y: padY,
    width: Math.max(6, boxW - padX * 2),
    height: Math.max(6, boxH - padY * 2),
  };
}

export const cjkStrokeOrderGlyphProvider: GlyphProviderPlugin = {
  id: 'cjk-stroke-order',
  name: 'CJK Stroke Order (MakeMeAHanzi)',
  priority: 90,
  resolveStrokes(ctx): GlyphStrokeSegment[] | null {
    const medians = cjkMediansMap.get(ctx.char);
    if (!medians || medians.length === 0) {
      return null;
    }

    if (isVectorKaitiFont(ctx.font) && cjkOutlinesMap.has(ctx.char)) {
      const { emScale, ox, oy } = computeVectorKaitiTransform(
        ctx.fontSize,
        ctx.boxW,
        ctx.boxH
      );
      return medians.map((flat) => {
        const pts: Point[] = [];
        for (let i = 0; i + 1 < flat.length; i += 2) {
          pts.push({
            x: ox + flat[i] * emScale,
            y: oy + flat[i + 1] * emScale,
          });
        }
        return { points: pts, length: measureLength(pts) };
      });
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const flat of medians) {
      for (let i = 0; i + 1 < flat.length; i += 2) {
        const mx = flat[i];
        const my = flat[i + 1];
        if (mx < minX) minX = mx;
        if (mx > maxX) maxX = mx;
        if (my < minY) minY = my;
        if (my > maxY) maxY = my;
      }
    }

    if (!Number.isFinite(minX)) return null;

    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const target = resolveTargetRect(ctx.inkBounds, ctx.boxW, ctx.boxH);

    const mapX = (mx: number): number => {
      if (spanX < 80) {
        const scale = spanY > 80 ? target.height / spanY : 1 / 1024;
        return target.x + target.width * 0.5 + (mx - (minX + maxX) * 0.5) * scale;
      }
      return target.x + ((mx - minX) / spanX) * target.width;
    };

    const mapY = (my: number): number => {
      if (spanY < 80) {
        const scale = spanX > 80 ? target.width / spanX : 1 / 1024;
        return target.y + target.height * 0.5 + (my - (minY + maxY) * 0.5) * scale;
      }
      return target.y + ((my - minY) / spanY) * target.height;
    };

    return medians.map((flat) => {
      const pts: Point[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        pts.push({
          x: mapX(flat[i]),
          y: mapY(flat[i + 1]),
        });
      }
      return { points: pts, length: measureLength(pts) };
    });
  },
};
