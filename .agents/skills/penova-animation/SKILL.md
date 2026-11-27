---
name: penova-animation
description: >-
  Create, storyboard, validate, and export hand-drawn board animations
  (chalkboard, whiteboard, blueprint, and handwritten letters) using Penova's
  declarative `.penova.md` script pipeline and self-contained headless SVG
  export runner. Use this skill whenever the user asks to generate a hand-drawn
  explainer video, animated diagram, teaching storyboard, or `.penova.md` script.
---

# Penova Animation Skill (Self-Contained)

This skill package is **100% self-contained**: it bundles Penova's headless engine, registries, built-in plugins, script codecs, and SVG exporters directly inside `./scripts/render-script.ts` with zero external repository or `node_modules` dependencies. You can copy `.agents/skills/penova-animation/` to any workspace and run it standalone.

---

## Workflow

### Step 1: Plan the Storyboard (2–6 Scenes)

Break the explanation into focused visual beats. Keep **4–7 vertices per diagram scene** so frames stay legible on both `16:9` (`1920x1080`) and `9:16` (`1080x1920`).

Choose the scene plugin combination that matches the pedagogical goal:

| Scene Intent | `theme` | `layout` | `camera` | `transition` |
| :--- | :--- | :--- | :--- | :--- |
| Step-by-step pipeline / timeline | `chalkboard` or `whiteboard` | `flow-horizontal` / `flow-vertical` | `auto-follow` | `chalkboard-eraser` |
| Central thesis branching out | `blueprint` or `chalkboard` | `mindmap` | `auto-follow` or `progressive-fit` | `chalkboard-eraser` |
| Categorized architecture / layers | `blueprint` | `concept-graph` | `progressive-fit` | `crossfade` |
| Long-form letter / narrative wrap-up | `letter-paper` | `document` | `pen-follow` | `page-turn` |
| Custom spatial sketch / mixed atoms | Any | `freeform` | `static-overview` | `crossfade` |

Default choices if unspecified: `aspectRatio: 16:9`, `subtitles: auto`, `hand: hand-chalk`.

### Step 2: Author the `.penova.md` Script

Write a `.penova.md` file with optional project frontmatter followed by `=== scene ===` blocks:

1. **Diagram scenes** (`flow-horizontal`, `flow-vertical`, `mindmap`, `concept-graph`, `freeform`):
   - Optional scene metadata:
     - `spotlight: true` dims previously drawn steps while keeping the active node (and any annotated target) at full brightness, then restores everything during the outro.
     - `pacing: natural | crisp | deliberate | linear` controls drawing rhythm (fast-in/slow-out stroke dynamics, corner pauses, between-part breathing room, and 3-beat pen settle; defaults to `natural`).
     - `font: theme-default | xiaolai | marker | kuaile | longcang | blueprint-hand | wenkai | kaiti-stroke` sets an optional handwriting font preset for the scene (`kaiti-stroke` renders pure vector stroke-by-stroke KaiTi outlines; custom fonts use per-stroke CJK pixel partitioning).
   - Supports direct **Mermaid flowcharts** (`flowchart LR` / `flowchart TD` / `graph TD` / `subgraph` / `-.->` / chained edges) inside a scene body via auto-detection.
   - Cards: `[root|step|concept|highlight|note] Label | Optional Subtitle {color, shape: rounded|circle|cloud|underline|diamond|none, icon: <iconName>, group, say: "...", pause: <ms>}`
   - Atomic text / shapes: `[text] Content {color, size, bold, align, x, y}`, `[shape:<id>] Name {color, fit, dashed, w, h}`
   - Built-in visual widget & custom plugin nodes:
     - `[node:icon] Name {color, icon: <iconName>, size: 30}`
     - `[node:sketch] Name {color, icon: <iconName>, svg: "<path d...>", title: "Caption", w, h}`
     - `[node:code] Name {color, title: "file.ts", lines: "line1\\nline2", highlight: "2,4-5", highlightColor: yellow, w}`
     - `[node:chart] Name {color, title: "Metrics", values: "20,50,100", labels: "A,B,C", highlight: 2}` (or add `frames: "20,50,100 | 80,35,60", speed: 1.0` for post-draw statistical bar animation)
     - `[node:wave] Name {color, title: "Fourier Series", fn: "sum(k, 1, 5, sin((2*k-1)*(x - 2*t)) / (2*k-1))"}` (or real-data scrolling `values: "12,18,42,38"`, or presets `type: sine|square|fourier|audio|ecg`, with optional `domain`, `yrange`, `speed`)
     - `[node:annotate] Name {style: circle|cross|highlight|underline|check, target: "Target Label or #id", label: "Callout", color: pink}` (zero-displacement overlay emphasis)
     - Built-in icon names: `browser`, `server`, `database`, `globe`, `lock`, `handshake`, `cpu`, `brain`, `spark`, `code`, `puzzle`, `user`, `document`, `rocket`, `lightbulb`, `cat`, `chart`, `gear`, `check`, `layers`
     - Generic custom plugin: `[node:<kind>] Name {color, <prop>: <val>, say: "..."}`
   - Composite groups: `[group] Name {color, arrange: card|stack|free, gap}` + 2-space indented children
   - Arrows: `A -> B : Label`, `-.->` dashed, `#id -> #id` for duplicate names or nested group children, `(x1, y1) -> (x2, y2)` for free coordinates
