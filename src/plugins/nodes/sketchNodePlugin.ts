import { isCustomSceneNode } from '../../model/scene';
import { getSketchIconSvg, sketchPipeline } from '../../sdk/sketchPipeline';
import { SceneNodePlugin } from '../contracts';
import { clipRayToRect } from '../shapes/clipHelpers';

function wrapBareSvgSnippet(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('<')) return trimmed;
  return `<svg viewBox="0 0 120 120"><path d="${trimmed}"/></svg>`;
}

export const iconNodePlugin: SceneNodePlugin = {
  id: 'icon',
  name: 'Sketch Icon',
  measure(node) {
    const rawSize = Number(node.props?.size);
    const size = Number.isFinite(rawSize) && rawSize > 8 ? rawSize : 30;
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
      typeof props?.icon === 'string' && props.icon.trim()
        ? props.icon.trim()
        : positioned.node.name;
    const rawSvg =
      typeof props?.svg === 'string' && props.svg.trim()
        ? wrapBareSvgSnippet(props.svg)
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

function readSketchCaption(
  props?: Record<string, string | number | boolean | undefined>
): string {
  const raw = props?.title ?? props?.text ?? props?.caption;
  return typeof raw === 'string' ? raw.trim() : '';
}

export const sketchNodePlugin: SceneNodePlugin = {
  id: 'sketch',
  name: 'Hand-Drawn Sketch',
  measure(node) {
    const rawW = Number(node.props?.width ?? node.props?.w);
    const rawH = Number(node.props?.height ?? node.props?.h);
    const width = Number.isFinite(rawW) && rawW >= 40 ? rawW : 168;
    const baseH = Number.isFinite(rawH) && rawH >= 40 ? rawH : 128;
    const caption = readSketchCaption(node.props);
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
    const caption = readSketchCaption(props);
    const iconName =
      typeof props?.icon === 'string' && props.icon.trim()
        ? props.icon.trim()
        : positioned.node.name;
    const svgText =
      typeof props?.svg === 'string' && props.svg.trim()
        ? wrapBareSvgSnippet(props.svg)
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
