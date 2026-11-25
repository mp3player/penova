import { ChalkColor, CustomSceneNode, isCustomSceneNode } from '../../model/scene';
import { defineProps, prop } from '../../sdk/propSchema';
import { hashString, mulberry32 } from '../../sdk/random';
import {
  buildRoundedRectPoints,
  buildStrokePath,
  sketchSegment,
} from '../../sdk/strokePath';
import { SceneNodePlugin } from '../contracts';
import { clipRayToRect } from '../shapes/clipHelpers';

const CODE_MONO_FONT = '"JetBrains Mono", "SF Mono", "Consolas", monospace';
const VALID_CHALK_COLORS: readonly ChalkColor[] = [
  'white',
  'yellow',
  'cyan',
  'pink',
  'green',
  'orange',
];

function resolveHighlightColor(raw: string | undefined): ChalkColor {
  const val = (raw ?? '').trim().toLowerCase();
  return (VALID_CHALK_COLORS as readonly string[]).includes(val)
    ? (val as ChalkColor)
    : 'yellow';
}

export function parseHighlightLineSet(
  raw: string | undefined,
  totalLines: number
): Set<number> {
  const out = new Set<number>();
  const text = (raw ?? '').trim();
  if (!text || totalLines <= 0) return out;

  for (const token of text.split(/[\s,;]+/)) {
    if (!token) continue;
    const rangeMatch = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(token);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      const lo = Math.max(1, Math.min(a, b));
      const hi = Math.min(totalLines, Math.max(a, b));
      for (let lineNo = lo; lineNo <= hi; lineNo++) {
        out.add(lineNo - 1);
      }
      continue;
    }
    const single = Number(token);
    if (Number.isInteger(single) && single >= 1 && single <= totalLines) {
      out.add(single - 1);
    }
  }
  return out;
}

const codeProps = defineProps({
  title: prop.string({
    default: 'demo.penova.md',
    description: 'Header filename',
  }),
  lines: prop.string({
    default: 'const penova = true;\nrender(penova);',
    format: 'code',
    aliases: ['code'],
    description: 'Code content (supports \\n)',
  }),
  width: prop.number({
    min: 180,
    step: 10,
    aliases: ['w'],
    description: 'Explicit window width',
  }),
  highlight: prop.string({
    default: '',
    aliases: ['highlightLine', 'hl'],
    description: '1-based lines or ranges to highlight (e.g. "2" or "2,4-5")',
  }),
  highlightColor: prop.string({
    default: 'yellow',
    format: 'color',
    aliases: ['hlColor'],
    description: 'Marker highlight color',
  }),
});

function parseCodeLines(node: CustomSceneNode): string[] {
  const raw = codeProps.readField(node.props, 'lines') ?? '';
  if (!raw.trim()) {
    return [node.name || 'script.penova.md'];
  }
  const normalized = raw.replace(/\\n/g, '\n');
  const lines = normalized.includes('\n')
    ? normalized.split(/\r?\n/)
    : normalized.split(/\s*;\s*/);
  const cleaned = lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
  return cleaned.length > 0 ? cleaned : [node.name || 'script.penova.md'];
}

