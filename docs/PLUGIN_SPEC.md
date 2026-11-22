# Penova Plugin Architecture & Universal SceneNode Specification (`PLUGIN_SPEC`)

**English** | [简体中文](PLUGIN_SPEC.zh-CN.md)

Penova uses a **two-layer compiler architecture**:

- **Core Layer (Universal Scene Service)**: Abstracts every drawable entity as a **`SceneNode` composite tree** (`text`, `shape`, `connector`, `group`), runs a `LayoutPlugin` to resolve coordinates, compiles nodes into timed strokes, and renders frames/videos via a `PresentationPlugin`.
- **Domain Sugar Layer (Optional Helpers)**: Conveniences such as `createCardNode` in [src/model/builders.ts](../src/model/builders.ts), showcase presets, and `graphScriptCodec` (`A -> B` board script) simply assemble `SceneNode` objects on top of the core layer.

---

## 1. Universal Scene Tree (`SceneNode` IR)

Defined in [src/model/scene.ts](../src/model/scene.ts):

| Node Type (`type`) | Purpose | Key Fields |
| :--- | :--- | :--- |
| `text` | Pure text block (word, heading, paragraph, sign-off) | `text`, `fontSize`, `fontWeight`, `maxWidth`, `align` (`left`/`center`/`right`), `indentChars` |
| `shape` | Geometric or decorative frame/mark (box, ellipse, cloud, diamond, underline, divider) | `shape`, `fitMode` (`auto-group` wraps sibling bounds / `fixed` explicit dimensions), `width`, `height`, `emphasized`, `dashed` |
| `connector` | Edges and arrows | Supports bound `fromId` -> `toId` or free coordinates `fromPoint` -> `toPoint`, with optional `label` & `style` |
| `group` | Nestable container node (child array order = draw order) | `children: SceneNode[]`, `arrange` (`card` / `stack` / `free`), `gap` |

> **Paint order follows array order**: In a `card` group, putting `shape` before `text` draws the frame first and writes text inside; placing `shape(underline)` after `text` writes the label first and draws the underline afterward.

---

## 2. The 8 Plugin Contracts

All public contracts and registries are exported from [src/plugins/index.ts](../src/plugins/index.ts) (interface definitions in [contracts.ts](../src/plugins/contracts.ts)).

### 1. `ShapePlugin`

Pure geometry and stroke synthesis decoupled from card roles or text ordering. Built-ins: `rounded`, `circle`, `cloud`, `underline`, `diamond`, `divider`.

```ts
export interface ShapePlugin {
  id: string;
  name: string;
  maxTextWidth?(): number;
  measureBox(contentW: number, contentH: number): {
    width: number;
    height: number;
    padX: number;
    padY: number;
    textOffsetY?: number;
  };
  clipRay(
    cx: number,
    cy: number,
    width: number,
    height: number,
    toward: Point,
    extraMargin: number
  ): Point;
  generateStrokes(input: ShapeRenderInput): StrokePath[];
}
```

### 2. `LayoutPlugin`

Receives `SceneNode[]` and returns `ComputedLayout` (positioned tree `nodes`, lookup map `nodeMap`, optional zone frames `zones`, and `bounds`):

```ts
export interface LayoutPlugin {
  id: string;
  name: string;
  category: 'basic' | 'diagram';
  icon: 'flow-lr' | 'flow-tb' | 'mindmap' | 'concept-graph' | 'document' | 'freeform';
  dragMode: 'offset' | 'absolute';
  supportsEdges: boolean;
  supportsGroups?: boolean;
  textCodec?: SceneTextCodec;
  compute(scene: LessonScene, helpers: LayoutHelpers): ComputedLayout;
  deriveSteps?(scene: LessonScene): TeachingStep[];
}
```

- Uses `helpers.measureNode(node)` to measure arbitrary nodes (`text` / `shape` / `group`) and `helpers.positionGroupChildren(...)` to expand group children (including `auto-group` frames).
- Built-in layout utilities live in [src/plugins/layouts/shared.ts](../src/plugins/layouts/shared.ts) (`splitSceneNodes`, `buildConnectorNode`, `finalizeLayout`).
- Built-ins: `flow-horizontal`, `flow-vertical`, `mindmap`, `concept-graph`, `document` (paired with `documentScriptCodec`), `freeform`.

### 3. `PresentationPlugin`

Encapsulates board surface texture, stroke brush look, drawing instrument illustration, particle effects, and friction sound profile. Built-ins: `chalkboard`, `whiteboard`, `blueprint`, `letter-paper`.

