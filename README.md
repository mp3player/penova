# Penova

**English** | [简体中文](README.zh-CN.md)

**Penova** (*Pen + Nova*) is a browser-native, plugin-extensible hand-drawn animation engine and visual studio built with React, TypeScript, Vite, and HTML5 Canvas.

It compiles structured diagrams, mind maps, concept graphs, and handwritten letters into stroke-by-stroke handwriting animations with intelligent camera direction, multi-scene transitions, auto-generated subtitles, audio tracks, and zero-backend 1080P exports.

---

## Showcase Gallery

All six scenes below ship inside the built-in **`Penova Product Intro (6 Scenes)`** template (defined declaratively in [docs/examples/penova-intro.penova.md](docs/examples/penova-intro.penova.md))—ready to preview in the Studio or export directly as `16:9` (`1920×1080`) and `9:16` (`1080×1920`) 1080P videos with one click.

![Penova Studio Workspace](docs/assets/studio-overview.png)

| Chalkboard · Why Penova (Horizontal Flow) | Blueprint · Core Design Principles (Concept Graph) |
| :---: | :---: |
| ![Why Penova Chalkboard](docs/assets/promo-1-chalkboard.png) | ![Core Design Principles Blueprint](docs/assets/promo-2-blueprint.png) |
| **Blueprint · 8-Registry Plugin System (Mind Map)** | **Whiteboard · Script-Driven Custom Plugins (Vertical Flow)** |
| ![8-Registry Plugin System Mind Map](docs/assets/promo-3-mindmap.png) | ![Script-Driven Custom Plugins Whiteboard](docs/assets/promo-4-whiteboard.png) |
| **Letter Paper · Real Penmanship (EN + 汉字)** | **Chalkboard · Full Studio & Open Source (Concept Graph)** |
| ![Real Penmanship Letter Paper](docs/assets/promo-5-letter.png) | ![Full Studio & Open Source Chalkboard](docs/assets/promo-6-studio.png) |

---

## Highlights

- **Universal `SceneNode` Composite IR**: Abstracts `text`, `shape`, `connector`, `group`, and extensible `custom` nodes uniformly to power flowcharts, mind maps, zoned concept graphs, visual widgets, long-form handwritten letters, and freeform boards.
- **9-Registry Headless Plugin Architecture**:
  - **Custom Scene Nodes (`SceneNodePlugin`)**: Built-in visual widgets (`icon`, `sketch`, `code`, `chart`, `wave`, `annotate`) plus optional card `icon:` attributes, backed by pure-data `defineProps` schemas ([src/sdk/propSchema.ts](src/sdk/propSchema.ts)) for symmetric two-way Studio binding and automatic `--spec` docs. Both `[node:wave]` (formula / real-data / preset waves) and multi-frame `[node:chart]` (`frames:`) support seamless **post-draw continuous animation**.
  - **Shapes (`ShapePlugin`)**: `rounded`, `circle`, `cloud`, `underline`, `diamond`, `divider`.
  - **Layouts (`LayoutPlugin`)**: `flow-horizontal`, `flow-vertical`, `mindmap`, `concept-graph`, `document` (Letter / Doc), `freeform`, with **obstacle-aware connector routing** (`routeObstacleAwareConnector`) across graph layouts and two-way text codecs (`graphScriptCodec`, `documentScriptCodec`).
  - **Presentations (`PresentationPlugin`)**: `chalkboard`, `whiteboard`, `blueprint`, `letter-paper`.
  - **Glyph Stroke Providers (`GlyphProviderPlugin`)**: `cjk-stroke-order` (9,500+ MakeMeAHanzi CJK stroke orders with Voronoi font partitioning & KaiTi outlines), `stroke-order-dict` (Latin, numerals, and foundational CJK strokes, extensible via `registerStrokeOrderGlyphs`), and `ink-grid-fallback` (14×14 momentum ink-tracing for any arbitrary Unicode character).
  - **Hand Gestures (`HandPlugin`)**: `hand-chalk`, `hand-minimal`, `tip-only`, `hidden`, plus `createImageHandPlugin` to plug in real hand PNGs in 5 lines.
  - **Camera Directors (`CameraPlugin`)**: `auto-follow`, `progressive-fit`, `static-overview`, `pen-follow` (scrolling chase camera for long letters).
  - **Scene Transitions (`TransitionPlugin`)**: `chalkboard-eraser`, `page-turn`, `crossfade`, `cut`.
  - **Exporters (`ExportPlugin`)**: Grouped by `category` (`'snapshot' | 'sequence'`)—zero-backend **1080P Video** (`mediarecorder-video`), **HD Poster PNG** (`poster-png`), **Offline FFmpeg PNG Tar** (`png-sequence-tar`), headless vector **HD SVG** (`poster-svg`) & **SVG Frame Sequence `.tar`** (`svg-sequence-tar`), headless **Node MP4** (`node-mp4` via `@napi-rs/canvas` + FFmpeg), plus `createHttpBridgeExportPlugin` for custom render servers.
