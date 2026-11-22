import { drawSmoothLineStroke } from '../../sdk/chalkBrush';
import {
  drawCachedSurface,
  paintRadialBackdrop,
} from '../../sdk/surfaceCache';
import { PresentationPlugin, ThemePalette } from '../contracts';

const BLUEPRINT_FONT =
  "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";

const palette: ThemePalette = {
  id: 'blueprint',
  label: 'Blueprint',
  bgPrimary: '#102644',
  bgSecondary: '#09172b',
  vignetteColor: 'rgba(4, 10, 22, 0.55)',
  subtitleColor: '#a6c6eb',
  labelPillBg: 'rgba(10, 25, 48, 0.9)',
  labelPillBorder: 'rgba(103, 232, 249, 0.24)',
  colors: {
    white: '#f0f7ff',
    yellow: '#ffd86b',
    cyan: '#67e8f9',
    pink: '#fda4af',
    green: '#86efac',
    orange: '#fdba74',
  },
};

export const blueprintPlugin: PresentationPlugin = {
  id: 'blueprint',
  name: 'Blueprint',
  palette,
  fontFamily: BLUEPRINT_FONT,
  shadowColor: 'rgba(0, 0, 0, 0.28)',
  soundProfile: {
    baseFreqHz: 2900,
    velocityFreqBoostHz: 550,
    baseGain: 0.028,
  },
  drawSurface(ctx, width, height) {
    drawCachedSurface(ctx, 'blueprint', width, height, (c, w, h) => {
      paintRadialBackdrop(c, w, h, palette);

      const minor = 24;
      const major = 120;
      c.lineWidth = 1;

      c.strokeStyle = 'rgba(103, 232, 249, 0.07)';
      c.beginPath();
      for (let x = 0; x <= w; x += minor) {
        c.moveTo(x + 0.5, 0);
        c.lineTo(x + 0.5, h);
      }
      for (let y = 0; y <= h; y += minor) {
        c.moveTo(0, y + 0.5);
        c.lineTo(w, y + 0.5);
      }
      c.stroke();

      c.strokeStyle = 'rgba(103, 232, 249, 0.16)';
      c.beginPath();
      for (let x = 0; x <= w; x += major) {
        c.moveTo(x + 0.5, 0);
        c.lineTo(x + 0.5, h);
      }
      for (let y = 0; y <= h; y += major) {
        c.moveTo(0, y + 0.5);
        c.lineTo(w, y + 0.5);
      }
      c.stroke();

      const margin = Math.max(12, Math.round(Math.min(w, h) * 0.018));
      c.strokeStyle = 'rgba(186, 230, 253, 0.22)';
      c.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
    });
  },
  drawStroke(ctx, stroke, progress) {
    const colorHex = palette.colors[stroke.color] ?? palette.colors.white;
    drawSmoothLineStroke(ctx, stroke, progress, colorHex, { glow: true });
  },
  drawInstrument(ctx, colorHex) {
    // Blueprint drafting pencil anchored at (0, 0)
    ctx.fillStyle = '#e5c49f';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(18, -5);
    ctx.lineTo(18, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(6, -1.7);
    ctx.lineTo(6, 1.7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(18, -5, 68, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(18, -5, 68, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(18, 2, 68, 3);
  },
};
