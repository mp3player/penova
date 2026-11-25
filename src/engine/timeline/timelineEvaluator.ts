import {
  easeGlyphProgress,
  evaluateStrokeProgress,
} from '../../sdk/strokePath';
import { samplePointAlongStroke } from '../sketch/handDrawnGeometry';
import { getGlyphTipAtProgress } from '../sketch/textStrokes';
import { PACING_PRESETS } from './pacing';
import {
  CompiledTextLineItem,
  CompiledTimeline,
  TimelineEvalState,
} from './types';

function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function evaluatePenForTextLine(
  item: CompiledTextLineItem,
  tMs: number,
  endDecel = 0
): { x: number; y: number; penDown: boolean; lift: number; velocity: number } {
  if (item.spans.length === 0) {
    return {
      x: item.centerX,
      y: item.centerY,
      penDown: false,
      lift: 4,
      velocity: 0,
    };
  }

  for (let i = 0; i < item.spans.length; i++) {
    const span = item.spans[i];
    if (tMs <= span.endMs) {
      if (tMs >= span.startMs) {
        const rawP =
          (tMs - span.startMs) / Math.max(1, span.endMs - span.startMs);
        const p = easeGlyphProgress(rawP, endDecel);
        const pt = getGlyphTipAtProgress(span.glyph, span.boxX, span.boxY, p);
        return {
          x: pt.x,
          y: pt.y,
          penDown: true,
          lift: 0,
          velocity: Math.max(0.25, 0.9 - rawP * 0.4 * endDecel),
        };
      }
      // Hop between previous char end and current char start
      const prevEnd = i > 0 ? item.spans[i - 1].endTip : span.startTip;
      const prevMs = i > 0 ? item.spans[i - 1].endMs : item.startMs;
      const u = easeInOut(
        (tMs - prevMs) / Math.max(1, span.startMs - prevMs)
      );
      return {
        x: prevEnd.x + (span.startTip.x - prevEnd.x) * u,
        y: prevEnd.y + (span.startTip.y - prevEnd.y) * u,
        penDown: false,
        lift: Math.sin(u * Math.PI) * 5.5,
        velocity: 0.3,
      };
    }
  }

  const last = item.spans[item.spans.length - 1];
  return {
    x: last.endTip.x,
    y: last.endTip.y,
    penDown: false,
    lift: 3,
    velocity: 0,
  };
}

function computeSpotlightItemOpacities(
  timeline: CompiledTimeline,
  tMs: number,
  activeStepIndex: number
): Map<string, number> | undefined {
  if (!timeline.spotlight || timeline.steps.length <= 1) {
    return undefined;
  }

  const dimFloor = 0.26;
  const fadeMs = 260;
  const outroFadeMs = 420;
  const focusSets = timeline.steps.map(
    (s) => new Set(s.focusNodeIds ?? s.step.nodeIds)
  );
  const lastStepIdx = timeline.steps.length - 1;
  const inOutro = tMs >= timeline.outroStartMs;
  const outroU = inOutro
    ? easeInOut(Math.min(1, (tMs - timeline.outroStartMs) / outroFadeMs))
    : 0;

  const currStep = timeline.steps[activeStepIndex];
  const stepFadeU = currStep
    ? easeInOut(Math.min(1, Math.max(0, tMs - currStep.startMs) / fadeMs))
    : 1;

  const map = new Map<string, number>();

  for (const item of timeline.allItems) {
    if (inOutro) {
      const lastFocused = item.nodeId
        ? focusSets[lastStepIdx].has(item.nodeId)
        : item.stepIndex === lastStepIdx;
      const base = lastFocused ? 1 : dimFloor;
      map.set(item.id, base + (1 - base) * outroU);
      continue;
    }

    if (activeStepIndex === 0) {
      map.set(item.id, 1);
      continue;
    }

    if (item.stepIndex === activeStepIndex) {
      map.set(item.id, 1);
      continue;
    }

    const prevFocused = item.nodeId
      ? focusSets[activeStepIndex - 1].has(item.nodeId)
      : item.stepIndex === activeStepIndex - 1;
    const currFocused = item.nodeId
      ? focusSets[activeStepIndex].has(item.nodeId)
      : item.stepIndex === activeStepIndex;

    if (prevFocused && currFocused) {
      map.set(item.id, 1);
    } else if (!prevFocused && !currFocused) {
      map.set(item.id, dimFloor);
    } else if (prevFocused && !currFocused) {
      map.set(item.id, 1 - (1 - dimFloor) * stepFadeU);
    } else {
      map.set(item.id, dimFloor + (1 - dimFloor) * stepFadeU);
    }
  }

  return map;
}

