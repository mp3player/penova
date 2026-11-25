import { isCustomSceneNode } from '../../model/scene';
import { defineProps, prop } from '../../sdk/propSchema';
import { hashString, mulberry32 } from '../../sdk/random';
import { buildStrokePath, sketchSegment } from '../../sdk/strokePath';
import { Point } from '../../model/scene';
import { SceneNodePlugin } from '../contracts';

const ANNOTATE_STYLES = [
  'circle',
  'cross',
  'highlight',
  'underline',
  'check',
] as const;

const annotateProps = defineProps({
  style: prop.enum(ANNOTATE_STYLES, {
    default: 'circle',
    aliases: ['kind', 'mode'],
    description: 'Hand-drawn emphasis style (circle, cross, highlight, underline, check)',
  }),
  target: prop.string({
    default: '',
    format: 'node-ref',
    aliases: ['for', 'on', 'ref'],
    description: 'Target node ID (#id) or label to annotate',
  }),
  label: prop.string({
    default: '',
    aliases: ['note', 'callout', 'text'],
    description: 'Optional callout text rendered near the annotation',
  }),
  pad: prop.number({
    default: 12,
    min: 0,
    max: 48,
    step: 2,
    description: 'Extra padding around the target bounds',
  }),
});

function buildHandCirclePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rand: () => number
): Point[] {
  const pts: Point[] = [];
  const totalSteps = 34;
  const startAngle = -0.35 + (rand() - 0.5) * 0.2;
  const totalAngle = Math.PI * 2.22; // Slight natural teacher overlap
  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const angle = startAngle + t * totalAngle;
    const wobbleR = 1 + (rand() - 0.5) * 0.045 + Math.sin(angle * 3) * 0.015;
    pts.push({
      x: cx + Math.cos(angle) * rx * wobbleR,
      y: cy + Math.sin(angle) * ry * wobbleR,
    });
  }
  return pts;
}

export const annotateNodePlugin: SceneNodePlugin = {
  id: 'annotate',
  name: 'Annotation Overlay',
  defaultName: 'Mark',
  defaultColor: 'pink',
  defaultProps: annotateProps.defaults,
  isOverlay: true,
  snippet:
    '[node:annotate] Mark {style: circle, target: TargetNode, label: "Key!", color: pink}',
  propFields: annotateProps.fields,
  measure(node, ctx) {
    const label = (annotateProps.readField(node.props, 'label') ?? '').trim();
    const pad = annotateProps.readField(node.props, 'pad') ?? 12;
    const labelW = label
      ? Math.ceil(ctx.measureText(label, `700 14px ${ctx.fontFamily}`)) + 24
      : 0;
    const target = (annotateProps.readField(node.props, 'target') ?? '').trim();
    return {
      width: Math.max(120, labelW),
      height: 56,
      payload: {
        target,
        label,
        pad,
        style: annotateProps.resolve(node.props).style,
      },
    };
  },
  compile(positioned, helpers) {
    if (!isCustomSceneNode(positioned.node)) return;
    const node = positioned.node;
    const props = annotateProps.resolve(node.props);
    const pad = Math.max(0, props.pad ?? 12);
    const label = (props.label ?? '').trim();
    const cx = positioned.cx;
    const cy = positioned.cy;
    const w = Math.max(48, positioned.width);
    const h = Math.max(36, positioned.height);
    const rand = mulberry32(hashString(`annotate:${positioned.id}`));

    if (props.style === 'cross') {
      const x1 = cx - w / 2 - pad * 0.4;
      const x2 = cx + w / 2 + pad * 0.4;
      const y1 = cy - h / 2 - pad * 0.4;
      const y2 = cy + h / 2 + pad * 0.4;
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-cross-1`,
          sketchSegment({ x: x1, y: y1 }, { x: x2, y: y2 }, rand, 1.4, 18),
          { width: 3.4, color: node.color, opacity: 0.94, speedFactor: 1.45 }
        ),
        28
      );
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-cross-2`,
          sketchSegment({ x: x2, y: y1 }, { x: x1, y: y2 }, rand, 1.4, 18),
          { width: 3.4, color: node.color, opacity: 0.94, speedFactor: 1.5 }
        ),
        40
      );
    } else if (props.style === 'highlight') {
      const markerWidth = Math.max(18, Math.min(34, h * 0.42));
      const x1 = cx - w / 2 - pad * 0.5;
      const x2 = cx + w / 2 + pad * 0.5;
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-highlight`,
          sketchSegment({ x: x1, y: cy + 1 }, { x: x2, y: cy - 1 }, rand, 0.9, 22),
          {
            width: markerWidth,
            color: node.color,
            opacity: 0.25,
            speedFactor: 1.55,
          }
        ),
        40
      );
    } else if (props.style === 'underline') {
      const yLine = cy + h / 2 + Math.max(5, pad * 0.55);
      const x1 = cx - w / 2 - pad * 0.35;
      const x2 = cx + w / 2 + pad * 0.35;
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-ul-1`,
          sketchSegment({ x: x1, y: yLine }, { x: x2, y: yLine - 1.5 }, rand, 1.3, 22),
          { width: 3.0, color: node.color, opacity: 0.95, speedFactor: 1.45 }
        ),
        24
      );
      helpers.pushStroke(
        buildStrokePath(
          `${positioned.id}-ul-2`,
          sketchSegment(
            { x: x1 + 6, y: yLine + 5 },
            { x: x2 - 4, y: yLine + 3.5 },
            rand,
            1.1,
            20
          ),
          { width: 2.2, color: node.color, opacity: 0.8, speedFactor: 1.65 }
        ),
        40
      );
    } else if (props.style === 'check') {
      const size = Math.max(28, Math.min(54, Math.min(w, h) * 0.65));
      const baseX = cx + w / 2 - size * 0.15;
      const baseY = cy - h / 2 + size * 0.15;
      const p1 = { x: baseX - size * 0.42, y: baseY + size * 0.08 };
      const p2 = { x: baseX - size * 0.1, y: baseY + size * 0.42 };
      const p3 = { x: baseX + size * 0.5, y: baseY - size * 0.34 };
      const pts = [
        ...sketchSegment(p1, p2, rand, 1.0, 10),
        ...sketchSegment(p2, p3, rand, 1.1, 14).slice(1),
      ];
      helpers.pushStroke(
        buildStrokePath(`${positioned.id}-check`, pts, {
          width: 3.6,
          color: node.color,
          opacity: 0.96,
          speedFactor: 1.45,
        }),
        40
      );
    } else {
      // Default: expressive loose teacher circle/oval around the target node
      const rx = w / 2 + pad;
      const ry = h / 2 + pad * 0.85;
      const pts = buildHandCirclePoints(cx, cy, rx, ry, rand);
      helpers.pushStroke(
        buildStrokePath(`${positioned.id}-circle`, pts, {
          width: 3.1,
          color: node.color,
          opacity: 0.95,
          speedFactor: 1.35,
        }),
        42
      );
    }

    if (label) {
      const boxW = Math.max(140, w + pad * 2 + 40);
      const labelY =
        props.style === 'underline'
          ? cy + h / 2 + Math.max(24, pad * 0.6 + 20)
          : cy - h / 2 - pad - 15;
      helpers.pushTextLine({
        id: `${positioned.id}-label`,
        text: label,
        boxLeftX: cx - boxW / 2,
        boxWidth: boxW,
        centerY: labelY,
        align: 'center',
        fontSize: 14.5,
        fontWeight: 700,
        color: node.color,
        msPerChar: 75,
        gapAfterMs: 36,
      });
    }
  },
};
