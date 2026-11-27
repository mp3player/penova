import {
  CustomSceneNode,
  isCustomSceneNode,
  Point,
} from '../../model/scene';
import { compileMathExpr } from '../../sdk/mathExpr';
import { defineProps, prop } from '../../sdk/propSchema';
import { hashString, mulberry32 } from '../../sdk/random';
import {
  buildRoundedRectPoints,
  buildStrokePath,
  sketchSegment,
} from '../../sdk/strokePath';
import { SceneNodePlugin } from '../contracts';
import { clipRayToRect } from '../shapes/clipHelpers';

const WAVE_TYPES = ['sine', 'square', 'fourier', 'audio', 'ecg'] as const;
type WavePresetType = (typeof WAVE_TYPES)[number];

const waveProps = defineProps({
  title: prop.string({ default: 'Waveform', description: 'Waveform plot title' }),
  type: prop.enum(WAVE_TYPES, {
    default: 'sine',
    aliases: ['preset', 'mode'],
    description: 'Preset wave generator (sine, square, fourier, audio, ecg)',
  }),
  fn: prop.string({
    default: '',
    aliases: ['expr', 'formula'],
    description: 'Math formula f(x, t), e.g. "sum(k, 1, 5, sin((2*k-1)*(x - 2*t)) / (2*k-1))"',
  }),
  values: prop.string({
    default: '',
    aliases: ['data', 'series'],
    description: 'Comma-separated data points for scrolling real-data waveform',
  }),
  domain: prop.string({
    default: '0..6.283',
    description: 'Domain range "min..max" for x when fn is specified',
  }),
  yrange: prop.string({
    default: '',
    description: 'Optional fixed vertical range "min..max"',
  }),
  freq: prop.number({
    default: 2,
    min: 0.25,
    max: 12,
    step: 0.25,
    description: 'Preset wave spatial cycles across plot width',
  }),
  amp: prop.number({
    default: 0.8,
    min: 0.1,
    max: 1.0,
    step: 0.05,
    description: 'Preset amplitude ratio relative to half plot height',
  }),
  harmonics: prop.number({
    default: 4,
    min: 1,
    max: 12,
    step: 1,
    description: 'Harmonic count for preset fourier square-wave approximation',
  }),
  speed: prop.number({
    default: 1.0,
    min: 0,
    max: 6,
    step: 0.1,
    description: 'Post-draw animation speed multiplier (0 = static)',
  }),
  samples: prop.number({
    default: 56,
    min: 16,
    max: 120,
    step: 4,
    description: 'Horizontal curve sample count',
  }),
  width: prop.number({ min: 200, step: 10, aliases: ['w'] }),
  height: prop.number({ min: 140, step: 10, aliases: ['h'] }),
});

function parseRangePair(raw: string | undefined): [number, number] | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.includes('..') ? trimmed.split('..') : trimmed.split(',');
  if (parts.length !== 2) return null;
  const lo = Number.parseFloat(parts[0].trim());
  const hi = Number.parseFloat(parts[1].trim());
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    return null;
  }
  return [lo, hi];
}

