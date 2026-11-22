import '../../plugins';
import {
  GroupSceneNode,
  SceneNode,
  ShapeSceneNode,
} from '../../model/scene';
import {
  MeasuredGroupNode,
  MeasuredSceneNode,
  MeasuredShapeNode,
  PositionedSceneNode,
} from '../../plugins/contracts';
import { shapeRegistry } from '../../plugins/registry';

export const BOARD_FONT_FAMILY =
  "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";

export type MeasureTextFn = (text: string, font: string) => number;

let cachedMeasureCtx: CanvasRenderingContext2D | null = null;

function getBrowserMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!cachedMeasureCtx) {
    const canvas = document.createElement('canvas');
    cachedMeasureCtx = canvas.getContext('2d');
  }
  return cachedMeasureCtx;
}

function parseFontSize(font: string): number {
  const m = font.match(/(\d+(?:\.\d+)?)px/);
  return m ? parseFloat(m[1]) : 18;
}

function isWideChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x3000 && code <= 0x303f)
  );
}

export function defaultMeasureText(text: string, font: string): number {
  const ctx = getBrowserMeasureCtx();
  if (ctx) {
    ctx.font = font;
    return ctx.measureText(text).width;
  }

  const fontSize = parseFontSize(font);
  const boldBoost =
    font.trim().startsWith('700') || font.includes('bold') ? 1.05 : 1.0;
  let total = 0;
  for (const ch of text) {
    if (ch === ' ') {
      total += fontSize * 0.34;
    } else if (isWideChar(ch)) {
      total += fontSize * 1.02 * boldBoost;
    } else {
      total += fontSize * 0.58 * boldBoost;
    }
  }
  return total;
}

function tokenizeForWrap(paragraph: string): string[] {
  const tokens: string[] = [];
  const regex = /[A-Za-z0-9._+-]+|\s+|./gu;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(paragraph)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

export function wrapText(
  text: string,
  maxWidth: number,
  measureFn: (s: string) => number,
  firstLineMaxWidth?: number
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [''];

  const paragraphs = trimmed.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const tokens = tokenizeForWrap(para.trim());
    let current = '';
    let paraEmittedLine = false;
    const getActiveMaxWidth = () =>
      !paraEmittedLine && firstLineMaxWidth !== undefined
        ? Math.max(40, firstLineMaxWidth)
        : maxWidth;

    const pushLine = (line: string) => {
      lines.push(line);
      paraEmittedLine = true;
    };

    for (const token of tokens) {
      const isSpace = /^\s+$/.test(token);
      if (isSpace && current === '') continue;

      const limit = getActiveMaxWidth();
      const candidate = current + token;
      if (measureFn(candidate) <= limit) {
        current = candidate;
        continue;
      }

      if (current.trim().length > 0) {
        pushLine(current.trimEnd());
        current = '';
        if (isSpace) continue;
      }

      const nextLimit = getActiveMaxWidth();
      if (measureFn(token) > nextLimit && token.length > 1) {
        let piece = '';
        for (const ch of token) {
          const pieceLimit = getActiveMaxWidth();
          if (piece && measureFn(piece + ch) > pieceLimit) {
            pushLine(piece);
            piece = ch;
          } else {
            piece += ch;
          }
        }
        current = piece;
      } else {
        current = token;
      }
    }

    if (current.trim().length > 0) {
      pushLine(current.trimEnd());
    }
  }

  return lines.length > 0 ? lines : [''];
}

