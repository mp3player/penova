import { describe, expect, it } from 'vitest';
import { evaluateCameraAt } from '../engine/camera/cameraDirector';
import { computeDiagramLayout } from '../engine/layout/diagramLayout';
import {
  compileTimeline,
  evaluateTimelineAt,
} from '../engine/timeline/timelineEngine';
import { createCardNode } from '../model/builders';
import { PRESET_SCENES, cloneScene } from '../model/presets';
import { CameraMode, GroupSceneNode } from '../model/scene';

describe('timelineEngine & cameraDirector', () => {
  it('compiles monotonic step timestamps and deterministic evaluation states', () => {
    for (const preset of PRESET_SCENES) {
      const layout = computeDiagramLayout(preset);
      const timeline = compileTimeline(preset, layout);

      expect(timeline.steps.length).toBeGreaterThan(0);
      expect(timeline.totalDurationMs).toBeGreaterThan(timeline.outroStartMs);

      let prevEnd = 0;
      for (const step of timeline.steps) {
        expect(step.startMs).toBe(prevEnd);
        expect(step.drawStartMs).toBeGreaterThanOrEqual(step.startMs);
        expect(step.drawEndMs).toBeGreaterThan(step.drawStartMs);
        expect(step.endMs).toBeGreaterThan(step.drawEndMs);
        prevEnd = step.endMs;
      }

      const evalStart = evaluateTimelineAt(timeline, 0);
      expect(evalStart.activeStepIndex).toBe(0);
      for (const item of timeline.allItems) {
        expect(evalStart.itemProgress.get(item.id)).toBe(0);
      }

      const midT = timeline.outroStartMs * 0.5;
      const evalMidA = evaluateTimelineAt(timeline, midT);
      const evalMidB = evaluateTimelineAt(timeline, midT);
      expect(evalMidA.activeStepIndex).toBe(evalMidB.activeStepIndex);
      expect(evalMidA.pen).toEqual(evalMidB.pen);
      expect(Number.isFinite(evalMidA.pen.worldX)).toBe(true);
      expect(Number.isFinite(evalMidA.pen.worldY)).toBe(true);

      const evalEnd = evaluateTimelineAt(timeline, timeline.totalDurationMs);
      for (const item of timeline.allItems) {
        expect(evalEnd.itemProgress.get(item.id)).toBe(1);
      }
      expect(evalEnd.pen.visible).toBe(false);
    }
  });

  it('draws GroupSceneNode children strictly in child array order', () => {
    const base = cloneScene(PRESET_SCENES[0]);
    const cardA = createCardNode({
      id: 'order-card',
      label: '顺序测试',
      color: 'yellow',
      shape: 'rounded',
    });
    // Default card order: [shape, title] -> shape draws before text
    const sceneShapeFirst = { ...base, nodes: [cardA] };
    const tl1 = compileTimeline(
      sceneShapeFirst,
      computeDiagramLayout(sceneShapeFirst)
    );
    const shape1 = tl1.allItems.find((i) => i.kind === 'stroke')!;
    const text1 = tl1.allItems.find((i) => i.kind === 'text-line')!;
    expect(shape1.startMs).toBeLessThan(text1.startMs);

    // Reorder children: [title, shape] -> text draws before shape
    const cardB: GroupSceneNode = {
      ...cardA,
      children: [...cardA.children].reverse(),
    };
    const sceneTextFirst = { ...base, nodes: [cardB] };
    const tl2 = compileTimeline(
      sceneTextFirst,
      computeDiagramLayout(sceneTextFirst)
    );
    const shape2 = tl2.allItems.find((i) => i.kind === 'stroke')!;
    const text2 = tl2.allItems.find((i) => i.kind === 'text-line')!;
    expect(text2.startMs).toBeLessThan(shape2.startMs);
  });

  it('produces valid finite camera states across all camera modes', () => {
    const cameraModes: CameraMode[] = [
      'auto-follow',
      'progressive-fit',
      'static-overview',
    ];
    const preset = PRESET_SCENES[1];
    const layout = computeDiagramLayout(preset);
    const timeline = compileTimeline(preset, layout);

    for (const mode of cameraModes) {
      const samples = [
        0,
        timeline.steps[0].drawStartMs + 50,
        timeline.outroStartMs * 0.5,
        timeline.outroStartMs + 200,
        timeline.totalDurationMs,
      ];

      for (const t of samples) {
        const cam = evaluateCameraAt(timeline, t, 1920, 1080, mode);
        expect(Number.isFinite(cam.cx)).toBe(true);
        expect(Number.isFinite(cam.cy)).toBe(true);
        expect(Number.isFinite(cam.zoom)).toBe(true);
        expect(cam.zoom).toBeGreaterThan(0.1);
        expect(cam.zoom).toBeLessThanOrEqual(2);
      }
    }
  });
});
