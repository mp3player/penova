import { drawSmoothLineStroke } from '../../sdk/chalkBrush';
import {
  drawCachedSurface,
  paintRadialBackdrop,
} from '../../sdk/surfaceCache';
import { PresentationPlugin, ThemePalette } from '../contracts';

const BLUEPRINT_FONT =
  "'JetBrains Mono', 'SF Mono', 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif";

const palette: ThemePalette = {
  id: 'blueprint',
  label: 'Blueprint',
  bgPrimary: '#132f53',
  bgSecondary: '#0a1c35',
  vignetteColor: 'rgba(4, 11, 24, 0.54)',
  subtitleColor: '#b7dcf2',
  labelPillBg: 'rgba(11, 28, 52, 0.92)',
  labelPillBorder: 'rgba(116, 212, 247, 0.24)',
  cardFillOpacity: 0.16,
  zoneFillOpacity: 0.07,
  subtitleBg: 'rgba(9, 22, 42, 0.82)',
  subtitleBorder: 'rgba(116, 212, 247, 0.24)',
  subtitleTextColor: '#f2f7fc',
  colors: {
    white: '#f2f7fc',
    yellow: '#f4ca64',
    cyan: '#74d4f7',
    pink: '#f39aa7',
    green: '#7fd8a8',
    orange: '#f3a668',
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

      c.strokeStyle = 'rgba(116, 212, 247, 0.07)';
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

      c.strokeStyle = 'rgba(116, 212, 247, 0.16)';
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
      c.strokeStyle = 'rgba(186, 230, 253, 0.24)';
      c.strokeRect(margin + 0.5, margin + 0.5, w - margin * 2 - 1, h - margin * 2 - 1);
      c.strokeStyle = 'rgba(116, 212, 247, 0.12)';
      c.strokeRect(
        margin + 4.5,
        margin + 4.5,
        w - (margin + 4) * 2 - 1,
        h - (margin + 4) * 2 - 1
      );

      // Corner crosshair registration marks
      const tickArm = 8;
      const tickOffset = margin + 14;
      const corners = [
        [tickOffset, tickOffset],
        [w - tickOffset, tickOffset],
        [tickOffset, h - tickOffset],
        [w - tickOffset, h - tickOffset],
      ];
      c.strokeStyle = 'rgba(186, 230, 253, 0.28)';
      c.beginPath();
      for (const [cx, cy] of corners) {
        c.moveTo(cx - tickArm, cy + 0.5);
        c.lineTo(cx + tickArm, cy + 0.5);
        c.moveTo(cx + 0.5, cy - tickArm);
        c.lineTo(cx + 0.5, cy + tickArm);
      }
      c.stroke();

      const vig = c.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.36,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.74
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, palette.vignetteColor);
      c.fillStyle = vig;
      c.fillRect(0, 0, w, h);
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
