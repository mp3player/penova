import { ExportPlugin } from '../contracts';
import {
  setOffscreenCanvasFactory,
  setPath2DFactory,
} from '../../sdk/offscreenCanvas';
import { ensureCjkStrokeDataLoaded } from '../glyphs/cjkStrokeData';
import { safeFilename, throwIfAborted, waitMs } from './helpers';

const NODE_MP4_DEFAULT_FPS = 24;
const dynamicImport = new Function('spec', 'return import(spec)') as (
  spec: string
) => Promise<Record<string, unknown>>;

export interface NodeCanvasInitOptions {
  fontDirs?: string[];
  modulePaths?: string[];
}

export interface NodeCanvasRuntimeHandle {
  createCanvas: (width: number, height: number) => HTMLCanvasElement;
  release: () => void;
}

interface NodeCanvasModuleLike {
  createCanvas: (width: number, height: number) => HTMLCanvasElement;
  Path2D?: new (svgPath: string) => Path2D;
  GlobalFonts?: {
    registerFromPath: (path: string, nameAlias?: string) => boolean;
  };
}

interface NodeReadableLike {
  on(event: string, fn: (chunk: Uint8Array) => void): void;
}

interface NodeWritableLike {
  write(chunk: Uint8Array): boolean;
  end(): void;
}

interface NodeChildProcessLike {
  stdin: NodeWritableLike;
  stderr: NodeReadableLike;
  kill(signal?: string): void;
  once(event: string, fn: (...args: unknown[]) => void): void;
}

const FONT_ALIAS_TABLE: Array<{ file: string; aliases: string[] }> = [
  { file: 'Xiaolai-Regular.ttf', aliases: ['Penova Xiaolai', 'Xiaolai'] },
  {
    file: 'LXGWMarkerGothic-Regular.ttf',
    aliases: ['Penova Marker', 'LXGW Marker Gothic'],
  },
  { file: 'ZCOOLKuaiLe-Regular.ttf', aliases: ['Penova KuaiLe', 'ZCOOL KuaiLe'] },
  { file: 'LongCang-Regular.ttf', aliases: ['Penova LongCang', 'Long Cang'] },
  {
    file: 'ArchitectsDaughter-Regular.ttf',
    aliases: ['Penova Architects', 'Architects Daughter'],
  },
  {
    file: 'LXGWWenKai-Regular.ttf',
    aliases: [
      'Penova WenKai',
      'LXGW WenKai',
      'KaiTi',
      'STKaiti',
      'Segoe Print',
      'Microsoft YaHei',
      'PingFang SC',
    ],
  },
  {
    file: 'DejaVuSansMono.ttf',
    aliases: ['DejaVu Sans Mono', 'JetBrains Mono', 'Consolas'],
  },
];

interface NodeProcessLike {
  versions?: { node?: string };
  env?: Record<string, string | undefined>;
  cwd: () => string;
}

function getNodeProcess(): NodeProcessLike | undefined {
  return (globalThis as unknown as { process?: NodeProcessLike }).process;
}

let activeNodeRuntimeRefs = 0;
let cachedCanvasModule: NodeCanvasModuleLike | null = null;
const registeredFontPairs = new Set<string>();

function isNodeRuntimeEnvironment(): boolean {
  const proc = getNodeProcess();
  return Boolean(proc?.versions?.node) && typeof window === 'undefined';
}

async function resolveNodeCanvasModule(
  extraModulePaths: string[] = []
): Promise<NodeCanvasModuleLike> {
  if (cachedCanvasModule) {
    return cachedCanvasModule;
  }

  try {
    const direct = (await dynamicImport(
      '@napi-rs/canvas'
    )) as unknown as NodeCanvasModuleLike;
    if (direct && typeof direct.createCanvas === 'function') {
      cachedCanvasModule = direct;
      return direct;
    }
  } catch {
    // Fall through to probing known local/container module directories
  }

  const mod = (await dynamicImport('node:module')) as {
    createRequire: (id: string) => (id: string) => unknown;
  };
  const fs = (await dynamicImport('node:fs')) as {
    existsSync: (p: string) => boolean;
  };
  const path = (await dynamicImport('node:path')) as {
    join: (...parts: string[]) => string;
  };

  const nodeProc = getNodeProcess();
  const cwd = nodeProc?.cwd() ?? '/';
  const rawEnvMods = nodeProc?.env?.PENOVA_NODE_MODULES ?? '';
  const envModules = rawEnvMods ? rawEnvMods.split(':').filter(Boolean) : [];
  const candidateDirs = [
    ...extraModulePaths,
    ...envModules,
    path.join(cwd, 'node_modules'),
    '/opt/data/profiles/operation/cache/scratch/penova-raster/node_modules',
    '/opt/data/profiles/operation/skills/penova-animation/node_modules',
  ];

  const req = mod.createRequire(path.join(cwd, 'package.json'));
  for (const dir of candidateDirs) {
    const pkgDir = path.join(dir, '@napi-rs', 'canvas');
    if (!fs.existsSync(pkgDir)) continue;
    try {
      const loaded = req(pkgDir) as NodeCanvasModuleLike;
      if (loaded && typeof loaded.createCanvas === 'function') {
        cachedCanvasModule = loaded;
        return loaded;
      }
    } catch {
      // Keep probing remaining candidate directories
    }
  }

  throw new Error(
    'node-mp4 exporter requires @napi-rs/canvas. Install it (`npm i @napi-rs/canvas`) or set PENOVA_NODE_MODULES.'
  );
}

