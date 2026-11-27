import '../../plugins';
import {
  ChalkColor,
  deriveTeachingSteps,
  isCustomSceneNode,
  LessonScene,
  Rect,
  resolveCustomNodeKind,
  TextAlign,
  ThemeId,
} from '../../model/scene';
import {
  layoutRegistry,
  presentationRegistry,
  sceneNodeRegistry,
} from '../../plugins/registry';
import { isOverlaySceneNode } from '../../plugins/layouts/shared';
import { buildStrokeCornerTimeTable } from '../../sdk/strokePath';
import { isMonospaceFont } from '../layout/textMeasure';
import { ComputedLayout, PositionedSceneNode } from '../layout/diagramLayout';
import { resolveScenePacing } from './pacing';
import { resolveColorHex } from '../render/themes';
import { resolveSceneFontFamily } from '../render/fonts';
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
  flags?: {
    isEdgeLabel?: boolean;
    isGroupTitle?: boolean;
    lastCharSlowdown?: number;
  }
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
  let lastNonSpaceIdx = -1;
  chars.forEach((c, idx) => {
    if (c.trim().length > 0) lastNonSpaceIdx = idx;
  });
  const lastCharMult = flags?.lastCharSlowdown ?? 1;
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
    const endFactor = idx === lastNonSpaceIdx && lastNonSpaceIdx > 0 ? lastCharMult : 1;
    const charDur = Math.max(
      58,
      Math.round(rawCharMs * strokeFactor * endFactor)
    );
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
  const boardFontFamily = resolveSceneFontFamily(scene, presentation.fontFamily);
  const pacing = resolveScenePacing(scene.pacing);
  const overlayNodeIds = new Set(
    scene.nodes.filter(isOverlaySceneNode).map((n) => n.id)
  );
  const rawSteps =
    scene.customSteps && scene.customSteps.length > 0
      ? scene.customSteps
      : layoutPlugin.deriveSteps &&
        layoutPlugin.deriveSteps !== deriveTeachingSteps
      ? layoutPlugin.deriveSteps(scene)
      : deriveTeachingSteps(scene, overlayNodeIds);

  const zoneByTitle = new Map(layout.zones.map((g) => [g.title, g]));
  const drawnZones = new Set<string>();

  const compiledSteps: CompiledStep[] = [];
  const allItems: CompiledItem[] = [];
  const cumulativeRects: Rect[] = [];
  let cursorMs = 0;

  rawSteps.forEach((step, stepIndex) => {
    const startMs = cursorMs;
    const leadInMs =
      stepIndex === 0 ? Math.min(340, pacing.leadInMs) : pacing.leadInMs;
    const drawStartMs = startMs + leadInMs;
    let itemCursor = drawStartMs;
    const items: CompiledItem[] = [];
    const stepRects: Rect[] = [];
    let currentNodeId: string | undefined;
    let activeNodeSyncItems: CompiledStrokeItem[] | null = null;

    const pushStroke = (
      stroke: StrokePath,
      gapAfterMs = pacing.innerGapMs,
      animate?: (elapsedMs: number) => StrokePath,
      animateOptions?: { sync?: 'item' | 'node' }
    ) => {
      const dur = strokeDurationMs(stroke);
      const cumTime = buildStrokeCornerTimeTable(stroke, pacing.cornerSlowdown);
      const item: CompiledStrokeItem = {
        kind: 'stroke',
        id: stroke.id,
        startMs: itemCursor,
        endMs: itemCursor + dur,
        color: stroke.color,
        stroke,
        ...(animate ? { animate } : {}),
        ...(cumTime ? { cumTime } : {}),
        startPoint: samplePointAlongStroke(stroke, 0),
        endPoint: samplePointAlongStroke(stroke, 1),
        stepIndex,
        nodeId: currentNodeId,
      };
      if (animate && animateOptions?.sync === 'node' && activeNodeSyncItems) {
        activeNodeSyncItems.push(item);
      }
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
          const cumTime = buildStrokeCornerTimeTable(fs, pacing.cornerSlowdown);
          const frameItem: CompiledGroupFrameItem = {
            kind: 'group-frame',
            id: fs.id,
            startMs: itemCursor,
            endMs: itemCursor + dur,
            color: fs.color,
            group: zoneBox,
            stroke: fs,
            ...(cumTime ? { cumTime } : {}),
            startPoint: samplePointAlongStroke(fs, 0),
            endPoint: samplePointAlongStroke(fs, 1),
            stepIndex,
            nodeId: zoneBox.id,
          };
          items.push(frameItem);
          allItems.push(frameItem);
          itemCursor = frameItem.endMs + pacing.innerGapMs;
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
          { isGroupTitle: true, lastCharSlowdown: pacing.lastCharSlowdown }
        );
        titleItem.stepIndex = stepIndex;
        titleItem.nodeId = zoneBox.id;
        items.push(titleItem);
        allItems.push(titleItem);
        itemCursor = titleItem.endMs + pacing.partGapMs;
        stepRects.push({
          x: zoneBox.x,
          y: zoneBox.y,
          width: zoneBox.width,
          height: zoneBox.height,
        });
      }
    }

    const compilePositionedNode = (curr: PositionedSceneNode, insideCard = false) => {
      if (curr.node.visible === false) return;
      const prevNodeId = currentNodeId;
      currentNodeId = curr.id;
      try {
        if (curr.node.type === 'shape') {
          const strokes = generateShapeStrokes(curr);
          strokes.forEach((s, idx) => {
            pushStroke(
              s,
              idx === strokes.length - 1
                ? pacing.innerGapMs
                : pacing.sameNodeStrokeMs
            );
          });
          return;
        }

        if (curr.node.type === 'connector') {
          const cStrokes = generateConnectorStrokes(curr, curr.node.color);
          const hasLabel = Boolean(curr.node.label && curr.labelPoint);
          cStrokes.forEach((cs, idx) => {
            const endGap = hasLabel
              ? Math.round(pacing.innerGapMs * 0.65)
              : pacing.partGapMs;
            pushStroke(
              cs,
              idx === cStrokes.length - 1 ? endGap : pacing.sameNodeStrokeMs
            );
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
              { isEdgeLabel: true, lastCharSlowdown: pacing.lastCharSlowdown }
            );
            labelItem.stepIndex = stepIndex;
            labelItem.nodeId = curr.id;
            items.push(labelItem);
            allItems.push(labelItem);
            itemCursor = labelItem.endMs + pacing.partGapMs;
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
          const textColor: ChalkColor =
            insideCard && presentation.palette.preferNeutralCardTitle
              ? 'white'
              : curr.node.color;
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
              textColor,
              scene.theme,
              itemCursor,
              msPerChar,
              { lastCharSlowdown: pacing.lastCharSlowdown }
            );
            tItem.stepIndex = stepIndex;
            tItem.nodeId = curr.id;
            items.push(tItem);
            allItems.push(tItem);
            itemCursor =
              tItem.endMs +
              (lineIdx === m.lines.length - 1
                ? pacing.innerGapMs
                : Math.round(pacing.innerGapMs * 0.55));
            yCursor += m.lineHeight;
          });
          return;
        }

        if (curr.node.type === 'group') {
          const nextInsideCard = insideCard || curr.node.meta?.isCard === true;
          for (const child of curr.children ?? []) {
            compilePositionedNode(child, nextInsideCard);
          }
          return;
        }

        if (isCustomSceneNode(curr.node)) {
          const kind =
            curr.measured.type === 'custom'
              ? curr.measured.kind
              : resolveCustomNodeKind(curr.node);
          const plugin = sceneNodeRegistry.get(kind);
          if (plugin?.compile) {
            let customTextSeq = 0;
            const nodeColor = curr.node.color;
            const prevSyncItems = activeNodeSyncItems;
            const nodeSyncItems: CompiledStrokeItem[] = [];
            const startItemLen = items.length;
            activeNodeSyncItems = nodeSyncItems;
            try {
              plugin.compile(curr, {
                theme: scene.theme,
                fontFamily: boardFontFamily,
                pushStroke,
                pushTextLine: (input) => {
                  const fontSize = input.fontSize ?? 18;
                  const weight = input.fontWeight ?? 400;
                  const lineFontFamily = input.fontFamily ?? boardFontFamily;
                  const lineFont = `${weight} ${fontSize}px ${lineFontFamily}`;
                  const tItem = compileTextLineItem(
                    input.id ?? `${curr.id}-text-${customTextSeq++}`,
                    input.text,
                    input.boxLeftX,
                    input.boxWidth,
                    input.centerY,
                    input.align ?? 'center',
                    input.indentPx ?? 0,
                    lineFont,
                    fontSize,
                    input.color ?? nodeColor,
                    scene.theme,
                    itemCursor,
                    input.msPerChar ?? (fontSize >= 20 ? 122 : 88),
                    { lastCharSlowdown: pacing.lastCharSlowdown }
                  );
                  tItem.stepIndex = stepIndex;
                  tItem.nodeId = curr.id;
                  items.push(tItem);
                  allItems.push(tItem);
                  const defaultLineGap = isMonospaceFont(lineFontFamily)
                    ? pacing.codeLineGapMs
                    : pacing.innerGapMs;
                  itemCursor = tItem.endMs + (input.gapAfterMs ?? defaultLineGap);
                },
              });
            } finally {
              activeNodeSyncItems = prevSyncItems;
              if (nodeSyncItems.length > 0) {
                let nodeEndMs = 0;
                for (let k = startItemLen; k < items.length; k++) {
                  if (items[k].endMs > nodeEndMs) {
                    nodeEndMs = items[k].endMs;
                  }
                }
                for (const syncItem of nodeSyncItems) {
                  syncItem.animateStartMs = nodeEndMs;
                }
              }
            }
            return;
          }
          for (const child of curr.children ?? []) {
            compilePositionedNode(child);
          }
        }
      } finally {
        currentNodeId = prevNodeId;
      }
    };

    const focusNodeSet = new Set<string>(step.nodeIds);
    const collectSubtreeIds = (p: PositionedSceneNode) => {
      focusNodeSet.add(p.id);
      const resolvedTargetId =
        p.measured.type === 'custom' && p.measured.payload
          ? (p.measured.payload as Record<string, unknown>).resolvedTargetId
          : undefined;
      if (typeof resolvedTargetId === 'string') {
        focusNodeSet.add(resolvedTargetId);
        const targetNode = layout.nodeMap.get(resolvedTargetId);
        if (targetNode) {
          for (const child of targetNode.children ?? []) {
            collectSubtreeIds(child);
          }
        }
      }
      for (const child of p.children ?? []) {
        collectSubtreeIds(child);
      }
    };

    // 2. Compile every node listed in this step in exact step order
    for (const nodeId of step.nodeIds) {
      const pNode = layout.nodeMap.get(nodeId);
      if (!pNode || pNode.node.visible === false) continue;
      collectSubtreeIds(pNode);

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

    // Keep any enclosing zone frame bright while nodes in that zone are focused
    for (const fId of Array.from(focusNodeSet)) {
      const pNode = layout.nodeMap.get(fId);
      if (!pNode || pNode.node.type === 'connector') continue;
      const rawZone = pNode.node.meta?.zone;
      const zoneTitle =
        typeof rawZone === 'string' && rawZone.trim() ? rawZone.trim() : '核心概念';
      const zoneBox = zoneByTitle.get(zoneTitle);
      if (zoneBox) {
        focusNodeSet.add(zoneBox.id);
      }
    }

    const drawEndMs =
      items.length > 0 ? items[items.length - 1].endMs : drawStartMs + 200;
    const pauseMs = step.pauseMs ?? pacing.stepPauseMs;
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
      focusNodeIds: Array.from(focusNodeSet),
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
    spotlight: scene.spotlight === true,
    pacing,
  };
}
