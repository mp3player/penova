# Penova `.penova.md` Script Grammar Reference

This reference documents the declarative `.penova.md` script syntax compiled by `./scripts/render-script.ts`.

---

## 1. Project Envelope (`.penova.md`)

```markdown
---
title: My Animated Lesson
aspectRatio: 16:9
subtitles: auto
---

=== scene ===
title: Opening Hook
theme: chalkboard
layout: flow-horizontal
camera: auto-follow
hand: hand-chalk
transition: chalkboard-eraser
transitionDuration: 1150
---
# Opening Hook
[root] Main Idea | Core takeaway {color: yellow, shape: circle, say: "Let us start with the core idea.", pause: 900}
[step] Next Step | How it works {color: cyan, shape: rounded}
Main Idea -> Next Step : Leads to
```

### Frontmatter Keys
- `title`: Project title string.
- `aspectRatio`: `16:9` (1920×1080) or `9:16` (1080×1920).
- `subtitles`: `auto` (generate from scene nodes / `say` metadata), `custom` (use `=== subtitles ===` block at file end), or `off`.

### Scene Header Keys (`=== scene ===` ... `---`)
- `title`: Scene title (or inline `=== scene: Custom Title ===`).
- `theme`: `chalkboard` | `whiteboard` | `blueprint` | `letter-paper`.
- `layout`: `flow-horizontal` | `flow-vertical` | `mindmap` | `concept-graph` | `document` | `freeform`.
- `camera`: `auto-follow` | `progressive-fit` | `static-overview` | `pen-follow`.
- `hand`: `hand-chalk` | `hand-minimal` | `tip-only` | `hidden`.
- `transition`: `chalkboard-eraser` | `page-turn` | `crossfade` | `cut`.
- `transitionDuration`: Optional transition duration in milliseconds (non-negative integer).

### Custom Subtitles Block (`=== subtitles ===`, optional)
```markdown
=== subtitles ===
0 -> 1800 : Spoken subtitle for the first reveal.
1900 -> 4200 : Second subtitle\nwith manual line break.
```

---

## 2. `graph-dsl` Codec Grammar

Used by `flow-horizontal`, `flow-vertical`, `mindmap`, `concept-graph`, and `freeform`.

### Visual Tokens
- **Colors**: `white`, `yellow`, `cyan`, `pink`, `green`, `orange`
- **Card roles**: `root`, `step`, `concept`, `highlight`, `note`
- **Shapes**: `rounded`, `circle`, `cloud`, `underline`, `diamond`, `divider`, `none` (frameless)

### Card Declaration
```text
[role] Label | Optional Subtitle {color: yellow, shape: circle, icon: rocket, group: "Cluster Name", say: "Spoken caption", pause: 900, x: 40, y: -20}
```
- Use `[role#my-id]` when two nodes share the same label or when the label contains `:`, `：`, `|`, or `->`.
- Escape literal `|` inside a card title as `\|` (e.g., `[concept] Input \| Output | Pipeline`).
- Use `\n` for explicit line breaks inside labels, subtitles, or text nodes.
- Optional `icon`: attaches any built-in sketch icon (`browser`, `server`, `database`, `globe`, `lock`, `handshake`, `cpu`, `brain`, `spark`, `code`, `puzzle`, `user`, `document`, `rocket`, `lightbulb`, `cat`, `chart`, `gear`, `check`, `layers`).

### Atomic & Custom Nodes
- **Standalone text**:
  `[text] Content {color: cyan, size: 22, bold: true, align: left, maxW: 320, indent: 2, say: "...", pause: 800, x: 0, y: 0}`
- **Standalone shape**:
  `[shape:rounded] Frame Name {color: pink, fit: fixed, emphasized: true, dashed: true, w: 220, h: 80}`
- **Built-in visual widget nodes**:
  - `[node:icon] Label {color: cyan, icon: rocket, size: 32}`
  - `[node:sketch] Art {color: pink, icon: cat, title: "Caption", svg: "<svg or path d>", w: 180, h: 140}`
  - `[node:code] Snippet {color: cyan, title: "plugin.ts", lines: "const a = 1;\\nreturn a;", w: 320}`
  - `[node:chart] Speedup {color: orange, title: "Speed", values: "18,45,80,100", labels: "Manual,Tpl,Code,Penova", highlight: 3}`
- **Custom plugin node (`[node:<kind>]`)**:
  `[node:<kind>] Display Name {color: green, customKey: "value with, comma", numericKey: 42, say: "..."}`
  Note: On `[node:<kind>]`, all keys except `color`, `group`/`zone`, `x`, `y`, `say`, and `pause` are preserved in `node.props` (including `caption`, `title`, `lines`, etc.). Quote strings containing commas, colons, spaces, or numeric/boolean literals (`"404"`, `"true"`).

### Composite Groups
```text
[group#stack-1] Architecture Layer {color: cyan, arrange: stack, gap: 16}
  [text#item-a] Client Request {color: yellow, bold: true}
  [shape:rounded#item-b] API Layer {color: green, fit: fixed, w: 180, h: 46}
```
- `arrange`: `card` | `stack` | `free`
- Indent children by 2 spaces per nesting level.
- Connectors can target nested children by their `#id` (e.g. `#item-a -> Target : Calls`).

### Connectors
- Solid arrow: `From -> To : Optional Label {color: pink, x: 0, y: 0}`
- Dashed arrow: `From -.-> To : Optional Label`
- By ID: `#node-1 -> #node-2 : Next`
- Free coordinates (especially in `freeform`): `(-120, 80) -> (120, 80) : Timeline`

---

## 3. `document-md` Codec Grammar

Used by `layout: document` (Letter / Narrative Doc):

- `# Document Title` — sets scene title
- `## Heading` — bold left-aligned heading/salutation
- `>> Paragraph line` — indented body paragraph (`indentChars: 2`; consecutive `>>` lines merge into a multi-line paragraph keeping `\n`)
- Plain text lines — unindented left-aligned paragraphs
- `---` — hand-drawn horizontal divider shape
- `> Sign-off line` — right-aligned block (consecutive `>` lines merge)
- Trailing metadata on any block: `{color, align, size, bold, indent, say, pause, x, y}`
- Embedded diagram items (`[shape:...]`, `[node:...]`, `[group]`, and `#id -> #id` connectors between declared blocks) are also preserved losslessly in document scenes. Prose lines containing `->` remain plain paragraphs unless both endpoints match existing nodes/IDs or `(x, y)` coordinates.

---

## 4. Bundled CLI Commands (`./scripts/render-script.ts`)

- Print full live plugin & codec spec:
  `node ./scripts/render-script.ts --spec`
- Export `.penova.json` + `.srt` + `.svg` poster:
  `node ./scripts/render-script.ts <input.penova.md> [output-dir]`
- Export `.tar` SVG animation frame sequence (`svg-sequence-tar`):
  `node ./scripts/render-script.ts <input.penova.md> [output-dir] --exporter=svg-sequence-tar --fps=12`