function buildTinyCirclePts(
  cx: number,
  cy: number,
  r: number,
  steps = 12
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

export const codeNodePlugin: SceneNodePlugin = {
  id: 'code',
  name: 'Code Window',
  defaultName: 'CodeBox',
  defaultColor: 'cyan',
  defaultProps: codeProps.defaults,
  snippet:
    '[node:code] Snippet {color: cyan, title: "demo.ts", lines: "const x = 1;\\nrender(x);"}',
  propFields: codeProps.fields,
  measure(node, ctx) {
    const lines = parseCodeLines(node);
    const title =
      (codeProps.readField(node.props, 'title') ?? '').trim() ||
      node.name ||
      'script.penova.md';
    const font = `400 13.5px ${CODE_MONO_FONT}`;
    let widest = ctx.measureText(title, `700 12.5px ${ctx.fontFamily}`) + 74;
    for (const line of lines) {
      widest = Math.max(widest, ctx.measureText(line, font) + 38);
    }
    const explicitW = codeProps.readField(node.props, 'width');
    const width =
      explicitW !== undefined
        ? explicitW
        : Math.max(240, Math.min(640, Math.ceil(widest)));
    const height = Math.max(96, 48 + lines.length * 22 + 14);
    return { width, height, payload: { title, lines } };
  },
  clipRay(positioned, toward, extraMargin) {
    return clipRayToRect(
      positioned.cx,
      positioned.cy,
      positioned.width,
      positioned.height,
      toward,
      extraMargin
    );
  },
  compile(positioned, helpers) {
    if (!isCustomSceneNode(positioned.node)) {
      return;
    }
    const node = positioned.node;
    const lines = parseCodeLines(node);
    const title =
      (codeProps.readField(node.props, 'title') ?? '').trim() ||
      node.name ||
      'script.penova.md';

    const x = positioned.cx - positioned.width / 2;
    const y = positioned.cy - positioned.height / 2;
    const rand = mulberry32(hashString(`code:${positioned.id}`));

    // 1. Hand-drawn outer window card
    const boxPts = buildRoundedRectPoints(
      x,
      y,
      positioned.width,
      positioned.height,
      12,
      rand,
      3
    );
    helpers.pushStroke(
      buildStrokePath(`${positioned.id}-window`, boxPts, {
        width: 2.5,
        color: node.color,
        opacity: 0.94,
        fillOpacity: 1,
        surfaceShadow: true,
        speedFactor: 1.25,
      }),
      35
    );

    // 2. Window titlebar separator
    const barY = y + 32;
    helpers.pushStroke(
      buildStrokePath(
        `${positioned.id}-bar`,
        sketchSegment(
          { x: x + 6, y: barY },
          { x: x + positioned.width - 6, y: barY },
          rand,
          0.9,
          18
        ),
        {
          width: 1.6,
          color: node.color,
          opacity: 0.52,
          speedFactor: 1.5,
        }
      ),
      20
    );

    // 3. Three window dots
    const dotColors = ['pink', 'yellow', 'green'] as const;
    dotColors.forEach((dc, idx) => {
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-dot-${idx}`,
          buildTinyCirclePts(x + 20 + idx * 14, y + 16, 3.6),
          {
            width: 1.9,
            color: dc,
            opacity: 0.9,
            speedFactor: 1.8,
          }
        ),
        10
      );
    });

    // 4. Title filename
    helpers.pushTextLine({
      id: `${positioned.id}-title`,
      text: title,
      boxLeftX: x + 64,
      boxWidth: Math.max(80, positioned.width - 78),
      centerY: y + 16,
      align: 'left',
      fontSize: 12.5,
      fontWeight: 700,
      color: node.color,
      msPerChar: 45,
      gapAfterMs: 28,
    });

    const highlightedSet = parseHighlightLineSet(
      codeProps.readField(node.props, 'highlight'),
      lines.length
    );
    const hlColor = resolveHighlightColor(
      codeProps.readField(node.props, 'highlightColor')
    );

    // 5. Progressive code lines (with optional hand-drawn highlighter sweep)
    lines.forEach((line, idx) => {
      const cy = y + 48 + idx * 22;
      helpers.pushTextLine({
        id: `${positioned.id}-code-${idx}`,
        text: line,
        boxLeftX: x + 18,
        boxWidth: Math.max(120, positioned.width - 36),
        centerY: cy,
        align: 'left',
        fontSize: 13.5,
        fontWeight: 400,
        fontFamily: CODE_MONO_FONT,
        color: 'white',
        msPerChar: 28,
      });

      if (highlightedSet.has(idx)) {
        const usableW = Math.max(120, positioned.width - 36);
        const approxLineW = Math.min(usableW, Math.max(64, line.length * 8.3 + 12));
        const hlStartX = x + 16;
        const hlEndX = Math.min(x + positioned.width - 14, hlStartX + approxLineW);
        const hlOpacity =
          helpers.theme === 'whiteboard' || helpers.theme === 'letter-paper'
            ? 0.34
            : 0.28;
        helpers.pushStroke(
          buildStrokePath(
            `${positioned.id}-hl-${idx}`,
            sketchSegment(
              { x: hlStartX, y: cy + 0.5 },
              { x: hlEndX, y: cy - 0.5 },
              rand,
              0.85,
              20
            ),
            {
              width: 17,
              color: hlColor,
              opacity: hlOpacity,
              speedFactor: 1.55,
              easing: 'crisp',
            }
          ),
          28
        );
      }
    });
  },
};
