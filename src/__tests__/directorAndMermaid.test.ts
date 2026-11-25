import { describe, expect, it } from 'vitest';
import '../plugins';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import { defaultMeasureText } from '../engine/layout/textMeasure';
import {
  compileTimeline,
  evaluateTimelineAt,
} from '../engine/timeline/timelineEngine';
import {
  generateScriptSpec,
  parseProjectScript,
  serializeProjectScript,
} from '../engine/parser/projectScript';
import {
  evaluateSceneFrameSnapshot,
  renderSnapshotToSvg,
} from '../engine/render/frameSnapshot';
import { parseHighlightLineSet } from '../plugins/nodes/codeNodePlugin';
import {
  isMermaidScript,
  parseMermaidToScene,
} from '../plugins/codecs/mermaidCodec';
import { parseScriptToScene } from '../plugins/codecs/scriptParser';
import { LessonScene } from '../model/scene';

function makeBaseScene(overrides: Partial<LessonScene> = {}): LessonScene {
  return {
    id: 'test-scene',
    title: 'Test Scene',
    theme: 'chalkboard',
    layoutMode: 'flow-horizontal',
    cameraMode: 'auto-follow',
    aspectRatio: '16:9',
    handStyle: 'hand-chalk',
    nodes: [],
    ...overrides,
  };
}

