import {
  drawFallingDustParticles,
  drawPowderyStroke,
} from '../../sdk/chalkBrush';
import {
  drawCachedSurface,
  paintRadialBackdrop,
} from '../../sdk/surfaceCache';
import {
  createOffscreenCanvas,
  onOffscreenCanvasFactoryChange,
} from '../../sdk/offscreenCanvas';
import { hash2D, mulberry32 } from '../../sdk/random';
import { PresentationPlugin, ThemePalette } from '../contracts';

const CHALKBOARD_FONT =
  "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";

const palette: ThemePalette = {
  id: 'chalkboard',
  label: 'Chalkboard',
  bgPrimary: '#1e2c26',
  bgSecondary: '#131d19',
  vignetteColor: 'rgba(6, 11, 9, 0.56)',
  subtitleColor: '#d2ddd6',
  labelPillBg: 'rgba(20, 32, 27, 0.92)',
  labelPillBorder: 'rgba(244, 241, 234, 0.18)',
  cardFillOpacity: 0.13,
  zoneFillOpacity: 0.06,
  cardShadow: {
    dx: 3,
    dy: 4,
    color: 'rgba(0, 0, 0, 0.24)',
  },
  subtitleBg: 'rgba(13, 21, 18, 0.80)',
  subtitleBorder: 'rgba(244, 241, 234, 0.16)',
  subtitleTextColor: '#f4f1ea',
  colors: {
    white: '#f4f1ea',
    yellow: '#f3cf7a',
    cyan: '#89c9dc',
    pink: '#e89ca3',
    green: '#98cf9e',
    orange: '#ebaa76',
  },
};

const GRAIN_TILE_SIZE = 128;
let cachedChalkGrainTile: HTMLCanvasElement | null = null;

onOffscreenCanvasFactoryChange(() => {
  cachedChalkGrainTile = null;
});

function getChalkGrainTile(): HTMLCanvasElement | null {
  if (cachedChalkGrainTile) return cachedChalkGrainTile;

  const tile = createOffscreenCanvas(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
  if (!tile) return null;
  const tCtx = tile.getContext('2d');
  if (!tCtx) return null;

  const imgData = tCtx.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
  const data = imgData.data;
  for (let py = 0; py < GRAIN_TILE_SIZE; py++) {
    for (let px = 0; px < GRAIN_TILE_SIZE; px++) {
      const idx = (py * GRAIN_TILE_SIZE + px) * 4;
      const n = (hash2D(px, py) & 255) / 255 - 0.5;
      const tone = n >= 0 ? 255 : 0;
      data[idx] = tone;
      data[idx + 1] = tone;
      data[idx + 2] = tone;
      data[idx + 3] = Math.round(Math.abs(n) * 18);
    }
  }
  tCtx.putImageData(imgData, 0, 0);
  cachedChalkGrainTile = tile;
  return tile;
}

export const chalkboardPlugin: PresentationPlugin = {
  id: 'chalkboard',
  name: 'Chalkboard',
  palette,
  fontFamily: CHALKBOARD_FONT,
  glyphGrain: {
    enabled: true,
    minAlphaFactor: 0.8,
    range: 0.24,
  },
  shadowColor: 'rgba(0, 0, 0, 0.28)',
  soundProfile: {
    baseFreqHz: 2350,
    velocityFreqBoostHz: 550,
    baseGain: 0.065,
  },
  drawSurface(ctx, width, height) {
    drawCachedSurface(ctx, 'chalkboard', width, height, (c, w, h) => {
      paintRadialBackdrop(c, w, h, palette);
      const rand = mulberry32(9973 * 99 + w * 31 + h);

      // Faint lived-in chalk smudge clouds (erased board atmosphere)
      c.save();
      for (let i = 0; i < 16; i++) {
        const cx = rand() * w;
        const cy = rand() * h;
        const rx = 80 + rand() * 210;
        const ry = 40 + rand() * 110;
        const angle = (rand() - 0.5) * 0.6;
        c.save();
        c.translate(cx, cy);
        c.rotate(angle);
        const smudge = c.createRadialGradient(0, 0, 5, 0, 0, rx);
        smudge.addColorStop(0, 'rgba(235, 242, 232, 0.032)');
        smudge.addColorStop(1, 'rgba(235, 242, 232, 0)');
        c.fillStyle = smudge;
        c.scale(1, ry / rx);
        c.beginPath();
        c.arc(0, 0, rx, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      c.restore();

      // Isotropic mineral slate grain via tiled 128x128 offscreen noise pattern
      const grainTile = getChalkGrainTile();
      const pattern = grainTile ? c.createPattern(grainTile, 'repeat') : null;
      if (pattern) {
        c.fillStyle = pattern;
        c.fillRect(0, 0, w, h);
      }

      // Soft vignette + classroom wooden chalk ledge hint
      const vig = c.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.35,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.72
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, palette.vignetteColor);
      c.fillStyle = vig;
      c.fillRect(0, 0, w, h);

      const ledgeH = Math.max(8, Math.round(h * 0.012));
      const ledgeGrad = c.createLinearGradient(0, h - ledgeH, 0, h);
      ledgeGrad.addColorStop(0, '#5c4028');
      ledgeGrad.addColorStop(0.5, '#3e2a19');
      ledgeGrad.addColorStop(1, '#24170d');
      c.fillStyle = ledgeGrad;
      c.fillRect(0, h - ledgeH, w, ledgeH);

      c.fillStyle = 'rgba(255, 238, 210, 0.16)';
      c.fillRect(0, h - ledgeH, w, 1);

      c.strokeStyle = 'rgba(244, 241, 234, 0.05)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0.5, h - ledgeH);
      c.lineTo(0.5, 0.5);
      c.lineTo(w - 0.5, 0.5);
      c.lineTo(w - 0.5, h - ledgeH);
      c.stroke();
    });
  },
  drawStroke(ctx, stroke, progress) {
    const colorHex = palette.colors[stroke.color] ?? palette.colors.white;
    drawPowderyStroke(ctx, stroke, progress, colorHex);
  },
  drawInstrument(ctx, colorHex) {
    // Tapered chalk stick anchored at (0, 0)
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(0, -1.6);
    ctx.lineTo(14, -4.5);
    ctx.lineTo(74, -5);
    ctx.arc(74, 0, 5, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(14, 4.5);
    ctx.lineTo(0, 1.6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(16, 1, 56, 3.2);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(28, -5.1, 24, 10.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(28, -5.1, 24, 10.2);
  },
  drawParticles(ctx, tipX, tipY, colorHex, tMs, seed) {
    drawFallingDustParticles(ctx, tipX, tipY, colorHex, tMs, seed);
  },
};
