import {
  ChalkColor,
  CustomSceneNode,
  isCustomSceneNode,
  Point,
} from '../../model/scene';
import { defineProps, prop } from '../../sdk/propSchema';
import { hashString, mulberry32 } from '../../sdk/random';
import {
  buildRoundedRectPoints,
  buildStrokePath,
  sketchSegment,
} from '../../sdk/strokePath';
import { SceneNodePlugin } from '../contracts';
import { clipRayToRect } from '../shapes/clipHelpers';

const chartProps = defineProps({
  title: prop.string({ default: 'Growth', description: 'Chart title' }),
  values: prop.string({
    default: '22,48,76,100',
    description: 'Comma-separated bar values',
  }),
  labels: prop.string({
    default: 'Q1,Q2,Q3,Q4',
    description: 'Comma-separated bar labels',
  }),
  highlight: prop.number({
    default: 3,
    min: 0,
    max: 7,
    step: 1,
    description: '0-based highlighted bar index',
  }),
  width: prop.number({ min: 180, step: 10, aliases: ['w'] }),
  height: prop.number({ min: 140, step: 10, aliases: ['h'] }),
});

function parseChartData(node: CustomSceneNode): {
  title: string;
  values: number[];
  labels: string[];
  highlightIdx: number;
} {
  const title =
    (chartProps.readField(node.props, 'title') ?? '').trim() ||
    node.name ||
    'Metrics';

  const rawValuesStr = (chartProps.readField(node.props, 'values') ?? '').trim();
  const rawValues = rawValuesStr
    ? rawValuesStr
        .split(',')
        .map((v) => Number.parseFloat(v.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0)
    : [];
  const values = rawValues.length >= 2 ? rawValues.slice(0, 8) : [25, 48, 76, 100];

  const rawLabelsStr = (chartProps.readField(node.props, 'labels') ?? '').trim();
  const rawLabels = rawLabelsStr
    ? rawLabelsStr.split(',').map((s) => s.trim())
    : [];
  const labels = values.map((_, idx) => rawLabels[idx] || `#${idx + 1}`);

  const resolvedHi = chartProps.readField(node.props, 'highlight');
  const highlightIdx =
    resolvedHi !== undefined && resolvedHi < values.length
      ? Math.round(resolvedHi)
      : values.length - 1;

  return { title, values, labels, highlightIdx };
}

export const chartNodePlugin: SceneNodePlugin = {
  id: 'chart',
  name: 'Bar Chart',
  defaultName: 'Metrics',
  defaultColor: 'orange',
  defaultProps: chartProps.defaults,
  snippet:
    '[node:chart] Speed {color: orange, title: "Growth", values: "20,45,75,100", labels: "Q1,Q2,Q3,Q4", highlight: 3}',
  propFields: chartProps.fields,
  measure(node, ctx) {
    const explicitW = chartProps.readField(node.props, 'width');
    const explicitH = chartProps.readField(node.props, 'height');
    let width = 296;
    if (explicitW !== undefined) {
      width = explicitW;
    } else {
      const { title, values, labels } = parseChartData(node);
      const titleW = ctx.measureText(title, `700 15px ${ctx.fontFamily}`);
      const widestLabelW = Math.max(
        32,
        ...labels.map((l) => ctx.measureText(l, `700 12px ${ctx.fontFamily}`))
      );
      width = Math.max(
        296,
        Math.min(
          560,
          Math.ceil(
            Math.max(
              titleW + 48,
              values.length * Math.max(54, widestLabelW + 14) + 56
            )
          )
        )
      );
    }
    const height = explicitH ?? 196;
    return { width, height };
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
    const { title, values, labels, highlightIdx } = parseChartData(node);
    const x = positioned.cx - positioned.width / 2;
    const y = positioned.cy - positioned.height / 2;
    const rand = mulberry32(hashString(`chart:${positioned.id}`));

    // 1. Card backdrop
    const framePts = buildRoundedRectPoints(
      x,
      y,
      positioned.width,
      positioned.height,
      14,
      rand,
      3
    );
    helpers.pushStroke(
      buildStrokePath(`${positioned.id}-card`, framePts, {
        width: 2.4,
        color: node.color,
        opacity: 0.9,
        fillOpacity: 1,
        surfaceShadow: true,
        speedFactor: 1.25,
      }),
      35
    );

    // 2. Title
    helpers.pushTextLine({
      id: `${positioned.id}-title`,
      text: title,
      boxLeftX: x + 16,
      boxWidth: positioned.width - 32,
      centerY: y + 22,
      align: 'center',
      fontSize: 15,
      fontWeight: 700,
      color: node.color,
      msPerChar: 55,
      gapAfterMs: 30,
    });

    // 3. Axes (L-shape inside card)
    const plotLeft = x + 30;
    const plotRight = x + positioned.width - 24;
    const plotTop = y + 46;
    const plotBottom = y + positioned.height - 34;
    const plotW = Math.max(80, plotRight - plotLeft);
    const plotH = Math.max(50, plotBottom - plotTop);

    helpers.pushStroke(
      buildStrokePath(
        `${positioned.id}-y-axis`,
        sketchSegment(
          { x: plotLeft, y: plotBottom },
          { x: plotLeft, y: plotTop },
          rand,
          0.9,
          14
        ),
        {
          width: 2.1,
          color: 'white',
          opacity: 0.8,
          speedFactor: 1.4,
        }
      ),
      18
    );
    helpers.pushStroke(
      buildStrokePath(
        `${positioned.id}-x-axis`,
        sketchSegment(
          { x: plotLeft, y: plotBottom },
          { x: plotRight, y: plotBottom },
          rand,
          0.9,
          14
        ),
        {
          width: 2.1,
          color: 'white',
          opacity: 0.8,
          speedFactor: 1.4,
        }
      ),
      26
    );

    // 4. Bars + Excalidraw-style diagonal hachure on highlighted bar
    const maxVal = Math.max(1e-3, ...values);
    const slotW = plotW / values.length;
    const barW = Math.min(44, Math.max(18, slotW * 0.58));
    const barColors: ChalkColor[] = ['cyan', 'green', 'yellow', 'orange'];
    const barTopPoints: Point[] = [];

    values.forEach((val, idx) => {
      const barH = Math.max(10, (val / maxVal) * (plotH - 14));
      const bx = plotLeft + slotW * (idx + 0.5) - barW / 2;
      const by = plotBottom - barH;
      const isHi = idx === highlightIdx;
      const barColor: ChalkColor = isHi
        ? 'orange'
        : barColors[idx % barColors.length];

      const barPts = buildRoundedRectPoints(bx, by, barW, barH, 3, rand, 1.5);
      helpers.pushStroke(
        buildStrokePath(`${positioned.id}-bar-${idx}`, barPts, {
          width: isHi ? 2.6 : 2.1,
          color: barColor,
          opacity: 0.94,
          fillOpacity: 1,
          speedFactor: 1.35,
        }),
        14
      );

      // Hand-drawn diagonal hachure stripes inside the highlighted bar
      if (isHi && barH > 16) {
        const pitch = 9;
        let hatchIdx = 0;
        for (let hy = by + 7; hy < plotBottom - 4; hy += pitch) {
          const xStart = bx + 3;
          const xEnd = bx + barW - 3;
          const yEnd = Math.min(plotBottom - 3, hy + (xEnd - xStart) * 0.42);
          helpers.pushStroke(
            buildStrokePath(
              `${positioned.id}-hatch-${hatchIdx++}`,
              sketchSegment(
                { x: xStart, y: hy },
                { x: xEnd, y: yEnd },
                rand,
                0.55,
                14
              ),
              {
                width: 1.35,
                color: barColor,
                opacity: 0.65,
                speedFactor: 1.9,
              }
            ),
            6
          );
        }
      }

      barTopPoints.push({ x: bx + barW / 2, y: Math.max(plotTop + 4, by - 7) });

      helpers.pushTextLine({
        id: `${positioned.id}-lbl-${idx}`,
        text: labels[idx],
        boxLeftX: plotLeft + slotW * idx,
        boxWidth: slotW,
        centerY: plotBottom + 16,
        align: 'center',
        fontSize: 12,
        fontWeight: isHi ? 700 : 400,
        color: isHi ? 'orange' : 'white',
        msPerChar: 40,
        gapAfterMs: 14,
      });
    });

    // 5. Trend curve above bars
    if (barTopPoints.length >= 2) {
      const trendPts: Point[] = [];
      for (let i = 1; i < barTopPoints.length; i++) {
        const seg = sketchSegment(
          barTopPoints[i - 1],
          barTopPoints[i],
          rand,
          0.9,
          14
        );
        trendPts.push(...(i === 1 ? seg : seg.slice(1)));
      }
      helpers.pushStroke(
        buildStrokePath(`${positioned.id}-trend`, trendPts, {
          width: 2.2,
          color: 'yellow',
          opacity: 0.9,
          speedFactor: 1.4,
        }),
        24
      );
    }
  },
};