export function measureSceneNode(
  node: SceneNode,
  measureFn: MeasureTextFn = defaultMeasureText,
  fallbackMaxTextWidth?: number,
  fontFamily: string = BOARD_FONT_FAMILY
): MeasuredSceneNode {
  if (node.type === 'text') {
    const fontSize = node.fontSize ?? 20;
    const fontWeight = node.fontWeight ?? 400;
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lineHeight = Math.round(fontSize * 1.33);
    const align = node.align ?? 'center';
    const indentPx = (node.indentChars ?? 0) * fontSize;
    const maxWidth = node.maxWidth ?? fallbackMaxTextWidth ?? 220;
    const firstLineMaxWidth =
      indentPx > 0 ? Math.max(40, maxWidth - indentPx) : undefined;

    const lines = wrapText(
      node.text,
      maxWidth,
      (s) => measureFn(s, font),
      firstLineMaxWidth
    );
    let maxMeasuredW = 0;
    lines.forEach((line, idx) => {
      const w = measureFn(line, font) + (idx === 0 ? indentPx : 0);
      if (w > maxMeasuredW) maxMeasuredW = w;
    });

    const width =
      align === 'center'
        ? Math.max(36, Math.ceil(maxMeasuredW))
        : Math.max(80, Math.ceil(Math.max(maxMeasuredW, node.maxWidth ?? 0)));
    const height = Math.max(lineHeight, lines.length * lineHeight);

    return {
      type: 'text',
      font,
      fontSize,
      lineHeight,
      align,
      indentPx,
      lines,
      width,
      height,
    };
  }

  if (node.type === 'shape') {
    const shapePlugin = shapeRegistry.getOrDefault(node.shape);
    const defaultBox = shapePlugin.measureBox(0, 0);
    return {
      type: 'shape',
      width: Math.max(40, node.width ?? defaultBox.width),
      height: Math.max(16, node.height ?? defaultBox.height),
      padX: defaultBox.padX,
      padY: defaultBox.padY,
    };
  }

  if (node.type === 'connector') {
    return { type: 'connector', width: 0, height: 0 };
  }

  // GroupSceneNode
  const arrange = node.arrange ?? 'card';
  const childMeasurements = new Map<string, MeasuredSceneNode>();

  if (arrange === 'card') {
    const autoShape = node.children.find(
      (c): c is ShapeSceneNode =>
        c.type === 'shape' && c.fitMode !== 'fixed'
    );
    const shapePlugin = autoShape
      ? shapeRegistry.getOrDefault(autoShape.shape)
      : undefined;
    const groupFallbackMaxW = shapePlugin?.maxTextWidth?.();

    const contentChildren = node.children.filter((c) => c !== autoShape);
    const gap = node.gap ?? 6;
    let contentW = 0;
    let contentH = 0;
    let measuredContentCount = 0;

    for (const child of contentChildren) {
      if (child.visible === false || child.type === 'connector') continue;
      const cm = measureSceneNode(
        child,
        measureFn,
        groupFallbackMaxW,
        fontFamily
      );
      childMeasurements.set(child.id, cm);
      contentW = Math.max(contentW, cm.width);
      contentH += cm.height;
      measuredContentCount++;
    }
    if (measuredContentCount > 1) {
      contentH += (measuredContentCount - 1) * gap;
    }

    if (autoShape && shapePlugin) {
      const box = shapePlugin.measureBox(contentW, contentH);
      const shapedM: MeasuredShapeNode = {
        type: 'shape',
        width: box.width,
        height: box.height,
        padX: box.padX,
        padY: box.padY,
        textOffsetY: box.textOffsetY,
      };
      childMeasurements.set(autoShape.id, shapedM);

      return {
        type: 'group',
        width: box.width,
        height: box.height,
        primaryShape: autoShape.shape,
        textOffsetY: box.textOffsetY,
        childMeasurements,
      };
    }

    const padX = 22;
    const padY = 14;
    return {
      type: 'group',
      width: Math.max(96, Math.ceil(contentW + padX * 2)),
      height: Math.max(46, Math.ceil(contentH + padY * 2)),
      childMeasurements,
    };
  }

  if (arrange === 'stack') {
    const gap = node.gap ?? 16;
    let maxW = 0;
    let totalH = 0;
    let count = 0;
    for (const child of node.children) {
      if (child.visible === false || child.type === 'connector') continue;
      const cm = measureSceneNode(child, measureFn, undefined, fontFamily);
      childMeasurements.set(child.id, cm);
      maxW = Math.max(maxW, cm.width);
      totalH += cm.height;
      count++;
    }
    if (count > 1) totalH += (count - 1) * gap;
    return {
      type: 'group',
      width: Math.max(60, maxW + 16),
      height: Math.max(40, totalH + 16),
      childMeasurements,
    };
  }

  // arrange === 'free'
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const child of node.children) {
    if (child.visible === false || child.type === 'connector') continue;
    const cm = measureSceneNode(child, measureFn, undefined, fontFamily);
    childMeasurements.set(child.id, cm);
    const ox = child.offset?.x ?? 0;
    const oy = child.offset?.y ?? 0;
    minX = Math.min(minX, ox - cm.width / 2);
    minY = Math.min(minY, oy - cm.height / 2);
    maxX = Math.max(maxX, ox + cm.width / 2);
    maxY = Math.max(maxY, oy + cm.height / 2);
  }
  if (!Number.isFinite(minX)) {
    return { type: 'group', width: 120, height: 60, childMeasurements };
  }
  return {
    type: 'group',
    width: Math.max(60, Math.ceil(maxX - minX)),
    height: Math.max(40, Math.ceil(maxY - minY)),
    childMeasurements,
  };
}

