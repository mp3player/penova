import {
  drawFallingDustParticles,
  drawPowderyStroke,
} from '../../sdk/chalkBrush';
import {
  drawCachedSurface,
  paintRadialBackdrop,
} from '../../sdk/surfaceCache';
import { hash2D, mulberry32 } from '../../sdk/random';
import { PresentationPlugin, ThemePalette } from '../contracts';

const CHALKBOARD_FONT =
  "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";

const palette: ThemePalette = {
  id: 'chalkboard',
  label: '黑板粉笔',
  bgPrimary: '#192e25',
  bgSecondary: '#0f1d17',
  vignetteColor: 'rgba(5, 11, 8, 0.52)',
  subtitleColor: '#cdd9cf',
  labelPillBg: 'rgba(17, 33, 26, 0.88)',
  labelPillBorder: 'rgba(242, 244, 238, 0.16)',
  colors: {
    white: '#f2f4ee',
    yellow: '#fde06b',
    cyan: '#7dd8f7',
    pink: '#ff9bb3',
    green: '#8be8a8',
    orange: '#ffb870',
  },
};

export const chalkboardPlugin: PresentationPlugin = {
  id: 'chalkboard',
  name: '黑板粉笔',
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

      // Isotropic mineral slate grain via avalanche hash
      const imgData = c.getImageData(0, 0, w, h);
      const data = imgData.data;
      const len = data.length;
      for (let i = 0; i < len; i += 4) {
        const px = (i >> 2) % w;
        const py = ((i >> 2) / w) | 0;
        const hash = hash2D(px, py);
        const delta = ((hash & 255) / 255 - 0.5) * 9;
        data[i] = Math.max(0, Math.min(255, data[i] + delta));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + delta));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + delta));
      }
      c.putImageData(imgData, 0, 0);

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
      ledgeGrad.addColorStop(0, '#4f3723');
      ledgeGrad.addColorStop(0.5, '#3b2819');
      ledgeGrad.addColorStop(1, '#26190f');
      c.fillStyle = ledgeGrad;
      c.fillRect(0, h - ledgeH, w, ledgeH);

      c.fillStyle = 'rgba(255, 232, 198, 0.14)';
      c.fillRect(0, h - ledgeH, w, 1);
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