describe('Code Window Line Highlighter', () => {
  it('parses single lines, ranges, reversed ranges, and ignores out-of-bounds indices', () => {
    const set = parseHighlightLineSet('2, 5-3, 99, 0', 6);
    expect(Array.from(set).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('compiles highlighter sweep strokes for highlighted lines', () => {
    const script = `
[node:code] Snippet {color: cyan, title: "server.ts", lines: "const app = init();\\napp.use(auth);\\napp.listen(3000);", highlight: "2", highlightColor: "yellow"}
`;
    const { scene, warnings } = parseScriptToScene(script, makeBaseScene());
    expect(warnings).toEqual([]);
    const layout = computeDiagramLayout(scene);
    const timeline = compileTimeline(scene, layout);

    const hlStrokes = timeline.allItems.filter(
      (item) => item.kind === 'stroke' && item.id.includes('-hl-')
    );
    expect(hlStrokes.length).toBe(1);
    if (hlStrokes[0].kind === 'stroke') {
      expect(hlStrokes[0].color).toBe('yellow');
      expect(hlStrokes[0].stroke.width).toBeGreaterThanOrEqual(15);
      expect(hlStrokes[0].stroke.opacity).toBeLessThan(0.35);
    }

    const snap = evaluateSceneFrameSnapshot(
      scene,
      timeline,
      timeline.totalDurationMs,
      1280,
      720
    );
    const svg = renderSnapshotToSvg(snap);
    expect(svg).toContain('<svg');
    expect(svg).toContain('server.ts');

    const monoFont = '400 13.5px "JetBrains Mono", monospace';
    expect(defaultMeasureText('i', monoFont)).toBeCloseTo(
      defaultMeasureText('w', monoFont),
      3
    );
    expect(defaultMeasureText(' ', monoFont)).toBeGreaterThanOrEqual(
      13.5 * 0.6
    );
  });
});

describe('Overlay [node:annotate] & Zero Layout Displacement', () => {
  it('attaches overlay annotations directly onto target bounds without shifting existing nodes', () => {
    const baseDsl = `
# Overlay Test
[step] Client {color: cyan}
[step] Server {color: green}
Client -> Server : Request
`;
    const annotatedDsl = `
${baseDsl}
[node:annotate] CircleServer {style: circle, target: "Server", label: "Hotspot!", color: pink}
[node:annotate] CrossClient {style: cross, target: "Client", color: orange}
[node:annotate] CheckServer {style: check, target: "Server", color: green}
[node:annotate] UnderClient {style: underline, target: "Client", color: yellow}
[node:annotate] MarkServer {style: highlight, target: "Server", color: yellow}
`;

    const baseParsed = parseScriptToScene(baseDsl, makeBaseScene());
    const annoParsed = parseScriptToScene(annotatedDsl, makeBaseScene());
    expect(annoParsed.warnings).toEqual([]);

    const baseLayout = computeDiagramLayout(baseParsed.scene);
    const annoLayout = computeDiagramLayout(annoParsed.scene);

    const baseClient = baseLayout.nodes.find((n) => n.node.name === 'Client')!;
    const baseServer = baseLayout.nodes.find((n) => n.node.name === 'Server')!;
    const annoClient = annoLayout.nodes.find((n) => n.node.name === 'Client')!;
    const annoServer = annoLayout.nodes.find((n) => n.node.name === 'Server')!;

    expect(annoClient.cx).toBeCloseTo(baseClient.cx, 3);
    expect(annoClient.cy).toBeCloseTo(baseClient.cy, 3);
    expect(annoServer.cx).toBeCloseTo(baseServer.cx, 3);
    expect(annoServer.cy).toBeCloseTo(baseServer.cy, 3);

    const circleAnno = annoLayout.nodes.find(
      (n) => n.node.name === 'CircleServer'
    )!;
    expect(circleAnno).toBeDefined();
    expect(circleAnno.cx).toBeCloseTo(baseServer.cx, 3);
    expect(circleAnno.cy).toBeCloseTo(baseServer.cy, 3);
    expect(circleAnno.width).toBeCloseTo(baseServer.width, 3);
    expect(circleAnno.height).toBeCloseTo(baseServer.height, 3);

    const timeline = compileTimeline(annoParsed.scene, annoLayout);
    expect(
      timeline.allItems.some((item) => item.id.endsWith('-circle'))
    ).toBe(true);
    expect(
      timeline.allItems.some((item) => item.id.endsWith('-cross-1'))
    ).toBe(true);
    expect(
      timeline.allItems.some((item) => item.id.endsWith('-check'))
    ).toBe(true);
    expect(
      timeline.allItems.some((item) => item.id.endsWith('-ul-1'))
    ).toBe(true);
    expect(
      timeline.allItems.some((item) => item.id.endsWith('-highlight'))
    ).toBe(true);

    const serverStepIdx = timeline.steps.findIndex((s) =>
      s.step.nodeIds.includes(annoServer.id)
    );
    const circleStepIdx = timeline.steps.findIndex((s) =>
      s.step.nodeIds.includes(circleAnno.id)
    );
    expect(serverStepIdx).toBeGreaterThanOrEqual(0);
    expect(circleStepIdx).toBeGreaterThan(serverStepIdx);
  });
});

describe('Director Spotlight Focus Dimming', () => {
  it('parses/serializes spotlight: true, dims prior nodes, preserves annotated targets, and restores on outro', () => {
    const projectScript = `---
title: Spotlight Test
aspectRatio: 16:9
---

=== scene ===
title: Spotlight Flow
theme: chalkboard
layout: flow-horizontal
spotlight: true
---
[step#a] Alpha {color: yellow}
[step#b] Beta {color: cyan}
[node:annotate#ann] FocusAlpha {style: circle, target: "#a", color: pink}
`;

    const { project, warnings } = parseProjectScript(projectScript);
    expect(warnings).toEqual([]);
    expect(project.scenes[0].spotlight).toBe(true);

    const serialized = serializeProjectScript(project);
    expect(serialized).toContain('spotlight: true');
    expect(generateScriptSpec()).toContain('spotlight');

    const scene = project.scenes[0];
    const layout = computeDiagramLayout(scene);
    const timeline = compileTimeline(scene, layout);
    expect(timeline.spotlight).toBe(true);
    expect(timeline.steps.length).toBeGreaterThanOrEqual(3);

    const step0Item = timeline.steps[0].items[0];
    const step1Item = timeline.steps[1].items[0];
    const step2Item = timeline.steps[2].items[0];

    // During step 1 (after 260ms fade settles), step 0 item (Alpha) dims to 0.26 while step 1 item (Beta) is 1.0
    const evalStep1 = evaluateTimelineAt(
      timeline,
      timeline.steps[1].startMs + 300
    );
    expect(evalStep1.itemOpacity?.get(step0Item.id)).toBeCloseTo(0.26, 2);
    expect(evalStep1.itemOpacity?.get(step1Item.id)).toBe(1);

    const svgStep1 = renderSnapshotToSvg(
      evaluateSceneFrameSnapshot(
        scene,
        timeline,
        timeline.steps[1].startMs + 300,
        1280,
        720
      )
    );
    expect(svgStep1).toContain('opacity="0.260"');

    // During step 2 (annotating Alpha), both the annotation AND Alpha return to 1.0 while Beta dims to 0.26
    const evalStep2 = evaluateTimelineAt(
      timeline,
      timeline.steps[2].startMs + 320
    );
    expect(evalStep2.itemOpacity?.get(step2Item.id)).toBe(1);
    expect(evalStep2.itemOpacity?.get(step0Item.id)).toBeCloseTo(1, 2);
    expect(evalStep2.itemOpacity?.get(step1Item.id)).toBeCloseTo(0.26, 2);

    // During outro after final settle fade, all elements return cleanly to 1.0
    const evalOutro = evaluateTimelineAt(
      timeline,
      timeline.outroStartMs + 600
    );
    expect(evalOutro.itemOpacity?.get(step0Item.id)).toBeCloseTo(1, 2);
    expect(evalOutro.itemOpacity?.get(step1Item.id)).toBeCloseTo(1, 2);
    expect(evalOutro.itemOpacity?.get(step2Item.id)).toBeCloseTo(1, 2);
  });
});

describe('Native Mermaid Flowchart Importer & Auto-Detection', () => {
  it('detects mermaid syntax reliably across fences and rejects plain Penova DSL', () => {
    expect(isMermaidScript('flowchart LR\n  A --> B')).toBe(true);
    expect(isMermaidScript('```mermaid\n%% comment\ngraph TD\n  A --> B\n```')).toBe(true);
    expect(isMermaidScript('[root] Start\nStart -> End')).toBe(false);
  });

  it('imports subgraphs, shapes, dashed & chained edges, ampersands, and chooses layout automatically', () => {
    const mermaidSrc = `
%% title: Auth Pipeline
flowchart LR
  U([User App]) -->|HTTPS| G{API Gateway}
  subgraph Core Backend
    G -->|Verify| A[Auth Service] & L[Audit Log]
    A -.->|Cache| R[(Redis)]
  end
  style U fill:#f9f
`;

    const base = makeBaseScene({ layoutMode: 'flow-vertical' });
    const { scene, warnings } = parseScriptToScene(mermaidSrc, base);
    expect(warnings).toEqual([]);
    expect(scene.title).toBe('Auth Pipeline');
    expect(scene.layoutMode).toBe('concept-graph');

    const nonConnectors = scene.nodes.filter((n) => n.type !== 'connector');
    const connectors = scene.nodes.filter((n) => n.type === 'connector');
    expect(nonConnectors.length).toBe(5);
    expect(connectors.length).toBe(4);

    const authNode = nonConnectors.find((n) => n.name === 'Auth Service');
    expect(authNode?.meta?.zone).toBe('Core Backend');
    expect(
      connectors.some(
        (c) => c.type === 'connector' && c.style === 'dashed' && c.label === 'Cache'
      )
    ).toBe(true);

    // Without subgraphs, LR chooses flow-horizontal and TD chooses flow-vertical
    const lrParsed = parseMermaidToScene('flowchart LR\n  A --> B', base);
    expect(lrParsed.scene.layoutMode).toBe('flow-horizontal');
    const tdParsed = parseMermaidToScene('flowchart TD\n  A --> B', base);
    expect(tdParsed.scene.layoutMode).toBe('flow-vertical');

    const layout = computeDiagramLayout(scene);
    const timeline = compileTimeline(scene, layout);
    const svg = renderSnapshotToSvg(
      evaluateSceneFrameSnapshot(
        scene,
        timeline,
        timeline.totalDurationMs,
        1280,
        720
      )
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('API');
    expect(svg).toContain('Gateway');
    expect(svg).toContain('Redis');
  });
});