function parseValuesList(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number.parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function parseWaveConfig(node: CustomSceneNode) {
  const resolved = waveProps.resolve(node.props);
  const title = resolved.title.trim() || node.name || 'Waveform';
  const presetType = (resolved.type ?? 'sine') as WavePresetType;
  const fnSource = (waveProps.readField(node.props, 'fn') ?? '').trim();
  const compiledFn = fnSource ? compileMathExpr(fnSource) : null;
  const dataValues = parseValuesList(waveProps.readField(node.props, 'values'));
  const domainRange = parseRangePair(resolved.domain) ?? [0, Math.PI * 2];
  const explicitYRange = parseRangePair(waveProps.readField(node.props, 'yrange'));

  return {
    title,
    presetType,
    compiledFn,
    dataValues,
    domainRange,
    explicitYRange,
    freq: resolved.freq,
    amp: resolved.amp,
    harmonics: Math.max(1, Math.round(resolved.harmonics)),
    speed: resolved.speed,
    samples: Math.max(16, Math.round(resolved.samples)),
  };
}

function evalPresetWave(
  type: WavePresetType,
  u: number,
  phase: number,
  freq: number,
  harmonics: number
): number {
  const baseArg = u * freq * Math.PI * 2 - phase;
  switch (type) {
    case 'square':
      return Math.tanh(6 * Math.sin(baseArg));
    case 'fourier': {
      let sum = 0;
      for (let k = 1; k <= harmonics; k++) {
        const n = 2 * k - 1;
        sum += Math.sin(n * baseArg) / n;
      }
      return sum * (4 / Math.PI) * 0.78;
    }
    case 'audio': {
      const carrier =
        0.52 * Math.sin(u * freq * Math.PI * 4 - phase * 1.35) +
        0.33 * Math.sin(u * freq * Math.PI * 7.4 + phase * 0.9) +
        0.24 * Math.cos(u * freq * Math.PI * 2.2 - phase * 2.1);
      const envelope = 0.25 + 0.75 * Math.sin(u * Math.PI);
      return carrier * envelope;
    }
    case 'ecg': {
      const cyc = ((u * freq - phase / (Math.PI * 2)) % 1 + 1) % 1;
      const pWave = 0.16 * Math.exp(-Math.pow((cyc - 0.18) / 0.045, 2));
      const qDip = -0.22 * Math.exp(-Math.pow((cyc - 0.36) / 0.016, 2));
      const rPeak = 0.98 * Math.exp(-Math.pow((cyc - 0.40) / 0.018, 2));
      const sDip = -0.32 * Math.exp(-Math.pow((cyc - 0.44) / 0.017, 2));
      const tWave = 0.28 * Math.exp(-Math.pow((cyc - 0.68) / 0.065, 2));
      return pWave + qDip + rPeak + sDip + tWave - 0.1;
    }
    case 'sine':
    default:
      return Math.sin(baseArg);
  }
}

export const waveNodePlugin: SceneNodePlugin = {
  id: 'wave',
  name: 'Dynamic Wave',
  defaultName: 'Waveform',
  defaultColor: 'cyan',
  defaultProps: waveProps.defaults,
  snippet:
    '[node:wave] Fourier {color: cyan, title: "Fourier Series", fn: "sum(k, 1, 5, sin((2*k-1)*(x - 2*t)) / (2*k-1))"}',
  propFields: waveProps.fields,
  measure(node, ctx) {
    const explicitW = waveProps.readField(node.props, 'width');
    const explicitH = waveProps.readField(node.props, 'height');
    let width = 320;
    if (explicitW !== undefined) {
      width = explicitW;
    } else {
      const { title } = parseWaveConfig(node);
      const titleW = ctx.measureText(title, `700 15px ${ctx.fontFamily}`);
      width = Math.max(320, Math.min(560, Math.ceil(titleW + 64)));
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
    const cfg = parseWaveConfig(node);
    const x = positioned.cx - positioned.width / 2;
    const y = positioned.cy - positioned.height / 2;
    const rand = mulberry32(hashString(`wave:${positioned.id}`));

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
      text: cfg.title,
      boxLeftX: x + 16,
      boxWidth: positioned.width - 32,
      centerY: y + 22,
      align: 'center',
      fontSize: 15,
      fontWeight: 700,
      color: node.color,
      msPerChar: 55,
      gapAfterMs: 28,
    });

    // 3. Plot area & Y-range calibration
    const plotLeft = x + 26;
    const plotRight = x + positioned.width - 22;
    const plotTop = y + 48;
    const plotBottom = y + positioned.height - 24;
    const plotW = Math.max(80, plotRight - plotLeft);
    const plotH = Math.max(50, plotBottom - plotTop);

    let yMin = -1.1;
    let yMax = 1.1;
    const useFormula = cfg.compiledFn !== null;
    const useData = !useFormula && cfg.dataValues.length >= 2;

    if (cfg.explicitYRange) {
      [yMin, yMax] = cfg.explicitYRange;
    } else if (useFormula && cfg.compiledFn) {
      let minProbe = Infinity;
      let maxProbe = -Infinity;
      const [dMin, dMax] = cfg.domainRange;
      for (const tProbe of [0, 0.5, 1.0, 2.0, 3.5, 5.0]) {
        for (let i = 0; i <= 24; i++) {
          const xVal = dMin + ((dMax - dMin) * i) / 24;
          const v = cfg.compiledFn.evaluate({ x: xVal, t: tProbe });
          if (v < minProbe) minProbe = v;
          if (v > maxProbe) maxProbe = v;
        }
      }
      if (!Number.isFinite(minProbe) || !Number.isFinite(maxProbe)) {
        minProbe = -1;
        maxProbe = 1;
      }
      if (Math.abs(maxProbe - minProbe) < 1e-4) {
        yMin = minProbe - 1;
        yMax = maxProbe + 1;
      } else if (minProbe < 0 && maxProbe > 0) {
        const absMax = Math.max(Math.abs(minProbe), Math.abs(maxProbe)) * 1.12;
        yMin = -absMax;
        yMax = absMax;
      } else {
        const pad = (maxProbe - minProbe) * 0.14;
        yMin = minProbe - pad;
        yMax = maxProbe + pad;
      }
    } else if (useData) {
      const minD = Math.min(...cfg.dataValues);
      const maxD = Math.max(...cfg.dataValues);
      if (Math.abs(maxD - minD) < 1e-4) {
        yMin = minD - 1;
        yMax = maxD + 1;
      } else {
        const pad = (maxD - minD) * 0.16;
        yMin = minD - pad;
        yMax = maxD + pad;
      }
    }

    const mapValueToY = (val: number): number => {
      const norm = (val - yMin) / Math.max(1e-6, yMax - yMin);
      const rawY = plotBottom - norm * plotH;
      return Math.max(plotTop + 2, Math.min(plotBottom - 2, rawY));
    };

    const baselineVal = yMin <= 0 && yMax >= 0 ? 0 : (yMin + yMax) / 2;
    const baseY = mapValueToY(baselineVal);

    // Y-axis + dashed baseline
    helpers.pushStroke(
      buildStrokePath(
        `${positioned.id}-y-axis`,
        sketchSegment(
          { x: plotLeft, y: plotBottom },
          { x: plotLeft, y: plotTop },
          rand,
          0.75,
          12
        ),
        {
          width: 1.9,
          color: 'white',
          opacity: 0.72,
          speedFactor: 1.5,
        }
      ),
      14
    );
    helpers.pushStroke(
      buildStrokePath(
        `${positioned.id}-baseline`,
        sketchSegment(
          { x: plotLeft, y: baseY },
          { x: plotRight, y: baseY },
          rand,
          0.55,
          14
        ),
        {
          width: 1.4,
          color: 'white',
          opacity: 0.36,
          dashed: true,
          speedFactor: 1.7,
        }
      ),
      20
    );

    // 4. Precompute deterministic per-sample micro-jitter (zero frame-to-frame flicker)
    const sampleCount = cfg.samples;
    const jitterRand = mulberry32(hashString(`wave-jitter:${positioned.id}`));
    const jitterX: number[] = [];
    const jitterY: number[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      jitterX.push((jitterRand() - 0.5) * 1.1);
      jitterY.push((jitterRand() - 0.5) * 1.2);
    }

    const buildWaveStroke = (elapsedMs: number) => {
      const tSec = Math.max(0, elapsedMs / 1000) * cfg.speed;
      const pts: Point[] = [];
      const [dMin, dMax] = cfg.domainRange;
      const dataLen = cfg.dataValues.length;
      const phase = tSec * Math.PI * 1.6;

      for (let i = 0; i <= sampleCount; i++) {
        const u = i / sampleCount;
        let val = 0;

        if (useFormula && cfg.compiledFn) {
          const xVal = dMin + (dMax - dMin) * u;
          val = cfg.compiledFn.evaluate({ x: xVal, t: tSec });
        } else if (useData) {
          const shift = tSec * 1.4;
          const idxPos = u * (dataLen - 1) + shift;
          const i0 = ((Math.floor(idxPos) % dataLen) + dataLen) % dataLen;
          const i1 = (i0 + 1) % dataLen;
          const frac = idxPos - Math.floor(idxPos);
          const smoothFrac = (1 - Math.cos(frac * Math.PI)) * 0.5;
          val = cfg.dataValues[i0] + (cfg.dataValues[i1] - cfg.dataValues[i0]) * smoothFrac;
        } else {
          val = evalPresetWave(cfg.presetType, u, phase, cfg.freq, cfg.harmonics) * cfg.amp;
        }

        const px = plotLeft + 2 + u * (plotW - 4) + jitterX[i];
        const py = mapValueToY(val) + jitterY[i];
        pts.push({ x: px, y: py });
      }

      return buildStrokePath(`${positioned.id}-wave`, pts, {
        width: 2.8,
        color: node.color,
        opacity: 0.96,
        speedFactor: 1.15,
      });
    };

    helpers.pushStroke(
      buildWaveStroke(0),
      28,
      cfg.speed > 0 ? buildWaveStroke : undefined
    );
  },
};
