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
   - Cards: `[root|step|concept|highlight|note] Label | Optional Subtitle {color, shape: rounded|circle|cloud|underline|diamond|none, icon: <iconName>, group, say: "...", pause: <ms>}`
   - Atomic text / shapes: `[text] Content {color, size, bold, align, x, y}`, `[shape:<id>] Name {color, fit, dashed, w, h}`
   - Built-in visual widget & custom plugin nodes:
     - `[node:icon] Name {color, icon: <iconName>, size: 30}`
     - `[node:sketch] Name {color, icon: <iconName>, svg: "<path d...>", title: "Caption", w, h}`
     - `[node:code] Name {color, title: "file.ts", lines: "line1\\nline2", w}`
     - `[node:chart] Name {color, title: "Metrics", values: "20,50,100", labels: "A,B,C", highlight: 2}`
     - Built-in icon names: `browser`, `server`, `database`, `globe`, `lock`, `handshake`, `cpu`, `brain`, `spark`, `code`, `puzzle`, `user`, `document`, `rocket`, `lightbulb`, `cat`, `chart`, `gear`, `check`, `layers`
     - Generic custom plugin: `[node:<kind>] Name {color, <prop>: <val>, say: "..."}`
   - Composite groups: `[group] Name {color, arrange: card|stack|free, gap}` + 2-space indented children
   - Arrows: `A -> B : Label`, `-.->` dashed, `#id -> #id` for duplicate names or nested group children, `(x1, y1) -> (x2, y2)` for free coordinates
2. **Letter / document scenes** (`layout: document`):
   - `# Title`, `## Heading / Salutation`, `>> Indented paragraph`, `---` (hand-drawn divider), `> Right-aligned sign-off`
   - Supports trailing metadata `{color, align, size, bold, indent, say, pause}` and mixed `[node:...]` / `[shape:...]` blocks.

For full grammar details, escaping rules (`\|`, `\\n`, quoted strings), and custom cue blocks, read [SCRIPT_GRAMMAR.md](./references/SCRIPT_GRAMMAR.md).

Use these local templates inside this skill as starting points:
- [lesson-explainer.penova.md](./examples/lesson-explainer.penova.md) — 4-scene multi-layout curriculum explainer
- [freeform-and-groups.penova.md](./examples/freeform-and-groups.penova.md) — frameless typography, nested `[group]` stacks, and free arrows

### Step 3: Validate & Export Using the Bundled Runner

Run the self-contained headless runner [render-script.ts](./scripts/render-script.ts) directly with Node (Node 22.6+/24/26+ supports `.ts` natively; use `npx tsx` on older Node versions):

```bash
# 1. Inspect the built-in plugin registry specification & syntax rules
node ./scripts/render-script.ts --spec

# 2. Validate script + export .penova.json, .srt subtitles, and HD vector poster (.svg)
node ./scripts/render-script.ts path/to/story.penova.md ./out

# 3. Export headless SVG animation frames (.tar) ready for SVG or FFmpeg pipelines
node ./scripts/render-script.ts path/to/story.penova.md ./out --exporter=svg-sequence-tar --fps=12
```

### Step 4: Quality Checklist & Visual Anti-Patterns

1. Verify zero parser warnings from [render-script.ts](./scripts/render-script.ts) — no unknown colors, shapes, or plugins.
2. Verify every connected label matches its node declaration (use `#id` whenever two nodes share a label or contain `:`, `|`, or `->`).
3. Include `{say: "..."}` narration cues on key nodes when `subtitles: auto` is enabled so subtitles read as natural spoken sentences.
4. Include `{pause: 800..1500}` after dense visual reveals so viewers have time to read before the camera pans away.

Avoid these common anti-patterns when producing multi-scene explainers or video renders:

- **Do NOT lock every scene to `chalkboard` + `flow-horizontal` + `camera: static-overview`**: Vary `theme` (`chalkboard`, `blueprint`, `whiteboard`, `letter-paper`), `layout` (`mindmap`, `concept-graph`, `flow-vertical`, `freeform`, `document`), and `camera` (`auto-follow` / `progressive-fit` / `pen-follow`) across scenes so the explainer feels alive rather than 4 identical slide rows.
- **Do NOT replace Penova's handwriting font with industrial sans-serif (e.g. `Noto Sans`) or inject static PPT header overlays**: Preserve the handwritten feel (`LXGW WenKai` / `KaiTi` / `Segoe Print`) when rasterizing SVGs to PNG/MP4, and use `subtitles: auto` + scene framing instead of pasting static slide chrome on top of the board.