async function registerRuntimeFonts(
  canvasMod: NodeCanvasModuleLike,
  extraFontDirs: string[] = []
): Promise<void> {
  if (!canvasMod.GlobalFonts?.registerFromPath) return;

  const fs = (await dynamicImport('node:fs')) as {
    existsSync: (p: string) => boolean;
  };
  const path = (await dynamicImport('node:path')) as {
    join: (...parts: string[]) => string;
  };

  const nodeProc = getNodeProcess();
  const cwd = nodeProc?.cwd() ?? '/';
  const rawEnvFontDirs = nodeProc?.env?.PENOVA_FONT_DIR ?? '';
  const envDirs = rawEnvFontDirs ? rawEnvFontDirs.split(':').filter(Boolean) : [];
  const fontDirs = [
    ...extraFontDirs,
    ...envDirs,
    path.join(cwd, 'public', 'fonts'),
    '/opt/data/profiles/operation/skills/penova-animation/fonts',
    '/opt/data/profiles/operation/trash/files/xiaoman-c520501173/fonts',
    '/usr/share/fonts/truetype/dejavu',
  ];

  for (const spec of FONT_ALIAS_TABLE) {
    let foundPath: string | null = null;
    for (const dir of fontDirs) {
      const candidate = path.join(dir, spec.file);
      if (fs.existsSync(candidate)) {
        foundPath = candidate;
        break;
      }
    }
    if (!foundPath) continue;

    for (const alias of spec.aliases) {
      const regKey = `${foundPath}=>${alias}`;
      if (registeredFontPairs.has(regKey)) continue;
      registeredFontPairs.add(regKey);
      canvasMod.GlobalFonts.registerFromPath(foundPath, alias);
    }
  }
}