- **SDK Extension Primitives (`src/sdk/`)**: Ships a recursive composable DAG kernel (`workflowDag.ts`), an SVG/bitmap sketch-to-stroke pipeline with 20 built-in icons (`sketchPipeline.ts`), a safe zero-`eval` formula parser supporting `sum(...)` (`mathExpr.ts`), and the zero-dependency `defineProps` property schema (`propSchema.ts`).
- **Declarative `.penova.md` Text-to-Video Pipeline & Agent Skill**: Author multi-scene boards as pure Markdown/script text declaring `theme`, `layout`, `camera`, `hand`, and `transition` plugins (`parseProjectScript` / `serializeProjectScript`), inspect live grammar rules via `generateScriptSpec()`, or equip AI agents directly via the workspace skill at [.agents/skills/penova-animation/SKILL.md](.agents/skills/penova-animation/SKILL.md) (with [docs/examples/penova-intro.penova.md](docs/examples/penova-intro.penova.md)).
- **Built-in Bilingual Studio (`EN / 简体中文`)**: Ships with an instant `EN / 中文` switcher in the top bar menu and 6 bilingual showcase presets; third-party plugins automatically fall back to their own `name` without needing i18n keys.
- **Full Studio Workflow & Strict Engine/UI Separation**: Direct canvas click-to-pause & select, double-click inline quick-editing, keyboard shortcuts (`Delete`/`Backspace`, `Ctrl/Cmd+D`, `Esc`), zoom/quick-action HUD, single-scene loop toggle, unified Snapshot & Video `Export` popover, scroll-synced line-numbered script editor with warning highlights & snippet chips, auto subtitles (`.srt`), audio sync, Undo/Redo, and browser-only companion UI customization via [src/studio/uiRegistry.ts](src/studio/uiRegistry.ts).

---

## Layered Architecture

```text
src/components/, src/hooks/, src/i18n/   Studio UI shell, workspace/audio hooks & localization
                  │
                  ▼
           src/studio/                    Browser-only companion UI registry (studioNodeUiRegistry)
                  │   (UI -> Engine, strictly one-way; never bundled into headless exports)
                  ▼
           src/engine/                    Layout compiler, stroke animator, timeline, camera, audio & Canvas/SVG renderers
                  │
                  ▼
           src/plugins/                   9 independent headless plugin registries & built-in plugins
                  │
                  ▼
             src/sdk/                     Pure math, stroke path, brush, sketch pipeline, DAG kernel & defineProps schema
                  │
                  ▼
            src/model/                    Universal SceneNode IR, LessonProject, presets, history & storage
```

See the full plugin contract specification in [docs/PLUGIN_SPEC.md](docs/PLUGIN_SPEC.md) ([中文版](docs/PLUGIN_SPEC.zh-CN.md)).

---

## Quick Start

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Run unit tests
npm test

# Type-check & build production bundle
npm run build
```

---

## Minimal Plugin Extension Example

```ts
import { layoutRegistry, LayoutPlugin } from './src/plugins';
import { finalizeLayout, makePositionedNode } from './src/plugins/layouts/shared';

const customVerticalLayout: LayoutPlugin = {
  id: 'custom-vertical',
  name: 'Custom Vertical Doc',
  category: 'basic',
  icon: 'document',
  dragMode: 'offset',
  supportsEdges: false,
  compute(scene, helpers) {
    let y = 0;
    const nodes = scene.nodes.map((node) => {
      const measured = helpers.measureNode(node);
      const positioned = makePositionedNode(node, 0, y + measured.height / 2, measured, helpers);
      y += measured.height + 24;
      return positioned;
    });
    return finalizeLayout(nodes, []);
  },
};

layoutRegistry.register(customVerticalLayout);
```

---

## Roadmap & Future Directions

- **Dynamic Text & Live Readouts**: Extend post-draw reactive evaluation to `CompiledTextLineItem` (e.g., live numeric readouts tracking animated chart bars or harmonic order labels `N = 1 -> 5`).
- **Scene-Level Hold & Universal Motion Modifiers**: Dedicated scene hold duration for single-widget animations, plus composable subtle post-draw motion modifiers (breathe, gentle float, flowing dashed connectors).
- **Conditional Studio Inspector UX**: Mode-aware `when` visibility predicates for `[node:wave]` fields (`fn` / `values` / preset parameters) and a quick-insert script chip.

---

## License

Released under the [MIT License](LICENSE).
