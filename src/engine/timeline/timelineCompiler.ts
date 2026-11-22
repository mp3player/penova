import '../../plugins';
import {
  ChalkColor,
  deriveTeachingSteps,
  LessonScene,
  Rect,
  TextAlign,
  ThemeId,
} from '../../model/scene';
import {
  layoutRegistry,
  presentationRegistry,
} from '../../plugins/registry';
import { ComputedLayout, PositionedSceneNode } from '../layout/diagramLayout';
import { resolveColorHex } from '../render/themes';
import {
  generateConnectorStrokes,
  generateGroupFrameStrokes,
  generateShapeStrokes,
  samplePointAlongStroke,
  StrokePath,
} from '../sketch/handDrawnGeometry';
import {
  getGlyphStrokeData,
  getGlyphTipAtProgress,
} from '../sketch/textStrokes';
import {
  CompiledGlyphSpan,
  CompiledGroupFrameItem,
  CompiledItem,
  CompiledStep,
  CompiledStrokeItem,
  CompiledTextLineItem,
  CompiledTimeline,
} from './types';

function mergeBounds(rects: Rect[], pad = 0): Rect {
  if (rects.length === 0) {
    return { x: -300, y: -180, width: 600, height: 360 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

function nodeRect(pNode: PositionedSceneNode, pad = 28): Rect {
  return {
    x: pNode.cx - pNode.width / 2 - pad,
    y: pNode.cy - pNode.height / 2 - pad,
    width: pNode.width + pad * 2,
    height: pNode.height + pad * 2,
  };
}

function compileTextLineItem(
  id: string,
  text: string,
  boxLeftX: number,
  boxWidth: number,
  centerY: number,
  align: TextAlign,
  indentPx: number,
  font: string,
  fontSize: number,
  color: ChalkColor,
  theme: ThemeId,
  startMs: number,
  msPerChar: number,
  flags?: { isEdgeLabel?: boolean; isGroupTitle?: boolean }
): CompiledTextLineItem {
  const colorHex = resolveColorHex(theme, color);
  const chars = Array.from(text);
  const glyphs = chars.map((ch) =>
    getGlyphStrokeData(ch, font, fontSize, colorHex, theme)
  );

  const totalAdvance = glyphs.reduce((acc, g) => acc + g.advanceWidth, 0);
  let cursorX: number;
  if (align === 'left') {
    cursorX = boxLeftX + indentPx;
  } else if (align === 'right') {
    cursorX = boxLeftX + boxWidth - totalAdvance;
  } else {
    cursorX = boxLeftX + (boxWidth - totalAdvance) / 2;
  }
  const lineCenterX = cursorX + totalAdvance / 2;

  let tCursor = startMs;
  const spans: CompiledGlyphSpan[] = [];
  const interCharHopMs = 16;

  const nonSpaceCount = chars.filter((c) => c.trim().length > 0).length;
  const maxLineDuration = flags?.isEdgeLabel ? 1500 : 2600;
  const rawCharMs =
    nonSpaceCount > 0
      ? Math.min(msPerChar, maxLineDuration / nonSpaceCount)
      : msPerChar;

  chars.forEach((ch, idx) => {
    const g = glyphs[idx];
    const boxX = cursorX - g.padX;
    const boxY = centerY - g.height * 0.52;
    cursorX += g.advanceWidth;

    if (ch.trim().length === 0) {
      tCursor += 18;
      return;
    }

    const strokeFactor = Math.max(0.72, Math.min(1.35, g.segments.length / 4));
    const charDur = Math.max(58, Math.round(rawCharMs * strokeFactor));
    const spanStart = tCursor;
    const spanEnd = spanStart + charDur;
    const startTip = getGlyphTipAtProgress(g, boxX, boxY, 0);
    const endTip = getGlyphTipAtProgress(g, boxX, boxY, 1);

    spans.push({
      char: ch,
      boxX,
      boxY,
      glyph: g,
      startMs: spanStart,
      endMs: spanEnd,
      startTip,
      endTip,
    });

    tCursor = spanEnd + interCharHopMs;
  });

  const endMs =
    spans.length > 0 ? spans[spans.length - 1].endMs : startMs + 140;

  return {
    kind: 'text-line',
    id,
    startMs,
    endMs,
    color,
    font,
    fontSize,
    isEdgeLabel: flags?.isEdgeLabel,
    isGroupTitle: flags?.isGroupTitle,
    centerX: lineCenterX,
    centerY,
    bgWidth: Math.max(24, totalAdvance + 16),
    bgHeight: Math.round(fontSize * 1.45),
    spans,
    startPoint:
      spans.length > 0 ? spans[0].startTip : { x: lineCenterX, y: centerY },
    endPoint:
      spans.length > 0
        ? spans[spans.length - 1].endTip
        : { x: lineCenterX, y: centerY },
  };
}

function strokeDurationMs(stroke: StrokePath): number {
  const speed = 440 * (stroke.speedFactor ?? 1);
  return Math.round(
    Math.max(150, Math.min(980, (stroke.totalLength / speed) * 1000))
  );
}

export function compileTimeline(
  scene: LessonScene,
  layout: ComputedLayout
): CompiledTimeline {
  const layoutPlugin = layoutRegistry.getOrDefault(scene.layoutMode);
  const presentation = presentationRegistry.getOrDefault(scene.theme);
  const boardFontFamily = presentation.fontFamily;
  const rawSteps =
    scene.customSteps && scene.customSteps.length > 0
      ? scene.customSteps
      : layoutPlugin.deriveSteps?.(scene) ?? deriveTeachingSteps(scene);

  const zoneByTitle = new Map(layout.zones.map((g) => [g.title, g]));
  const drawnZones = new Set<string>();

  const compiledSteps: CompiledStep[] = [];
  const allItems: CompiledItem[] = [];
  const cumulativeRects: Rect[] = [];
  let cursorMs = 0;

  rawSteps.forEach((step, stepIndex) => {
    const startMs = cursorMs;
    const leadInMs = stepIndex === 0 ? 320 : 440;
    const drawStartMs = startMs + leadInMs;
    let itemCursor = drawStartMs;
    const items: CompiledItem[] = [];
    const stepRects: Rect[] = [];

    const pushStroke = (stroke: StrokePath, gapAfterMs = 45) => {
      const dur = strokeDurationMs(stroke);
      const item: CompiledStrokeItem = {
        kind: 'stroke',
        id: stroke.id,
        startMs: itemCursor,
        endMs: itemCursor + dur,
        color: stroke.color,
        stroke,
        startPoint: samplePointAlongStroke(stroke, 0),
        endPoint: samplePointAlongStroke(stroke, 1),
      };
      items.push(item);
      allItems.push(item);
      itemCursor = item.endMs + gapAfterMs;
    };

    // 1. Reveal any zone frame newly entered by vertices in this step
    for (const nodeId of step.nodeIds) {
      const pNode = layout.nodeMap.get(nodeId);
      if (!pNode || pNode.node.type === 'connector') continue;
      const rawZone = pNode.node.meta?.zone;
      const zoneTitle =
        typeof rawZone === 'string' && rawZone.trim()
          ? rawZone.trim()
          : '核心概念';
      const zoneBox = zoneByTitle.get(zoneTitle);
      if (zoneBox && !drawnZones.has(zoneBox.id)) {
        drawnZones.add(zoneBox.id);
        const frameStrokes = generateGroupFrameStrokes(zoneBox);
        if (frameStrokes.length > 0) {
          const fs = frameStrokes[0];
          const dur = strokeDurationMs(fs);
          const frameItem: CompiledGroupFrameItem = {
            kind: 'group-frame',
            id: fs.id,
            startMs: itemCursor,
            endMs: itemCursor + dur,
            color: fs.color,
            group: zoneBox,
            stroke: fs,
            startPoint: samplePointAlongStroke(fs, 0),
            endPoint: samplePointAlongStroke(fs, 1),
          };
          items.push(frameItem);
          allItems.push(frameItem);
          itemCursor = frameItem.endMs + 55;
        }

        const titleFont = `700 16px ${boardFontFamily}`;
        const titleItem = compileTextLineItem(
          `${zoneBox.id}-title`,
          zoneBox.title,
          zoneBox.x + 18,
          Math.max(80, zoneBox.width - 36),
          zoneBox.y + 20,
          'left',
          0,
          titleFont,
          16,
          zoneBox.color,
          scene.theme,
          itemCursor,
          82,
          { isGroupTitle: true }
        );
        items.push(titleItem);
        allItems.push(titleItem);
        itemCursor = titleItem.endMs + 95;
        stepRects.push({
          x: zoneBox.x,
          y: zoneBox.y,
          width: zoneBox.width,
          height: zoneBox.height,
        });
      }
    }

    const compilePositionedNode = (curr: PositionedSceneNode) => {
      if (curr.node.visible === false) return;

      if (curr.node.type === 'shape') {
        const strokes = generateShapeStrokes(curr);
        strokes.forEach((s, idx) => {
          pushStroke(s, idx === strokes.length - 1 ? 65 : 34);
        });
        return;
      }

      if (curr.node.type === 'connector') {
        const cStrokes = generateConnectorStrokes(curr, curr.node.color);
        cStrokes.forEach((cs, idx) => {
          pushStroke(cs, idx === cStrokes.length - 1 ? 65 : 32);
        });

        if (curr.node.label && curr.labelPoint) {
          const edgeFont = `400 14px ${boardFontFamily}`;
          const labelItem = compileTextLineItem(
            `edge-label-${curr.id}`,
            curr.node.label,
            curr.labelPoint.x - 100,
            200,
            curr.labelPoint.y - 2,
            'center',
            0,
            edgeFont,
            14,
            curr.node.color,
            scene.theme,
            itemCursor,
            82,
            { isEdgeLabel: true }
          );
          items.push(labelItem);
          allItems.push(labelItem);
          itemCursor = labelItem.endMs + 95;
        }
        return;
      }

      if (curr.node.type === 'text') {
        if (curr.measured.type !== 'text') return;
        const m = curr.measured;
        const weight = curr.node.fontWeight ?? 400;
        const lineFont = `${weight} ${m.fontSize}px ${boardFontFamily}`;
        const boxLeftX = curr.cx - curr.width / 2;
        const msPerChar = m.fontSize >= 20 ? 122 : 88;
        let yCursor = curr.cy - m.height / 2;

        m.lines.forEach((line, lineIdx) => {
          const lineCy = yCursor + m.lineHeight / 2;
          const lineIndent = lineIdx === 0 ? m.indentPx : 0;
          const tItem = compileTextLineItem(
            `${curr.id}-line-${lineIdx}`,
            line,
            boxLeftX,
            curr.width,
            lineCy,
            m.align,
            lineIndent,
            lineFont,
            m.fontSize,
            curr.node.color,
            scene.theme,
            itemCursor,
            msPerChar
          );
          items.push(tItem);
          allItems.push(tItem);
          itemCursor = tItem.endMs + 40;
          yCursor += m.lineHeight;
        });
        return;
      }

      if (curr.node.type === 'group') {
        for (const child of curr.children ?? []) {
          compilePositionedNode(child);
        }
      }
    };

    // 2. Compile every node listed in this step in exact step order
    for (const nodeId of step.nodeIds) {
      const pNode = layout.nodeMap.get(nodeId);
      if (!pNode || pNode.node.visible === false) continue;

      if (
        pNode.node.type === 'connector' &&
        pNode.routedPoints &&
        pNode.routedPoints.length > 0
      ) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const pt of pNode.routedPoints) {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
        stepRects.push({
          x: minX - 24,
          y: minY - 24,
          width: maxX - minX + 48,
          height: maxY - minY + 48,
        });
      } else {
        const nRect = nodeRect(pNode, 36);
        stepRects.push(nRect);
        cumulativeRects.push(nRect);
      }

      compilePositionedNode(pNode);
    }

    const drawEndMs =
      items.length > 0 ? items[items.length - 1].endMs : drawStartMs + 200;
    const pauseMs = step.pauseMs ?? 420;
    const endMs = drawEndMs + pauseMs;

    const focusBounds =
      stepRects.length > 0 ? mergeBounds(stepRects, 24) : layout.bounds;
    const cumulativeBounds =
      cumulativeRects.length > 0
        ? mergeBounds(cumulativeRects, 36)
        : layout.bounds;

    compiledSteps.push({
      stepIndex,
      step,
      startMs,
      drawStartMs,
      drawEndMs,
      endMs,
      items,
      focusBounds,
      cumulativeBounds,
    });

    cursorMs = endMs;
  });

  const outroStartMs = cursorMs;
  const totalDurationMs =
    compiledSteps.length > 0 ? outroStartMs + 1800 : 1200;

  return {
    steps: compiledSteps,
    allItems,
    outroStartMs,
    totalDurationMs,
    layout,
    fullBounds: layout.bounds,
  };
}
