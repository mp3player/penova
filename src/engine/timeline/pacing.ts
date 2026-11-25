import {
  PacingPreset,
  ScenePacingConfig,
  ScenePacingOption,
} from '../../model/scene';

export const PACING_PRESETS: Record<PacingPreset, ScenePacingConfig> = {
  natural: {
    endDecel: 0.65,
    cornerSlowdown: 0.45,
    sameNodeStrokeMs: 55,
    innerGapMs: 135,
    codeLineGapMs: 110,
    partGapMs: 250,
    stepPauseMs: 560,
    leadInMs: 420,
    lastCharSlowdown: 1.22,
    settleHoldMs: 135,
    retreatOffsetPx: 20,
    restAlpha: 0.68,
  },
  crisp: {
    endDecel: 0.35,
    cornerSlowdown: 0.22,
    sameNodeStrokeMs: 36,
    innerGapMs: 80,
    codeLineGapMs: 55,
    partGapMs: 150,
    stepPauseMs: 380,
    leadInMs: 320,
    lastCharSlowdown: 1.1,
    settleHoldMs: 80,
    retreatOffsetPx: 14,
    restAlpha: 0.78,
  },
  deliberate: {
    endDecel: 0.85,
    cornerSlowdown: 0.72,
    sameNodeStrokeMs: 85,
    innerGapMs: 185,
    codeLineGapMs: 160,
    partGapMs: 340,
    stepPauseMs: 740,
    leadInMs: 500,
    lastCharSlowdown: 1.32,
    settleHoldMs: 180,
    retreatOffsetPx: 24,
    restAlpha: 0.58,
  },
  linear: {
    endDecel: 0,
    cornerSlowdown: 0,
    sameNodeStrokeMs: 34,
    innerGapMs: 65,
    codeLineGapMs: 24,
    partGapMs: 95,
    stepPauseMs: 420,
    leadInMs: 440,
    lastCharSlowdown: 1.0,
    settleHoldMs: 0,
    retreatOffsetPx: 8,
    restAlpha: 0.92,
  },
};

export function isPacingPreset(raw: string): raw is PacingPreset {
  return (
    raw === 'natural' ||
    raw === 'crisp' ||
    raw === 'deliberate' ||
    raw === 'linear'
  );
}

export function resolveScenePacing(
  option?: ScenePacingOption
): ScenePacingConfig {
  if (!option) {
    return PACING_PRESETS.natural;
  }
  if (typeof option === 'string') {
    return isPacingPreset(option)
      ? PACING_PRESETS[option]
      : PACING_PRESETS.natural;
  }
  return {
    ...PACING_PRESETS.natural,
    ...option,
  };
}