2. **Letter / document scenes** (`layout: document`):
   - `# Title`, `## Heading / Salutation`, `>> Indented paragraph`, `---` (hand-drawn divider), `> Right-aligned sign-off`
   - Supports trailing metadata `{color, align, size, bold, indent, say, pause}` and mixed `[node:...]` / `[shape:...]` blocks.

For full grammar details, escaping rules (`\|`, `\\n`, quoted strings), and custom cue blocks, read [SCRIPT_GRAMMAR.md](./references/SCRIPT_GRAMMAR.md).

Use these local templates inside this skill as starting points:
- [product-promo-showcase.penova.md](./examples/product-promo-showcase.penova.md) — high-impact 4-scene product promo blueprint (blueprints + live Fourier/data animations + RAG concept graph + KaiTi handwritten letter)
- [lesson-explainer.penova.md](./examples/lesson-explainer.penova.md) — 4-scene multi-layout curriculum explainer
- [freeform-and-groups.penova.md](./examples/freeform-and-groups.penova.md) — frameless typography, nested `[group]` stacks, and free arrows

### Step 3: Validate & Export Using the Bundled Runner

Run the self-contained headless runner [render-script.ts](./scripts/render-script.ts) directly with Node (Node 22.6+/24/26+ supports `.ts` natively; use `npx tsx` on older Node versions):

```bash
# 1. Inspect the built-in plugin registry specification & syntax rules
node ./scripts/render-script.ts --spec

# 2. Validate script + export .penova.json, .srt subtitles, and HD vector poster (.svg)
node ./scripts/render-script.ts path/to/story.penova.md ./out

# 3. Export MP4 directly without SVG or browser (requires @napi-rs/canvas + ffmpeg)
node ./scripts/render-script.ts path/to/story.penova.md ./out --exporter=node-mp4 --fps=30

# 4. Export platform-agnostic SVG animation frames (.tar) when zero-dependency vector output is desired
node ./scripts/render-script.ts path/to/story.penova.md ./out --exporter=svg-sequence-tar --fps=12
```

### Step 4: Quality Checklist, Promo Director Playbook & Anti-Patterns

#### Promo & Explainer Director Playbook (How to Make Videos Feel Alive, Not Slide-Like)
1. **Product Protagonist Rule & Core Identity (CRITICAL)**:
   - When making a **product promo** (e.g., for Penova), **the product MUST remain the protagonist from second 0 onward**. Never spend 80% of the video teaching an unrelated domain lesson (e.g. a 50-second Redis cache or SQL tutorial) and only mention Penova in the final 10 seconds!
   - Any concrete technical example (code snippet, Fourier wave, RAG diagram, metrics chart) is a **5–8s proof beat** demonstrating *"write script -> Penova draws & animates it"*, NOT a standalone CS lecture.
   - **Never undersell Penova as "just 4 themes"**: Built-in themes, layouts, hands, and widgets are only the starting point — Penova's real soul is its **9-registry headless customizable engine** (`Presentation`, `Layout`, `Shape`, `SceneNode`, `GlyphProvider`, `Hand`, `Camera`, `Transition`, `Export`). Explicitly highlight full-stack customizability (e.g., registering bespoke dynamic nodes via `sceneNodeRegistry.register(...)`, custom brushes/layouts/exporters).
