---
title: Freeform Sketch & Nested Groups Demo
aspectRatio: 16:9
subtitles: auto
---

=== scene ===
title: Layered Architecture Sketch
theme: blueprint
layout: freeform
camera: static-overview
hand: hand-chalk
transition: chalkboard-eraser
---
[root] Edge Client | Web or CLI {color: yellow, shape: none, x: -290, y: -90, say: "Clients send requests from browsers or headless scripts.", pause: 600}

[group#core-stack] Runtime Pipeline {color: cyan, arrange: stack, gap: 14, x: 40, y: -30}
  [text#stage-parse] 1. Parse .penova.md {color: yellow, bold: true, size: 19}
  [text#stage-layout] 2. Compute Layout & Steps {color: cyan, size: 18}
  [text#stage-svg] 3. Render SVG / Canvas {color: green, size: 18}

[shape:divider] Horizon Line {color: orange, w: 680, h: 18, x: 0, y: 145}
[text] Export targets: .mp4 · .svg · .tar · .penova.json {color: white, size: 17, x: 0, y: 185, say: "Every board exports cleanly in browser or headless environments.", pause: 900}

Edge Client -> #stage-parse : Submit script
(-300, 115) -> (300, 115) : Headless Data Flow {color: cyan}
