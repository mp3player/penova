import { samplePointAlongStroke } from '../sketch/handDrawnGeometry';
import { getGlyphTipAtProgress } from '../sketch/textStrokes';
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
  tMs: number
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
        const p =
          (tMs - span.startMs) / Math.max(1, span.endMs - span.startMs);
        const pt = getGlyphTipAtProgress(span.glyph, span.boxX, span.boxY, p);
        return {
          x: pt.x,
          y: pt.y,
          penDown: true,
          lift: 0,
          velocity: 0.9,
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

  const allItems = timeline.allItems;
  let activeItemIdx = -1;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    if (tMs >= item.endMs) {
      itemProgress.set(item.id, 1);
    } else if (tMs <= item.startMs) {
      itemProgress.set(item.id, 0);
    } else {
      const p = (tMs - item.startMs) / Math.max(1, item.endMs - item.startMs);
      itemProgress.set(item.id, p);
      activeItemIdx = i;
    }
  }

  // Default hidden pen if empty timeline
  if (allItems.length === 0) {
    return {
      tMs,
      activeStepIndex: 0,
      itemProgress,
      pen: {
        visible: false,
        worldX: 0,
        worldY: 0,
        penDown: false,
        lift: 0,
        color: 'white',
        velocity: 0,
        seed: 0,
        alpha: 0,
      },
    };
  }

  // Case 1: Actively drawing an item
  if (activeItemIdx !== -1) {
    const item = allItems[activeItemIdx];
    const p = itemProgress.get(item.id) ?? 0;

    if (item.kind === 'text-line') {
      const tip = evaluatePenForTextLine(item, tMs);
      return {
        tMs,
        activeStepIndex,
        itemProgress,
        pen: {
          visible: true,
          worldX: tip.x,
          worldY: tip.y,
          penDown: tip.penDown,
          lift: tip.lift,
          color: item.color,
          velocity: tip.velocity,
          seed: Math.floor(tMs / 35),
          alpha: 1,
        },
      };
    }

    const pt = samplePointAlongStroke(item.stroke, p);
    const vel = Math.sin(p * Math.PI) * 0.65 + 0.35;
    return {
      tMs,
      activeStepIndex,
      itemProgress,
      pen: {
        visible: true,
        worldX: pt.x,
        worldY: pt.y,
        penDown: true,
        lift: 0,
        color: item.color,
        velocity: vel,
        seed: Math.floor(tMs / 35),
        alpha: 1,
      },
    };
  }

  // Case 2: Before very first item starts (lead-in)
  const firstItem = allItems[0];
  if (tMs < firstItem.startMs) {
    const u = easeInOut(tMs / Math.max(1, firstItem.startMs));
    return {
      tMs,
      activeStepIndex: 0,
      itemProgress,
      pen: {
        visible: true,
        worldX: firstItem.startPoint.x + (1 - u) * 28,
        worldY: firstItem.startPoint.y + (1 - u) * 24,
        penDown: false,
        lift: (1 - u) * 14,
        color: firstItem.color,
        velocity: 0.15,
        seed: 1,
        alpha: u,
      },
    };
  }

  // Case 3: Outro after all drawing completed
  const lastItem = allItems[allItems.length - 1];
  if (tMs >= lastItem.endMs) {
    const sinceEnd = tMs - lastItem.endMs;
    const retreatU = easeInOut(Math.min(1, sinceEnd / 550));
    const alpha = Math.max(0, 1 - retreatU);
    return {
      tMs,
      activeStepIndex,
      itemProgress,
      pen: {
        visible: alpha > 0.02,
        worldX: lastItem.endPoint.x + retreatU * 48,
        worldY: lastItem.endPoint.y + retreatU * 40,
        penDown: false,
        lift: 8 + retreatU * 18,
        color: lastItem.color,
        velocity: 0,
        seed: 0,
        alpha,
      },
    };
  }

  // Case 4: Pen-up travel arc between previous completed item and next upcoming item
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

  const moveWindow = Math.min(gapSpan, 360);
  const moveStart = nextItem.startMs - moveWindow;

  if (tMs < moveStart) {
    return {
      tMs,
      activeStepIndex,
      itemProgress,
      pen: {
        visible: true,
        worldX: prevItem.endPoint.x + 8,
        worldY: prevItem.endPoint.y + 8,
        penDown: false,
        lift: 10,
        color: nextItem.color,
        velocity: 0,
        seed: 0,
        alpha: 0.92,
      },
    };
  }

  const u = easeInOut((tMs - moveStart) / Math.max(1, moveWindow));
  const dist = Math.hypot(
    nextItem.startPoint.x - prevItem.endPoint.x,
    nextItem.startPoint.y - prevItem.endPoint.y
  );
  const maxLift = Math.min(24, Math.max(6, dist * 0.06));
  const startX = gapSpan > 360 ? prevItem.endPoint.x + 8 : prevItem.endPoint.x;
  const startY = gapSpan > 360 ? prevItem.endPoint.y + 8 : prevItem.endPoint.y;

  return {
    tMs,
    activeStepIndex,
    itemProgress,
    pen: {
      visible: true,
      worldX: startX + (nextItem.startPoint.x - startX) * u,
      worldY: startY + (nextItem.startPoint.y - startY) * u,
      penDown: false,
      lift: Math.sin(rawU * Math.PI) * maxLift,
      color: nextItem.color,
      velocity: 0.2,
      seed: 0,
      alpha: 1,
    },
  };
}