export function positionGroupChildren(
  group: GroupSceneNode,
  cx: number,
  cy: number,
  measured: MeasuredGroupNode
): PositionedSceneNode[] {
  const arrange = group.arrange ?? 'card';
  const result: PositionedSceneNode[] = [];

  if (arrange === 'card' || arrange === 'stack') {
    const autoShape =
      arrange === 'card'
        ? group.children.find(
            (c): c is ShapeSceneNode =>
              c.type === 'shape' && c.fitMode !== 'fixed'
          )
        : undefined;

    const stackChildren = group.children.filter(
      (c) =>
        c !== autoShape && c.visible !== false && c.type !== 'connector'
    );
    const gap = group.gap ?? (arrange === 'card' ? 6 : 16);

    let totalStackH = 0;
    stackChildren.forEach((c, idx) => {
      const cm = measured.childMeasurements.get(c.id);
      if (!cm) return;
      totalStackH += cm.height + (idx > 0 ? gap : 0);
    });

    const stackCenterOffsetY =
      arrange === 'card' ? measured.textOffsetY ?? 0 : 0;
    let yCursor = cy - totalStackH / 2 + stackCenterOffsetY;

    const childPosMap = new Map<string, PositionedSceneNode>();

    if (autoShape) {
      const sm = measured.childMeasurements.get(autoShape.id);
      if (sm) {
        childPosMap.set(autoShape.id, {
          id: autoShape.id,
          node: autoShape,
          cx: cx + (autoShape.offset?.x ?? 0),
          cy: cy + (autoShape.offset?.y ?? 0),
          width: sm.width,
          height: sm.height,
          measured: sm,
        });
      }
    }

    for (const c of stackChildren) {
      const cm = measured.childMeasurements.get(c.id);
      if (!cm) continue;
      const childCx = cx + (c.offset?.x ?? 0);
      const childCy = yCursor + cm.height / 2 + (c.offset?.y ?? 0);
      yCursor += cm.height + gap;

      const pChild: PositionedSceneNode = {
        id: c.id,
        node: c,
        cx: childCx,
        cy: childCy,
        width: cm.width,
        height: cm.height,
        measured: cm,
        children:
          c.type === 'group' && cm.type === 'group'
            ? positionGroupChildren(c, childCx, childCy, cm)
            : undefined,
      };
      childPosMap.set(c.id, pChild);
    }

    // Preserve exact group.children ordering so child array order drives draw order
    for (const c of group.children) {
      const positioned = childPosMap.get(c.id);
      if (positioned) result.push(positioned);
    }
    return result;
  }

  // arrange === 'free'
  for (const c of group.children) {
    if (c.visible === false || c.type === 'connector') continue;
    const cm = measured.childMeasurements.get(c.id);
    if (!cm) continue;
    const childCx = cx + (c.offset?.x ?? 0);
    const childCy = cy + (c.offset?.y ?? 0);
    result.push({
      id: c.id,
      node: c,
      cx: childCx,
      cy: childCy,
      width: cm.width,
      height: cm.height,
      measured: cm,
      children:
        c.type === 'group' && cm.type === 'group'
          ? positionGroupChildren(c, childCx, childCy, cm)
          : undefined,
    });
  }
  return result;
}