```ts
export interface PresentationPlugin {
  id: string;
  name: string;
  palette: ThemePalette;
  fontFamily: string;
  glyphGrain?: { enabled: boolean; minAlphaFactor?: number; range?: number };
  shadowColor: string;
  soundProfile: { baseFreqHz: number; velocityFreqBoostHz: number; baseGain: number };
  drawSurface(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokePath, progress: number): void;
  drawInstrument(ctx: CanvasRenderingContext2D, colorHex: string): void;
  drawParticles?(ctx: CanvasRenderingContext2D, tipX: number, tipY: number, colorHex: string, tMs: number, seed: number): void;
}
```

---

### 4. `GlyphProviderPlugin`

Resolves per-character writing paths by descending `priority`. Built-in two-tier chain:
1. `stroke-order-dict` (`priority: 80`): Latin letters, numerals, and foundational CJK stroke skeletons mapped into each glyph's measured `inkBounds`; extensible via `registerStrokeOrderGlyphs`.
2. `ink-grid-fallback` (`priority: 10`): Automatic 14×14 momentum-guided ink grid tracing for any unmapped Unicode character.

```ts
export interface GlyphProviderPlugin {
  id: string;
  name: string;
  priority: number;
  resolveStrokes(ctx: GlyphProviderContext): GlyphStrokeSegment[] | null;
}
```

Registering or unregistering a glyph provider automatically invalidates and rebuilds glyph stroke caches.

---

### 5. `HandPlugin`

Renders screen-space drawing hand gestures and micro-sway animation with the nib anchored at `(screenX, screenY - lift * 0.8)`. Built-ins: `hand-chalk`, `hand-minimal`, `tip-only`, `hidden`, plus the `createImageHandPlugin` factory to mount custom transparent hand PNGs:

```ts
import { handRegistry, createImageHandPlugin } from '../plugins';

handRegistry.register(
  createImageHandPlugin({
    id: 'real-hand-1',
    name: 'Real Hand PNG',
    imageSrc: '/assets/hand-chalk.png',
    tipAnchorX: 18,
    tipAnchorY: 22,
    scale: 0.65,
  })
);
```

---

### 6. `CameraPlugin`

Computes world-space camera `(cx, cy, zoom)` every frame from timeline progress, bounds, and the live nib position. Built-ins: `auto-follow`, `progressive-fit`, `static-overview`, and `pen-follow` (vertical scroll-chase director for letters and long documents):

```ts
export interface CameraPlugin {
  id: string;
  name: string;
  evaluate(ctx: CameraEvalContext): CameraState;
}
```

---

### 7. `TransitionPlugin`

Blends `fromCanvas` (end of scene *i*) and `toCanvas` (start of scene *i+1*) across `scene.transitionOut` in multi-scene [LessonProject](../src/model/project.ts) timelines. Built-ins: `chalkboard-eraser`, `page-turn`, `crossfade`, `cut`.

```ts
export interface TransitionPlugin {
  id: string;
  name: string;
  defaultDurationMs: number;
  render(context: TransitionRenderContext): void;
}
```

Custom transitions registered on `transitionRegistry` automatically appear in [SceneStrip](../src/components/SceneStrip.tsx) and work seamlessly in exports.

---

### 8. `ExportPlugin`

Decouples frame rendering (`ExportFrameSource`) from output encoding. Three zero-backend exporters ship out of the box:
1. `mediarecorder-video` (1080P real-time WebM/MP4 in-browser recording)
2. `poster-png` (instant lossless 1080P final-frame PNG poster)
3. `png-sequence-tar` (lossless PNG frame sequence, `manifest.json`, and FFmpeg script bundled as `.tar`)

Use `createHttpBridgeExportPlugin` to connect a local FFmpeg bridge or cloud encoder in 5 lines—it automatically appears in the TopBar exporter selector:

```ts
export interface ExportPlugin {
  id: string;
  name: string;
  shortLabel?: string;
  description?: string;
  isSupported?(): boolean;
  export(source: ExportFrameSource, options: ExportRunOptions): Promise<ExportOutput>;
}
```

---

## 3. Minimal Custom Document Layout Example

```ts
import { layoutRegistry, LayoutPlugin } from '../plugins';
import { finalizeLayout, makePositionedNode } from '../plugins/layouts/shared';

const verticalDocLayout: LayoutPlugin = {
  id: 'doc-flow',
  name: 'Document Flow',
  category: 'basic',
  icon: 'document',
  dragMode: 'offset',
  supportsEdges: false,
  compute(scene, helpers) {
    let y = 0;
    const nodes = scene.nodes.map((n) => {
      const m = helpers.measureNode(n);
      const p = makePositionedNode(n, 0, y + m.height / 2, m, helpers);
      y += m.height + 24;
      return p;
    });
    return finalizeLayout(nodes, []);
  },
  deriveSteps(scene) {
    return scene.nodes.map((n, i) => ({
      id: `doc-step-${i}-${n.id}`,
      title: n.name,
      nodeIds: [n.id],
    }));
  },
};

layoutRegistry.register(verticalDocLayout);
```
