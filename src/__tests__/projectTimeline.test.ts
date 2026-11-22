import { describe, expect, it } from 'vitest';
import {
  clearSceneCompileCache,
  collectGlobalStepStarts,
  compileProjectTimeline,
  evaluateProjectAt,
} from '../engine/timeline/projectTimeline';
import { transitionRegistry } from '../plugins';
import { PRESET_PROJECTS, PRESET_SCENES } from '../model/presets';
import { cloneProject, createProjectFromScene } from '../model/project';

describe('projectTimeline (multi-scene sequencing)', () => {
  it('preserves single-scene duration and always evaluates inside scene 0', () => {
    const single = createProjectFromScene(PRESET_SCENES[0]);
    const compiled = compileProjectTimeline(single);

    expect(compiled.segments).toHaveLength(1);
    expect(compiled.totalDurationMs).toBe(
      compiled.segments[0].timeline.totalDurationMs
    );

    const startState = evaluateProjectAt(compiled, 0);
    expect(startState.kind).toBe('scene');
    if (startState.kind === 'scene') {
      expect(startState.sceneIndex).toBe(0);
      expect(startState.localTMs).toBe(0);
    }

    const endState = evaluateProjectAt(compiled, compiled.totalDurationMs);
    expect(endState.kind).toBe('scene');
    if (endState.kind === 'scene') {
      expect(endState.sceneIndex).toBe(0);
      expect(endState.localTMs).toBe(compiled.totalDurationMs);
    }
  });

  it('compiles 2-scene project with transition window and evaluates scene/transition phases accurately', () => {
    const multi = PRESET_PROJECTS.find((p) => p.id === 'http-lesson-multi')!;
    expect(multi).toBeDefined();
    expect(multi.scenes).toHaveLength(2);

    const compiled = compileProjectTimeline(cloneProject(multi));
    const seg0 = compiled.segments[0];
    const seg1 = compiled.segments[1];
    const eraserDur = transitionRegistry.getOrDefault('chalkboard-eraser').defaultDurationMs;

    expect(seg0.transitionOut).toBeDefined();
    expect(seg0.transitionOut?.id).toBe('chalkboard-eraser');
    expect(seg0.transitionOut?.durationMs).toBe(eraserDur);
    expect(seg1.startMs).toBe(seg0.endMs + eraserDur);
    expect(compiled.totalDurationMs).toBe(seg1.endMs);

    // Mid-transition evaluation
    const midTransMs = seg0.endMs + eraserDur * 0.5;
    const transEval = evaluateProjectAt(compiled, midTransMs);
    expect(transEval.kind).toBe('transition');
    if (transEval.kind === 'transition') {
      expect(transEval.transitionId).toBe('chalkboard-eraser');
      expect(transEval.progress).toBeCloseTo(0.5, 4);
      expect(transEval.fromSegment.sceneIndex).toBe(0);
      expect(transEval.toSegment.sceneIndex).toBe(1);
    }

    // Scene 2 evaluation
    const scene2Eval = evaluateProjectAt(compiled, seg1.startMs + 250);
    expect(scene2Eval.kind).toBe('scene');
    if (scene2Eval.kind === 'scene') {
      expect(scene2Eval.sceneIndex).toBe(1);
      expect(scene2Eval.localTMs).toBeCloseTo(250, 3);
    }
  });

  it('skips transition interval completely when using 0ms cut transition', () => {
    const multi = cloneProject(
      PRESET_PROJECTS.find((p) => p.id === 'http-lesson-multi')!
    );
    multi.scenes[0].transitionOut = { type: 'cut' };

    const compiled = compileProjectTimeline(multi);
    expect(compiled.segments[0].transitionOut).toBeUndefined();
    expect(compiled.segments[1].startMs).toBe(compiled.segments[0].endMs);

    const atBoundary = evaluateProjectAt(compiled, compiled.segments[0].endMs);
    expect(atBoundary.kind).toBe('scene');
    if (atBoundary.kind === 'scene') {
      expect(atBoundary.sceneIndex).toBe(1);
      expect(atBoundary.localTMs).toBe(0);
    }
  });

  it('collects strictly increasing global step start timestamps across multiple scenes', () => {
    const multi = cloneProject(
      PRESET_PROJECTS.find((p) => p.id === 'http-lesson-multi')!
    );
    const compiled = compileProjectTimeline(multi);
    const starts = collectGlobalStepStarts(compiled);

    const expectedCount =
      compiled.segments[0].timeline.steps.length +
      compiled.segments[1].timeline.steps.length;
    expect(starts).toHaveLength(expectedCount);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]).toBeGreaterThan(starts[i - 1]);
    }
  });

  it('reuses cached scene timelines for unmodified scenes and invalidates on clearSceneCompileCache', () => {
    const base = cloneProject(
      PRESET_PROJECTS.find((p) => p.id === 'http-lesson-multi')!
    );
    const first = compileProjectTimeline(base);

    const updated = {
      ...base,
      scenes: [
        base.scenes[0],
        { ...base.scenes[1], title: '第二幕已编辑标题' },
      ],
    };
    const second = compileProjectTimeline(updated);

    expect(second.segments[0].timeline).toBe(first.segments[0].timeline);
    expect(second.segments[1].timeline).not.toBe(first.segments[1].timeline);

    clearSceneCompileCache();
    const third = compileProjectTimeline(updated);
    expect(third.segments[0].timeline).not.toBe(first.segments[0].timeline);
  });
});