export function evaluateTimelineAt(
  timeline: CompiledTimeline,
  rawTMs: number
): TimelineEvalState {
  const tMs = Math.max(0, Math.min(timeline.totalDurationMs, rawTMs));
  const itemProgress = new Map<string, number>();

  let activeStepIndex = Math.max(0, timeline.steps.length - 1);
  for (let i = 0; i < timeline.steps.length; i++) {
    if (tMs < timeline.steps[i].endMs) {
      activeStepIndex = i;
      break;
    }
  }

  const itemOpacity = computeSpotlightItemOpacities(
    timeline,
    tMs,
    activeStepIndex
  );
  const finish = (pen: TimelineEvalState['pen']): TimelineEvalState => ({
    tMs,
    activeStepIndex,
    itemProgress,
    ...(itemOpacity ? { itemOpacity } : {}),
    pen,
  });

  const pacing = timeline.pacing ?? PACING_PRESETS.natural;
  const allItems = timeline.allItems;
  let activeItemIdx = -1;
  let activeStrokeVelocity = 0.7;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    if (tMs >= item.endMs) {
      itemProgress.set(item.id, 1);
    } else if (tMs <= item.startMs) {
      itemProgress.set(item.id, 0);
    } else {
      const rawU = (tMs - item.startMs) / Math.max(1, item.endMs - item.startMs);
      if (item.kind === 'text-line') {
        itemProgress.set(item.id, rawU);
      } else {
        const evaluated = evaluateStrokeProgress(item.stroke, rawU, {
          endDecel: pacing.endDecel,
          cornerSlowdown: pacing.cornerSlowdown,
          cumTime: item.cumTime,
        });
        itemProgress.set(item.id, evaluated.progress);
        activeStrokeVelocity = evaluated.velocity;
      }
      activeItemIdx = i;
    }
  }

  // Default hidden pen if empty timeline
  if (allItems.length === 0) {
    return finish({
      visible: false,
      worldX: 0,
      worldY: 0,
      penDown: false,
      lift: 0,
      color: 'white',
      velocity: 0,
      seed: 0,
      alpha: 0,
    });
  }

  // Case 1: Actively drawing an item
  if (activeItemIdx !== -1) {
    const item = allItems[activeItemIdx];
    const p = itemProgress.get(item.id) ?? 0;

    if (item.kind === 'text-line') {
      const tip = evaluatePenForTextLine(item, tMs, pacing.endDecel);
      return finish({
        visible: true,
        worldX: tip.x,
        worldY: tip.y,
        penDown: tip.penDown,
        lift: tip.lift,
        color: item.color,
        velocity: tip.velocity,
        seed: Math.floor(tMs / 35),
        alpha: 1,
      });
    }

    const pt = samplePointAlongStroke(item.stroke, p);
    return finish({
      visible: true,
      worldX: pt.x,
      worldY: pt.y,
      penDown: true,
      lift: 0,
      color: item.color,
      velocity: activeStrokeVelocity,
      seed: Math.floor(tMs / 35),
      alpha: 1,
    });
  }

  // Case 2: Before very first item starts (lead-in)
  const firstItem = allItems[0];
  if (tMs < firstItem.startMs) {
    const u = easeInOut(tMs / Math.max(1, firstItem.startMs));
    return finish({
      visible: true,
      worldX: firstItem.startPoint.x + (1 - u) * 28,
      worldY: firstItem.startPoint.y + (1 - u) * 24,
      penDown: false,
      lift: (1 - u) * 14,
      color: firstItem.color,
      velocity: 0.15,
      seed: 1,
      alpha: u,
    });
  }

  // Case 3: Outro after all drawing completed
  const lastItem = allItems[allItems.length - 1];
  if (tMs >= lastItem.endMs) {
    const sinceEnd = tMs - lastItem.endMs;
    const retreatU = easeInOut(Math.min(1, sinceEnd / 550));
    const alpha = Math.max(0, 1 - retreatU);
    return finish({
      visible: alpha > 0.02,
      worldX: lastItem.endPoint.x + retreatU * 48,
      worldY: lastItem.endPoint.y + retreatU * 40,
      penDown: false,
      lift: 8 + retreatU * 18,
      color: lastItem.color,
      velocity: 0,
      seed: 0,
      alpha,
    });
  }

  // Case 4: Pen-up gap — 3-beat settle (hold -> retreat -> travel arc)
  let prevIdx = 0;
  for (let i = 0; i < allItems.length; i++) {
    if (allItems[i].endMs <= tMs) {
      prevIdx = i;
    } else {
      break;
    }
  }
  const prevItem = allItems[prevIdx];
  const nextItem = allItems[Math.min(allItems.length - 1, prevIdx + 1)];
  const gapSpan = Math.max(1, nextItem.startMs - prevItem.endMs);
  const rawU = (tMs - prevItem.endMs) / gapSpan;

  const settleEnd =
    pacing.settleHoldMs > 0
      ? Math.min(
          nextItem.startMs,
          prevItem.endMs + Math.min(pacing.settleHoldMs, gapSpan * 0.38)
        )
      : prevItem.endMs;
  const moveWindow = Math.min(Math.max(0, nextItem.startMs - settleEnd), 360);
  const moveStart = nextItem.startMs - moveWindow;

  if (pacing.settleHoldMs > 0 && tMs < settleEnd) {
    const settleDur = Math.max(1, settleEnd - prevItem.endMs);
    const holdU = Math.max(0, Math.min(1, (tMs - prevItem.endMs) / settleDur));
    return finish({
      visible: true,
      worldX: prevItem.endPoint.x,
      worldY: prevItem.endPoint.y,
      penDown: false,
      lift: holdU * 4.5,
      color: prevItem.color,
      velocity: 0,
      seed: 0,
      alpha: 0.98,
    });
  }

  const retreatX = prevItem.endPoint.x + pacing.retreatOffsetPx;
  const retreatY =
    prevItem.endPoint.y + Math.round(pacing.retreatOffsetPx * 0.85);

  if (tMs < moveStart) {
    if (pacing.settleHoldMs <= 0) {
      return finish({
        visible: true,
        worldX: retreatX,
        worldY: retreatY,
        penDown: false,
        lift: 10,
        color: nextItem.color,
        velocity: 0,
        seed: 0,
        alpha: pacing.restAlpha,
      });
    }
    const retreatWindow = Math.max(
      1,
      Math.min(180, Math.max(1, moveStart - settleEnd))
    );
    const ru = easeInOut(Math.min(1, (tMs - settleEnd) / retreatWindow));
    return finish({
      visible: true,
      worldX: prevItem.endPoint.x + (retreatX - prevItem.endPoint.x) * ru,
      worldY: prevItem.endPoint.y + (retreatY - prevItem.endPoint.y) * ru,
      penDown: false,
      lift: 4.5 + ru * 7.5,
      color: nextItem.color,
      velocity: 0,
      seed: 0,
      alpha: 0.98 + (pacing.restAlpha - 0.98) * ru,
    });
  }

  const u = easeInOut((tMs - moveStart) / Math.max(1, moveWindow));
  const dist = Math.hypot(
    nextItem.startPoint.x - prevItem.endPoint.x,
    nextItem.startPoint.y - prevItem.endPoint.y
  );
  const maxLift = Math.min(24, Math.max(6, dist * 0.06));
  const hadRetreat =
    moveStart > settleEnd + 20 || (pacing.settleHoldMs <= 0 && gapSpan > 360);
  const startX = hadRetreat ? retreatX : prevItem.endPoint.x;
  const startY = hadRetreat ? retreatY : prevItem.endPoint.y;

  return finish({
    visible: true,
    worldX: startX + (nextItem.startPoint.x - startX) * u,
    worldY: startY + (nextItem.startPoint.y - startY) * u,
    penDown: false,
    lift: Math.sin(rawU * Math.PI) * maxLift,
    color: nextItem.color,
    velocity: 0.2,
    seed: 0,
    alpha: hadRetreat ? pacing.restAlpha + (1 - pacing.restAlpha) * u : 1,
  });
}
