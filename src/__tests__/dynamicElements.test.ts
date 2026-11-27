import { describe, expect, it } from 'vitest';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import { evaluateSceneFrameSnapshot } from '../engine/render/frameSnapshot';
import { compileTimeline } from '../engine/timeline/timelineEngine';
import { CompiledStrokeItem } from '../engine/timeline/types';
import { parseProjectScript, serializeProjectScript } from '../engine/parser/projectScript';
import { createCustomNode } from '../model/builders';
import { isCustomSceneNode, LessonScene } from '../model/scene';
import { fitBounds } from '../plugins/cameras/helpers';
import { compileMathExpr } from '../sdk/mathExpr';

describe('safe mathExpr parser & post-draw dynamic elements', () => {
  it('evaluates arithmetic, right-associative powers, built-in functions, and Fourier sums safely', () => {
    const arith = compileMathExpr('2 + 3 * 4 - -2^3^2');
    expect(arith).not.toBeNull();
    // 2 + 12 - (-(2^9)) = 14 - (-512) = 526
    expect(arith!.evaluate({})).toBe(526);

    const safeDiv = compileMathExpr('10 / x + clamp(t, 0, 1)');
    expect(safeDiv).not.toBeNull();
    expect(safeDiv!.evaluate({ x: 0, t: 2.5 })).toBe(1);

    const fourier = compileMathExpr(
      'sum(k, 1, 5, sin((2*k-1)*(x - 2*t)) / (2*k-1))'
    );
    expect(fourier).not.toBeNull();
    const x = 1.25;
    const t = 0.4;
    let expected = 0;
    for (let k = 1; k <= 5; k++) {
      expected += Math.sin((2 * k - 1) * (x - 2 * t)) / (2 * k - 1);
    }
    expect(fourier!.evaluate({ x, t })).toBeCloseTo(expected, 10);

    // Iteration count safety cap (<= 64 terms even if upper bound is huge)
    const capped = compileMathExpr('sum(k, 1, 100000, 1)');
    expect(capped).not.toBeNull();
    expect(capped!.evaluate({})).toBe(64);

    // Invalid / unknown expressions fail cleanly with null
    expect(compileMathExpr('')).toBeNull();
    expect(compileMathExpr('alert(1)')).toBeNull();
    expect(compileMathExpr('1 + * 2')).toBeNull();
    expect(compileMathExpr('sum(1, 1, 5, x)')).toBeNull();

    // Parse depth limit protects against deeply nested parentheses
    expect(compileMathExpr('('.repeat(60) + '1' + ')'.repeat(60))).toBeNull();

    // Evaluation step budget stops explosive nested sum loops cleanly
    const nestedSum = compileMathExpr(
      'sum(a, 1, 64, sum(b, 1, 64, sum(c, 1, 64, 1)))'
    );
    expect(nestedSum).not.toBeNull();
    const nestedResult = nestedSum!.evaluate({});
    expect(Number.isFinite(nestedResult)).toBe(true);
    expect(nestedResult).toBeLessThanOrEqual(2048);
  });

  it('compiles [node:wave] in formula, data-series, and preset modes with zero-pop initial stroke and post-draw SVG/snapshot parity', () => {
    const scene: LessonScene = {
      id: 'wave-modes-test',
      title: 'Wave Modes',
      theme: 'chalkboard',
      layoutMode: 'flow-horizontal',
      cameraMode: 'static-overview',
      aspectRatio: '16:9',
      handStyle: 'hand-chalk',
      nodes: [
        createCustomNode({
          id: 'w-formula',
          kind: 'wave',
          name: 'Fourier',
          color: 'cyan',
          props: {
            title: 'Fourier Superposition',
            fn: 'sum(k, 1, 5, sin((2*k-1)*(x - 2*t)) / (2*k-1))',
            domain: '0..6.283',
            speed: 1.0,
          },
        }),
        createCustomNode({
          id: 'w-data',
          kind: 'wave',
          name: 'Traffic',
          color: 'green',
          props: {
            title: 'Real Data Series',
            values: '12,18,45,38,22,64,28',
            speed: 1.2,
          },
        }),
        createCustomNode({
          id: 'w-preset',
          kind: 'wave',
          name: 'ECG',
          color: 'yellow',
          props: {
            title: 'ECG Pulse',
            type: 'ecg',
            speed: 1.0,
          },
        }),
        createCustomNode({
          id: 'w-static',
          kind: 'wave',
          name: 'Static',
          color: 'orange',
          props: {
            title: 'Static Sine',
            type: 'sine',
            speed: 0,
          },
        }),
      ],
    };

    const layout = computeDiagramLayout(scene);
    const timeline = compileTimeline(scene, layout);

    for (const nid of ['w-formula', 'w-data', 'w-preset']) {
      const waveStroke = timeline.allItems.find(
        (i): i is CompiledStrokeItem =>
          i.kind === 'stroke' && i.id === `${nid}-wave`
      );
      expect(waveStroke).toBeDefined();
      expect(typeof waveStroke!.animate).toBe('function');

      // Zero-pop check: animate(0) matches initial drawn stroke identically
      const s0 = waveStroke!.animate!(0);
      expect(s0.points.length).toBe(waveStroke!.stroke.points.length);
      expect(s0.points[10].y).toBeCloseTo(waveStroke!.stroke.points[10].y, 6);

      // Motion check: elapsedMs=600 shifts curve coordinates
      const s600 = waveStroke!.animate!(600);
      const maxDeltaY = Math.max(
        ...s600.points.map((pt, idx) =>
          Math.abs(pt.y - waveStroke!.stroke.points[idx].y)
        )
      );
      expect(maxDeltaY).toBeGreaterThan(2);

      // Snapshot consistency: mid-draw equals static stroke; post-draw equals animated stroke
      const midDrawT = (waveStroke!.startMs + waveStroke!.endMs) * 0.5;
      const midSnap = evaluateSceneFrameSnapshot(
        scene,
        timeline,
        midDrawT,
        1920,
        1080
      );
      const midWave = midSnap.strokes.find((s) => s.id === `${nid}-wave`);
      expect(midWave).toBeDefined();
      expect(midWave!.stroke.points[10].y).toBeCloseTo(
        waveStroke!.stroke.points[10].y,
        6
      );

      const postDrawT = waveStroke!.endMs + 600;
      const postSnap = evaluateSceneFrameSnapshot(
        scene,
        timeline,
        postDrawT,
        1920,
        1080
      );
      const postWave = postSnap.strokes.find((s) => s.id === `${nid}-wave`);
      expect(postWave).toBeDefined();
      expect(postWave!.stroke.points[10].y).toBeCloseTo(s600.points[10].y, 6);
    }

    const staticWave = timeline.allItems.find(
      (i): i is CompiledStrokeItem =>
        i.kind === 'stroke' && i.id === 'w-static-wave'
    );
    expect(staticWave).toBeDefined();
    expect(staticWave!.animate).toBeUndefined();
  });

  it('animates [node:chart] bars and trend curve cleanly across multi-frame statistical data while preserving static charts', () => {
    const scene: LessonScene = {
      id: 'chart-dynamic-test',
      title: 'Dynamic & Static Charts',
      theme: 'chalkboard',
      layoutMode: 'flow-horizontal',
      cameraMode: 'static-overview',
      aspectRatio: '16:9',
      handStyle: 'hand-chalk',
      nodes: [
        createCustomNode({
          id: 'c-dyn',
          kind: 'chart',
          name: 'QPS',
          color: 'orange',
          props: {
            title: 'Cluster QPS',
            frames: '20,45,75,100 | 95,30,60,35',
            labels: 'A,B,C,D',
            speed: 1.0,
          },
        }),
        createCustomNode({
          id: 'c-stat',
          kind: 'chart',
          name: 'Static',
          color: 'cyan',
          props: {
            title: 'Static Growth',
            values: '20,45,75,100',
            labels: 'Q1,Q2,Q3,Q4',
          },
        }),
      ],
    };

    const layout = computeDiagramLayout(scene);
    const timeline = compileTimeline(scene, layout);

    const bar0 = timeline.allItems.find(
      (i): i is CompiledStrokeItem =>
        i.kind === 'stroke' && i.id === 'c-dyn-bar-0'
    )!;
    const bar3 = timeline.allItems.find(
      (i): i is CompiledStrokeItem =>
        i.kind === 'stroke' && i.id === 'c-dyn-bar-3'
    )!;
    const trend = timeline.allItems.find(
      (i): i is CompiledStrokeItem =>
        i.kind === 'stroke' && i.id === 'c-dyn-trend'
    )!;

    expect(bar0.animate).toBeDefined();
    expect(bar3.animate).toBeDefined();
    expect(trend.animate).toBeDefined();

    // Node-level clock sync: bars + trend all share the chart's final completion endMs
    expect(bar0.animateStartMs).toBe(trend.endMs);
    expect(bar3.animateStartMs).toBe(trend.endMs);
    expect(trend.animateStartMs).toBe(trend.endMs);

    // While chart is still finishing later strokes, bar0 stays frozen at Frame 0 (zero premature wobble)
    const midChartT = bar0.endMs + (trend.endMs - bar0.endMs) * 0.5;
    const midSnap = evaluateSceneFrameSnapshot(scene, timeline, midChartT, 1920, 1080);
    const midBar0 = midSnap.strokes.find((s) => s.id === 'c-dyn-bar-0')!;
    expect(midBar0.stroke.points[0].y).toBeCloseTo(bar0.stroke.points[0].y, 6);

    // Fixed topology: bar point count never shifts across heights (zero subdivision jump)
    expect(bar0.animate!(0).points.length).toBe(bar0.animate!(750).points.length);

    // Frame 0 -> Frame 1: bar 0 rises (20 -> 95, smaller yTop), bar 3 drops (100 -> 35, larger yTop)
    const minY = (pts: { y: number }[]) => Math.min(...pts.map((p) => p.y));
    expect(bar0.animate!(0).points[0].y).toBeCloseTo(bar0.stroke.points[0].y, 6);
    expect(minY(bar0.animate!(750).points)).toBeLessThan(minY(bar0.stroke.points) - 20);
    expect(minY(bar3.animate!(750).points)).toBeGreaterThan(minY(bar3.stroke.points) + 20);
    expect(trend.animate!(750).points[0].y).toBeLessThan(trend.stroke.points[0].y - 20);

    // Locked-phase check: trend vertices sit tightly just above each live bar top
    const postSnap = evaluateSceneFrameSnapshot(
      scene,
      timeline,
      bar0.animateStartMs! + 750,
      1920,
      1080
    );
    const liveBar0TopY = minY(postSnap.strokes.find((s) => s.id === 'c-dyn-bar-0')!.stroke.points);
    const liveTrendStartY = postSnap.strokes.find((s) => s.id === 'c-dyn-trend')!.stroke.points[0].y;
    expect(Math.abs(liveBar0TopY - liveTrendStartY)).toBeLessThan(16);

    // Static chart keeps animate undefined
    const staticBar0 = timeline.allItems.find(
      (i): i is CompiledStrokeItem =>
        i.kind === 'stroke' && i.id === 'c-stat-bar-0'
    )!;
    expect(staticBar0.animate).toBeUndefined();
  });

  it('round-trips [node:wave] formulas and [node:chart] frames through .penova.md parser cleanly', () => {
    const script = [
      '=== scene ===',
      'title: Dynamic Script Roundtrip',
      '[node:wave] Fourier {color: cyan, title: "Fourier", fn: "sum(k, 1, 5, sin((2*k-1)*(x - 2*t)) / (2*k-1))", domain: "0..6.283", speed: 1.2}',
      '[node:chart] Stats {color: orange, title: "Stats", frames: "20,45,75,100 | 68,92,38,72", labels: "Q1,Q2,Q3,Q4", speed: 1.1}',
    ].join('\n');

    const parsed1 = parseProjectScript(script);
    expect(parsed1.warnings).toEqual([]);
    const res = serializeProjectScript(parsed1.project);
    const parsed2 = parseProjectScript(res);
    expect(parsed2.warnings).toEqual([]);

    const waveNode = parsed2.project.scenes[0].nodes.find((n) => n.name === 'Fourier');
    const chartNode = parsed2.project.scenes[0].nodes.find((n) => n.name === 'Stats');
    expect(waveNode && isCustomSceneNode(waveNode)).toBe(true);
    if (waveNode && isCustomSceneNode(waveNode)) {
      expect(waveNode.props?.fn).toBe(
        'sum(k, 1, 5, sin((2*k-1)*(x - 2*t)) / (2*k-1))'
      );
    }
    expect(chartNode && isCustomSceneNode(chartNode)).toBe(true);
    if (chartNode && isCustomSceneNode(chartNode)) {
      expect(chartNode.props?.frames).toBe('20,45,75,100 | 68,92,38,72');
    }
  });

  it('uses >= 140 smooth samples for progressive Fourier convergence with guide stroke and scales 1080p camera zoom cleanly', () => {
    const scene: LessonScene = {
      id: 'fourier-progressive-test',
      title: 'Progressive Fourier & 1080p Framing',
      theme: 'chalkboard',
      layoutMode: 'flow-horizontal',
      cameraMode: 'static-overview',
      aspectRatio: '16:9',
      handStyle: 'hand-chalk',
      nodes: [
        createCustomNode({
          id: 'w-fourier',
          kind: 'wave',
          name: 'Fourier',
          color: 'cyan',
          props: {
            title: 'Progressive Fourier',
            type: 'fourier',
            harmonics: 5,
            freq: 1.5,
            speed: 1.0,
          },
        }),
      ],
    };

    const layout = computeDiagramLayout(scene);
    const timeline = compileTimeline(scene, layout);
    const refStroke = timeline.allItems.find(
      (i): i is CompiledStrokeItem =>
        i.kind === 'stroke' && i.id === 'w-fourier-fourier-ref'
    );
    const waveStroke = timeline.allItems.find(
      (i): i is CompiledStrokeItem =>
        i.kind === 'stroke' && i.id === 'w-fourier-wave'
    );

    expect(refStroke).toBeDefined();
    expect(refStroke!.stroke.dashed).toBe(true);
    expect(waveStroke).toBeDefined();
    expect(waveStroke!.stroke.points.length).toBeGreaterThanOrEqual(141);

    // Start point (theta = 0) stays anchored at zero; trough converges from -4/pi*amp toward -amp
    const s0 = waveStroke!.animate!(0);
    const sConv = waveStroke!.animate!(3400);
    expect(sConv.points[0].y).toBeCloseTo(s0.points[0].y, 4);
    const quarterIdx = Math.floor(s0.points.length * 0.08);
    expect(sConv.points[quarterIdx].y).not.toBeCloseTo(s0.points[quarterIdx].y, 0);

    // Camera framing: 960x540 keeps <= 1.35 maxZoom, 1920x1080 scales boldly past 1.55
    const box = { x: -170, y: -108, width: 340, height: 215 };
    const cam540 = fitBounds(box, 960, 540, 56, 0.22, 1.35);
    const cam1080 = fitBounds(box, 1920, 1080, 56, 0.22, 1.35);
    expect(cam540.zoom).toBeCloseTo(1.35, 3);
    expect(cam1080.zoom).toBeGreaterThan(1.55);
  });
});