export async function initNodeCanvasRuntime(
  options?: NodeCanvasInitOptions
): Promise<NodeCanvasRuntimeHandle> {
  if (!isNodeRuntimeEnvironment()) {
    throw new Error('Node canvas runtime can only run inside Node.js');
  }

  const canvasMod = await resolveNodeCanvasModule(options?.modulePaths);
  await registerRuntimeFonts(canvasMod, options?.fontDirs);
  await ensureCjkStrokeDataLoaded({ includeOutlines: true });

  activeNodeRuntimeRefs += 1;
  if (activeNodeRuntimeRefs === 1) {
    setPath2DFactory(
      canvasMod.Path2D ? (svgPath) => new canvasMod.Path2D!(svgPath) : null
    );
    setOffscreenCanvasFactory((width, height) => {
      return canvasMod.createCanvas(width, height);
    });
  }

  let released = false;
  return {
    createCanvas: (width, height) => canvasMod.createCanvas(width, height),
    release: () => {
      if (released) return;
      released = true;
      activeNodeRuntimeRefs = Math.max(0, activeNodeRuntimeRefs - 1);
      if (activeNodeRuntimeRefs === 0) {
        setPath2DFactory(null);
        setOffscreenCanvasFactory(null);
      }
    },
  };
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export const nodeMp4ExporterPlugin: ExportPlugin = {
  id: 'node-mp4',
  name: 'Headless Video (Node MP4)',
  shortLabel: 'Node MP4',
  category: 'sequence',
  description:
    'Render Canvas frames natively in Node.js (@napi-rs/canvas) and pipe RGBA frames directly to FFmpeg without SVG or browser recording',
  isSupported() {
    return isNodeRuntimeEnvironment();
  },
  async export(source, options) {
    throwIfAborted(options.signal);
    const runtime = await initNodeCanvasRuntime();
    let tmpDir: string | null = null;

    try {
      const fs = (await dynamicImport('node:fs')) as {
        promises: {
          mkdtemp: (prefix: string) => Promise<string>;
          readFile: (file: string) => Promise<Uint8Array>;
          rm: (
            target: string,
            opts?: { recursive?: boolean; force?: boolean }
          ) => Promise<void>;
        };
      };
      const os = (await dynamicImport('node:os')) as {
        tmpdir: () => string;
      };
      const path = (await dynamicImport('node:path')) as {
        join: (...parts: string[]) => string;
      };
      const childProc = (await dynamicImport('node:child_process')) as {
        spawn: (
          cmd: string,
          args: string[],
          opts: { stdio: ['pipe', 'ignore', 'pipe'] }
        ) => NodeChildProcessLike;
      };
      const eventsMod = (await dynamicImport('node:events')) as {
        once: (emitter: unknown, ev: string) => Promise<unknown[]>;
      };

      const width = Math.max(2, Math.round(source.width));
      const height = Math.max(2, Math.round(source.height));
      const exportFps = Math.max(1, Math.round(source.fps || NODE_MP4_DEFAULT_FPS));
      const frameIntervalMs = 1000 / exportFps;
      const totalFrames = Math.max(
        1,
        Math.ceil((source.totalDurationMs / 1000) * exportFps)
      );

      tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'penova-mp4-'));
      const tmpMp4 = path.join(tmpDir, 'output.mp4');
      const ffmpegBin = getNodeProcess()?.env?.FFMPEG_PATH || 'ffmpeg';

      const ffArgs = [
        '-v',
        'error',
        '-y',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        '-s',
        `${width}x${height}`,
        '-r',
        String(exportFps),
        '-i',
        'pipe:0',
        '-an',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '18',
        '-preset',
        'fast',
        '-movflags',
        '+faststart',
        tmpMp4,
      ];

      const proc = childProc.spawn(ffmpegBin, ffArgs, {
        stdio: ['pipe', 'ignore', 'pipe'],
      });
      const stderrChunks: Uint8Array[] = [];
      proc.stderr.on('data', (chunk: Uint8Array) => {
        stderrChunks.push(chunk);
      });

      let procError: Error | null = null;
      let procClosed = false;
      proc.once('error', (err) => {
        procError =
          err instanceof Error ? err : new Error(`FFmpeg error: ${String(err)}`);
      });
      proc.once('close', () => {
        procClosed = true;
      });
      const exitPromise = eventsMod.once(proc, 'close');

      const onAbort = () => {
        try {
          proc.kill('SIGTERM');
        } catch {
          // Ignore kill failure when process already exited
        }
      };
      options.signal?.addEventListener('abort', onAbort, { once: true });

      const canvas = runtime.createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create Node 2D canvas rendering context');
      }

      options.onProgress(0);
      try {
        for (let i = 0; i <= totalFrames; i++) {
          throwIfAborted(options.signal);
          if (procError) throw procError;
          if (procClosed) {
            const msg = new TextDecoder().decode(concatUint8Arrays(stderrChunks));
            throw new Error(`FFmpeg terminated prematurely: ${msg}`);
          }

          const tMs = Math.min(source.totalDurationMs, i * frameIntervalMs);
          source.renderFrame(ctx, width, height, tMs);
          const imgData = ctx.getImageData(0, 0, width, height);
          const frameSlice = new Uint8Array(
            imgData.data.buffer,
            imgData.data.byteOffset,
            imgData.data.byteLength
          );

          if (!proc.stdin.write(frameSlice)) {
            await eventsMod.once(proc.stdin, 'drain');
          }

          options.onProgress(
            Math.min(95, Math.round((i / Math.max(1, totalFrames)) * 95))
          );
          if (i % 24 === 0) {
            await waitMs(0);
          }
        }

        proc.stdin.end();
        const [code] = await exitPromise;
        if (procError) throw procError;
        if (code !== 0) {
          const errText = new TextDecoder()
            .decode(concatUint8Arrays(stderrChunks))
            .trim();
          throw new Error(
            `FFmpeg exited with code ${String(code)}${errText ? `: ${errText}` : ''}`
          );
        }
      } finally {
        options.signal?.removeEventListener('abort', onAbort);
      }

      throwIfAborted(options.signal);
      const mp4Bytes = await fs.promises.readFile(tmpMp4);
      options.onProgress(100);

      const frameCount = totalFrames + 1;
      const mimeType = 'video/mp4';
      return {
        blob: new Blob([new Uint8Array(mp4Bytes)], { type: mimeType }),
        filename: safeFilename(source.title, 'mp4'),
        mimeType,
        summary: `${frameCount} frames @ ${exportFps}fps`,
      };
    } finally {
      if (tmpDir) {
        try {
          const fs = (await dynamicImport('node:fs')) as {
            promises: {
              rm: (
                target: string,
                opts?: { recursive?: boolean; force?: boolean }
              ) => Promise<void>;
            };
          };
          await fs.promises.rm(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignore temp cleanup failure
        }
      }
      runtime.release();
    }
  },
};