2. **Show, Don't Tell (Zero-Placeholder Rule)**:
   - **Never** repeat empty 2-word toys across scenes (`提问 -> 验证`, `A -> B`, `Step 1 -> Step 2`), dummy bar charts (`甲 20 / 乙 40`), 2-line dummy code (`explain(topic)`), or defensive on-screen disclaimers (`示例数据 · 非性能对比`, `配置摘录，非完整脚本`).
   - Always prove capabilities through **concrete, recognizable micro-examples** (e.g. `[node:wave]` with `type: fourier, harmonics: 5, freq: 1.5` for progressive Fourier convergence with ideal square-wave guide, or smooth `fn:` with `x`/`t`, `[node:chart]` with `frames:`, or a crisp 4-node architecture flow).
3. **Keep Penova's Tactile Identity, Clean Annotations & Audio**:
   - Default to `hand: hand-chalk` (avoid `tip-only` everywhere), active camera tracking (`auto-follow`, `progressive-fit`, `pen-follow`), and tactile transitions (`chalkboard-eraser`, `page-turn`). Do not reduce the board to static `freeform` slides with hard `cut` transitions across every scene.
   - Pair `spotlight: true` with `[node:annotate]` + `icon:`/`[group]` structure so each board grows organically on screen with clear visual hierarchy. When annotating wide `[node:chart]` or `[node:wave]` widgets, prefer `style: underline` (or `style: circle, pad: 22`) so the ellipse clears bottom axis labels. When TTS voiceover tools are available, synthesize & mux spoken narration rather than shipping a 60s silent video.
4. **Skip Off-Topic Hand-Coded SVG Art**:
   - Never burn effort computing hundreds of raw SVG path coordinates for unrelated illustrations (leaves, trees, buildings). Use Penova's structured boards, icons, `[node:wave]` dynamic formulas/data, `[node:chart]` dynamic frames, and `font: kaiti-stroke` / `wenkai` stroke penmanship to let the product sell itself.
5. **Fast Visual Alignment (Anti-Thrash Workflow)**:
   - Keep promos tight: **3–5 scenes, ~35–60s total**, exported at **`--fps=30`** for smooth motion. Before doing multi-round internal self-audits or full TTS dubbing, render a 1-image multi-scene keyframe contact sheet and align composition & copy with the user early.

#### Checklist & Hard Anti-Patterns

1. Verify zero parser warnings from [render-script.ts](./scripts/render-script.ts) — no unknown colors, shapes, or plugins.
2. Verify every connected label matches its node declaration (use `#id` whenever two nodes share a label or contain `:`, `|`, or `->`).
3. Include `{say: "..."}` narration cues on key nodes when `subtitles: auto` is enabled so subtitles read as natural spoken sentences.
4. Include `{pause: 600..1500}` after dense visual reveals (or `{pause: 1500}` on dynamic `[node:wave]`/`[node:chart]` payoffs) so viewers have time to appreciate the motion before the camera pans away.

Avoid these common anti-patterns when producing multi-scene explainers or video renders:

- **Do NOT lock every scene to `chalkboard` + `flow-horizontal` + `camera: static-overview`** (nor `freeform` + `tip-only` + `cut`): Vary `theme` (`chalkboard`, `blueprint`, `whiteboard`, `letter-paper`), `layout` (`mindmap`, `concept-graph`, `flow-vertical`, `freeform`, `document`), and `camera` (`auto-follow` / `progressive-fit` / `pen-follow`) across scenes so the explainer feels alive rather than identical slide rows.
- **Do NOT replace Penova's handwriting font with industrial sans-serif (e.g. `Noto Sans`) or inject static PPT header overlays**: Preserve the handwritten feel (`LXGW WenKai` / `KaiTi` / `Segoe Print`) when rasterizing SVGs to PNG/MP4, and use `subtitles: auto` + scene framing instead of pasting static slide chrome on top of the board.
