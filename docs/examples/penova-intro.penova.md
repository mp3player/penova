---
title: Penova Product Intro (6 Scenes)
aspectRatio: 16:9
subtitles: auto
---

=== scene ===
title: Why Penova
theme: chalkboard
layout: flow-horizontal
camera: auto-follow
hand: hand-chalk
transition: chalkboard-eraser
---
[root] Plain Text | .penova.md script {color: yellow, shape: circle}
[step] Plugin Core | Auto-assemble registries {color: cyan, shape: rounded}
[step] Stroke Engine | Nib, ink & smart cam {color: green, shape: rounded}
[highlight] 1080P Video | Zero-backend export {color: orange, shape: underline}

Plain Text -> Plugin Core : Parse
Plugin Core -> Stroke Engine : Compile
Stroke Engine -> 1080P Video : Render

=== scene ===
title: Core Design Principles
theme: blueprint
layout: concept-graph
camera: auto-follow
hand: hand-chalk
transition: page-turn
---
[root] SceneNode IR | text · shape · group {color: yellow, shape: rounded, group: Layer 1 Core}
[step] Strict DAG | UI -> Engine -> Plugins {color: cyan, shape: rounded, group: Layer 1 Core}
[concept] Text Codecs | script <-> SceneNode {color: green, shape: rounded, group: Layer 2 Extensible}
[highlight] Custom Plugins | Zero core edits {color: orange, shape: diamond, group: Layer 2 Extensible}

SceneNode IR -> Strict DAG : Enforces
Strict DAG -> Text Codecs : Drives
Text Codecs -> Custom Plugins : Extends

=== scene ===
title: 8-Registry Plugin System
theme: blueprint
layout: mindmap
camera: auto-follow
hand: hand-chalk
transition: chalkboard-eraser
---
[root] 8 Registries | Pure interfaces {color: yellow, shape: circle}
[highlight] Shapes & Layouts | 6 boxes · 6 modes {color: cyan, shape: rounded}
[highlight] Board & Hands | 4 styles · custom PNG {color: green, shape: rounded}
[concept] Glyph Engine | Latin + 汉字 strokes {color: pink, shape: cloud}
[highlight] Cam & Exporters | MP4 · PNG · FFmpeg {color: orange, shape: underline}

8 Registries -> Shapes & Layouts
8 Registries -> Board & Hands
8 Registries -> Glyph Engine
8 Registries -> Cam & Exporters

=== scene ===
title: Script-Driven Custom Plugins
theme: whiteboard
layout: flow-vertical
camera: auto-follow
hand: hand-chalk
transition: page-turn
---
[root] Register Plugin | Layout + textCodec {color: yellow, shape: rounded}
[step] Export Spec | Live grammar rules {color: cyan, shape: rounded}
[step] Write Script | Any tool or author {color: green, shape: rounded}
[highlight] Video Pipeline | Auto-compile 1080P {color: orange, shape: underline}

Register Plugin -> Export Spec : Introspect
Export Spec -> Write Script : Guide
Write Script -> Video Pipeline : Run

=== scene ===
title: Real Penmanship & Warmth
theme: letter-paper
layout: document
camera: pen-follow
hand: hand-chalk
transition: crossfade
---
## Dear Developers & Creators,

>> Penova separates structure from rendering: author once in plain text, and let pluggable layouts, brushes, and cameras bring every stroke to life—in both English and 汉字.

---

> Built with Penova
> MIT Open Source · mp3player/penova

=== scene ===
title: Full Studio & Open Source
theme: chalkboard
layout: concept-graph
camera: progressive-fit
hand: hand-chalk
---
[step] Live Workspace | Outline · Script · Undo {color: cyan, shape: rounded, group: Studio}
[concept] Media & i18n | .srt · Audio · EN/中文 {color: green, shape: rounded, group: Studio}
[highlight] GitHub · MIT | mp3player/penova {color: orange, shape: underline, group: Open Source}

Live Workspace -> Media & i18n : Sync
Media & i18n -> GitHub · MIT : Star & Fork
