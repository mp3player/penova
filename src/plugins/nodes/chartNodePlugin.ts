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
  frames: prop.string({
    default: '',
    description:
      'Optional pipe-separated data snapshots for post-draw bar animation, e.g. "20,45,75,100 | 60,85,40,90"',
  }),
  speed: prop.number({
    default: 1.0,
    min: 0,
    max: 6,
    step: 0.1,
    description: 'Post-draw transitions per second across frames (0 = static)',
  }),
  width: prop.number({ min: 180, step: 10, aliases: ['w'] }),
  height: prop.number({ min: 140, step: 10, aliases: ['h'] }),
});

function parseNumberSeries(raw: string): number[] {
  return raw
    .split(',')
    .map((v) => Number.parseFloat(v.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function parseChartData(node: CustomSceneNode): {
  title: string;
  values: number[];
  frames: number[][];
  labels: string[];
  highlightIdx: number;
  speed: number;
} {
  const title =
    (chartProps.readField(node.props, 'title') ?? '').trim() ||
    node.name ||
    'Metrics';

  const rawFramesStr = (chartProps.readField(node.props, 'frames') ?? '').trim();
  const parsedFrames = rawFramesStr
    ? rawFramesStr
        .split('|')
        .map((chunk) => parseNumberSeries(chunk).slice(0, 8))
        .filter((arr) => arr.length >= 2)
    : [];

  const rawValuesStr = (chartProps.readField(node.props, 'values') ?? '').trim();
  const rawValues = rawValuesStr ? parseNumberSeries(rawValuesStr) : [];
  const baseValues =
    parsedFrames.length >= 1
      ? parsedFrames[0]
      : rawValues.length >= 2
      ? rawValues.slice(0, 8)
      : [25, 48, 76, 100];

  const barCount = baseValues.length;
  const normalizedFrames = parsedFrames.map((frame) =>
    Array.from({ length: barCount }, (_, idx) => frame[idx] ?? baseValues[idx])
  );

  const rawLabelsStr = (chartProps.readField(node.props, 'labels') ?? '').trim();
  const rawLabels = rawLabelsStr
    ? rawLabelsStr.split(',').map((s) => s.trim())
    : [];
  const labels = baseValues.map((_, idx) => rawLabels[idx] || `#${idx + 1}`);

  const resolvedHi = chartProps.readField(node.props, 'highlight');
  const highlightIdx =
    resolvedHi !== undefined && resolvedHi < baseValues.length
      ? Math.round(resolvedHi)
      : baseValues.length - 1;

  const speed = chartProps.readField(node.props, 'speed') ?? 1.0;

  return {
    title,
    values: baseValues,
    frames: normalizedFrames,
    labels,
    highlightIdx,
    speed,
  };
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
    const { title, values, frames, labels, highlightIdx, speed } = parseChartData(node);
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

    // 4. Bars + Excalidraw-style diagonal hachure on highlighted bar (or animated multi-frame bars)
    const isAnimated = frames.length >= 2 && speed > 0;
    const allFrameVals = isAnimated ? frames.flat() : values;
    const maxVal = Math.max(1e-3, ...allFrameVals);
    const slotW = plotW / values.length;
    const barW = Math.min(44, Math.max(18, slotW * 0.58));
    const barColors: ChalkColor[] = ['cyan', 'green', 'yellow', 'orange'];
    const barTopPoints: Point[] = [];

    const evalBarValue = (barIdx: number, elapsedMs: number): number => {
      if (!isAnimated) return values[barIdx];
      const cyclePos = Math.max(0, (elapsedMs / 1000) * speed);
      const fIdx = Math.floor(cyclePos) % frames.length;
      const nextIdx = (fIdx + 1) % frames.length;
      const frac = cyclePos - Math.floor(cyclePos);
      // Hold 25% on each snapshot, then smoothstep transition across the remaining 75%
      const u = frac < 0.25 ? 0 : (frac - 0.25) / 0.75;
      const ease = u * u * (3 - 2 * u);
      const a = frames[fIdx][barIdx];
      const b = frames[nextIdx][barIdx];
      return a + (b - a) * ease;
    };

    const barTopAt = (idx: number, val: number): Point => {
      const barH = Math.max(10, (val / maxVal) * (plotH - 14));
      const bx = plotLeft + slotW * (idx + 0.5) - barW / 2;
      const by = plotBottom - barH;
      return { x: bx + barW / 2, y: Math.max(plotTop + 4, by - 7) };
    };

    const buildStaticBarStroke = (
      idx: number,
      val: number,
      barColor: ChalkColor,
      isHi: boolean
    ) => {
      const barH = Math.max(10, (val / maxVal) * (plotH - 14));
      const bx = plotLeft + slotW * (idx + 0.5) - barW / 2;
      const by = plotBottom - barH;
      const barPts = buildRoundedRectPoints(bx, by, barW, barH, 3, rand, 1.5);
      return buildStrokePath(`${positioned.id}-bar-${idx}`, barPts, {
        width: isHi ? 2.6 : 2.1,
        color: barColor,
        opacity: 0.94,
        fillOpacity: 1,
        speedFactor: 1.35,
      });
    };

    const buildSmoothBarStroke = (
      idx: number,
      val: number,
      barColor: ChalkColor,
      isHi: boolean,
      jitterX: number[],
      jitterY: number[]
    ) => {
      const barH = Math.max(10, (val / maxVal) * (plotH - 14));
      const bx = plotLeft + slotW * (idx + 0.5) - barW / 2;
      const by = plotBottom - barH;
      const r = Math.min(3, barW * 0.25, barH * 0.35);
      const pts: Point[] = [];
      const addSeg = (ax: number, ay: number, bx2: number, by2: number, steps: number) => {
        for (let s = 1; s < steps; s++) {
          const u = s / steps;
          pts.push({ x: ax + (bx2 - ax) * u, y: ay + (by2 - ay) * u });
        }
      };
      const addArc = (cx: number, cy: number, startAng: number, endAng: number) => {
        for (let s = 0; s <= 3; s++) {
          const a = startAng + ((endAng - startAng) * s) / 3;
          pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
      };

      // Fixed point topology regardless of barH prevents subdivision jumps when morphing
      pts.push({ x: bx + r - 0.8, y: by });
      addSeg(bx + r, by, bx + barW - r, by, 4);
      addArc(bx + barW - r, by + r, -Math.PI / 2, 0);
      addSeg(bx + barW, by + r, bx + barW, by + barH - r, 4);
      addArc(bx + barW - r, by + barH - r, 0, Math.PI / 2);
      addSeg(bx + barW - r, by + barH, bx + r, by + barH, 4);
      addArc(bx + r, by + barH - r, Math.PI / 2, Math.PI);
      addSeg(bx, by + barH - r, bx, by + r, 4);
      addArc(bx + r, by + r, Math.PI, Math.PI * 1.5);
      pts.push({ x: bx + r + 1.5, y: by });

      for (let k = 0; k < pts.length; k++) {
        pts[k] = {
          x: pts[k].x + (jitterX[k] ?? 0),
          y: pts[k].y + (jitterY[k] ?? 0),
        };
      }

      return buildStrokePath(`${positioned.id}-bar-${idx}`, pts, {
        width: isHi ? 2.6 : 2.1,
        color: barColor,
        opacity: 0.94,
        fillOpacity: 1,
        speedFactor: 1.35,
      });
    };

    values.forEach((val, idx) => {
      const barH = Math.max(10, (val / maxVal) * (plotH - 14));
      const bx = plotLeft + slotW * (idx + 0.5) - barW / 2;
      const by = plotBottom - barH;
      const isHi = idx === highlightIdx;
      const barColor: ChalkColor = isHi
        ? 'orange'
        : barColors[idx % barColors.length];

      if (isAnimated) {
        const jRand = mulberry32(hashString(`chart-bar-jitter:${positioned.id}:${idx}`));
        const jitterX: number[] = [];
        const jitterY: number[] = [];
        for (let k = 0; k < 30; k++) {
          jitterX.push((jRand() - 0.5) * 1.1);
          jitterY.push((jRand() - 0.5) * 1.1);
        }
        helpers.pushStroke(
          buildSmoothBarStroke(idx, val, barColor, isHi, jitterX, jitterY),
          14,
          (elapsedMs) =>
            buildSmoothBarStroke(
              idx,
              evalBarValue(idx, elapsedMs),
              barColor,
              isHi,
              jitterX,
              jitterY
            ),
          { sync: 'node' }
        );
      } else {
        helpers.pushStroke(buildStaticBarStroke(idx, val, barColor, isHi), 14);
      }

      // Hand-drawn diagonal hachure stripes inside the highlighted bar (static mode)
      if (!isAnimated && isHi && barH > 16) {
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

      barTopPoints.push(barTopAt(idx, val));

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
      if (isAnimated) {
        const TREND_SEG_STEPS = 6;
        const trendRand = mulberry32(hashString(`chart-trend:${positioned.id}`));
        const segJitterX: number[][] = [];
        const segJitterY: number[][] = [];
        for (let i = 1; i < values.length; i++) {
          const jx: number[] = [];
          const jy: number[] = [];
          for (let s = 0; s <= TREND_SEG_STEPS; s++) {
            const env = Math.sin((s / TREND_SEG_STEPS) * Math.PI);
            jx.push((trendRand() - 0.5) * 1.1 * env);
            jy.push((trendRand() - 0.5) * 1.3 * env);
          }
          segJitterX.push(jx);
          segJitterY.push(jy);
        }

        const buildSmoothTrendStroke = (elapsedMs: number) => {
          const ptsNow = values.map((_, idx) =>
            barTopAt(idx, evalBarValue(idx, elapsedMs))
          );
          const trendPts: Point[] = [ptsNow[0]];
          for (let i = 1; i < ptsNow.length; i++) {
            const a = ptsNow[i - 1];
            const b = ptsNow[i];
            const jx = segJitterX[i - 1];
            const jy = segJitterY[i - 1];
            for (let s = 1; s <= TREND_SEG_STEPS; s++) {
              const u = s / TREND_SEG_STEPS;
              trendPts.push({
                x: a.x + (b.x - a.x) * u + jx[s],
                y: a.y + (b.y - a.y) * u + jy[s],
              });
            }
          }
          return buildStrokePath(`${positioned.id}-trend`, trendPts, {
            width: 2.2,
            color: 'yellow',
            opacity: 0.9,
            speedFactor: 1.4,
          });
        };

        helpers.pushStroke(
          buildSmoothTrendStroke(0),
          24,
          buildSmoothTrendStroke,
          { sync: 'node' }
        );
      } else {
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
    }
  },
};
