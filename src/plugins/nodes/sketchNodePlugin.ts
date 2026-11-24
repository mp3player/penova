import { isCustomSceneNode } from '../../model/scene';
import { defineProps, prop } from '../../sdk/propSchema';
import { getSketchIconSvg, sketchPipeline } from '../../sdk/sketchPipeline';
import { SceneNodePlugin } from '../contracts';
import { clipRayToRect } from '../shapes/clipHelpers';

function wrapBareSvgSnippet(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('<')) return trimmed;
  return `<svg viewBox="0 0 120 120"><path d="${trimmed}"/></svg>`;
}

const iconProps = defineProps({
  icon: prop.string({ default: 'spark', format: 'icon-id', description: 'Built-in icon name' }),
  size: prop.number({ default: 36, min: 12, max: 120, step: 2, description: 'Square icon size in px' }),
  svg: prop.string({ format: 'svg', description: 'Custom inline SVG or path d attribute' }),
});

const sketchProps = defineProps({
  icon: prop.string({ default: 'rocket', format: 'icon-id', description: 'Built-in icon name' }),
  caption: prop.string({
    default: 'Hand-Drawn',
    aliases: ['title', 'text'],
    description: 'Caption rendered below sketch',
  }),
  width: prop.number({ min: 40, step: 8, aliases: ['w'] }),
  height: prop.number({ min: 40, step: 8, aliases: ['h'] }),
  svg: prop.string({ format: 'svg', description: 'Custom inline SVG or path d attribute' }),
});

export const iconNodePlugin: SceneNodePlugin = {
  id: 'icon',
  name: 'Sketch Icon',
  defaultName: 'Icon',
  defaultColor: 'yellow',
  defaultProps: iconProps.defaults,
  snippet: '[node:icon] Badge {color: yellow, icon: spark, size: 36}',
  propFields: iconProps.fields,
  measure(node) {
    const rawSize = Number(node.props?.size);
    const size = Number.isFinite(rawSize) && rawSize > 8 ? Math.min(120, rawSize) : 30;
    return {
      width: size,
      height: size,
    };
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
    const props = isCustomSceneNode(positioned.node)
      ? positioned.node.props
      : undefined;
    const iconName =
      (iconProps.readField(props, 'icon') ?? '').trim() || positioned.node.name;
    const svgOverride = (iconProps.readField(props, 'svg') ?? '').trim();
    const rawSvg = svgOverride
      ? wrapBareSvgSnippet(svgOverride)
      : getSketchIconSvg(iconName) ?? getSketchIconSvg('spark')!;

    const targetW = Math.max(16, positioned.width - 4);
    const targetH = Math.max(16, positioned.height - 4);
    const strokeW = Math.max(1.75, Math.min(2.5, positioned.width * 0.068));

    const strokes = sketchPipeline.run({
      asset: { kind: 'svg', svgText: rawSvg },
      options: {
        seed: positioned.id,
        centerX: positioned.cx,
        centerY: positioned.cy,
        targetWidth: targetW,
        targetHeight: targetH,
        defaultColor: positioned.node.color,
        strokeWidth: strokeW,
        wobbleAmp: 0.45,
        fillClosedShapes: false,
      },
    });

    strokes.forEach((s, idx) => {
      helpers.pushStroke(s, idx === strokes.length - 1 ? 38 : 16);
    });
  },
};

export const sketchNodePlugin: SceneNodePlugin = {
  id: 'sketch',
  name: 'Hand-Drawn Sketch',
  defaultName: 'Sketch',
  defaultColor: 'pink',
  defaultProps: sketchProps.defaults,
  snippet:
    '[node:sketch] Art {color: pink, icon: rocket, caption: "Hand-Drawn"}',
  propFields: sketchProps.fields,
  measure(node, ctx) {
    const explicitW = sketchProps.readField(node.props, 'width');
    const explicitH = sketchProps.readField(node.props, 'height');
    const caption = (sketchProps.readField(node.props, 'caption') ?? '').trim();
    let width = 168;
    if (explicitW !== undefined) {
      width = explicitW;
    } else if (caption) {
      const capW = ctx.measureText(caption, `700 15px ${ctx.fontFamily}`);
      width = Math.max(168, Math.min(360, Math.ceil(capW + 24)));
    }
    const baseH = explicitH ?? 128;
    return {
      width,
      height: caption ? baseH + 26 : baseH,
    };
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
    const props = isCustomSceneNode(positioned.node)
      ? positioned.node.props
      : undefined;
    const caption = (sketchProps.readField(props, 'caption') ?? '').trim();
    const iconName =
      (sketchProps.readField(props, 'icon') ?? '').trim() || positioned.node.name;
    const svgOverride = (sketchProps.readField(props, 'svg') ?? '').trim();
    const svgText = svgOverride
      ? wrapBareSvgSnippet(svgOverride)
      : getSketchIconSvg(iconName) ?? getSketchIconSvg('lightbulb')!;

    const areaH = caption ? positioned.height - 28 : positioned.height;
    const strokes = sketchPipeline.run({
      asset: { kind: 'svg', svgText },
      options: {
        seed: positioned.id,
        centerX: positioned.cx,
        centerY: positioned.cy - (caption ? 12 : 0),
        targetWidth: Math.max(32, positioned.width - 16),
        targetHeight: Math.max(32, areaH - 14),
        defaultColor: positioned.node.color,
        strokeWidth: 2.5,
        wobbleAmp: 0.75,
        fillClosedShapes: true,
      },
    });

    strokes.forEach((s, idx) => {
      helpers.pushStroke(s, idx === strokes.length - 1 ? 45 : 20);
    });

    if (caption) {
      helpers.pushTextLine({
        id: `${positioned.id}-caption`,
        text: caption,
        boxLeftX: positioned.cx - positioned.width / 2,
        boxWidth: positioned.width,
        centerY: positioned.cy + positioned.height / 2 - 12,
        align: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: positioned.node.color,
        msPerChar: 78,
        gapAfterMs: 40,
      });
    }
  },
};
