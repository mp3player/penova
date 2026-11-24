import { drawSmoothLineStroke } from '../../sdk/chalkBrush';
import {
  drawCachedSurface,
  paintRadialBackdrop,
} from '../../sdk/surfaceCache';
import { PresentationPlugin, ThemePalette } from '../contracts';

const WHITEBOARD_FONT =
  "'Segoe Print', 'KaiTi', 'STKaiti', 'LXGW WenKai', 'Microsoft YaHei', cursive";

const palette: ThemePalette = {
  id: 'whiteboard',
  label: 'Whiteboard',
  bgPrimary: '#faf9f5',
  bgSecondary: '#f2efe9',
  vignetteColor: 'rgba(120, 113, 108, 0.10)',
  subtitleColor: '#4b5563',
  labelPillBg: 'rgba(250, 249, 245, 0.96)',
  labelPillBorder: 'rgba(35, 38, 41, 0.14)',
  cardFillOpacity: 0.92,
  zoneFillOpacity: 0.055,
  cardFillColors: {
    white: '#ffffff',
    yellow: '#fef3c7',
    cyan: '#e0f2fe',
    pink: '#ffe4e6',
    green: '#dcfce7',
    orange: '#ffedd5',
  },
  cardShadow: {
    dx: 4,
    dy: 5,
    color: 'rgba(35, 38, 41, 0.08)',
  },
  preferNeutralCardTitle: true,
  subtitleBg: 'rgba(255, 254, 250, 0.93)',
  subtitleBorder: 'rgba(35, 38, 41, 0.15)',
  subtitleTextColor: '#1f2421',
  colors: {
    white: '#232629',
    yellow: '#b7791f',
    cyan: '#1d6fa5',
    pink: '#be3a68',
    green: '#2b7a57',
    orange: '#c85a28',
  },
};

export const whiteboardPlugin: PresentationPlugin = {
  id: 'whiteboard',
  name: 'Whiteboard',
  palette,
  fontFamily: WHITEBOARD_FONT,
  shadowColor: 'rgba(15, 23, 42, 0.14)',
  soundProfile: {
    baseFreqHz: 1750,
    velocityFreqBoostHz: 450,
    baseGain: 0.028,
  },
  drawSurface(ctx, width, height) {
    drawCachedSurface(ctx, 'whiteboard', width, height, (c, w, h) => {
      paintRadialBackdrop(c, w, h, palette);

      c.fillStyle = 'rgba(120, 113, 108, 0.18)';
      const pitch = 24;
      for (let y = pitch; y < h; y += pitch) {
        for (let x = pitch; x < w; x += pitch) {
          c.fillRect(x, y, 1.4, 1.4);
        }
      }

      const vig = c.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.4,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.78
      );
      vig.addColorStop(0, 'rgba(255,255,255,0)');
      vig.addColorStop(1, palette.vignetteColor);
      c.fillStyle = vig;
      c.fillRect(0, 0, w, h);
    });
  },
  drawStroke(ctx, stroke, progress) {
    const colorHex = palette.colors[stroke.color] ?? palette.colors.white;
    drawSmoothLineStroke(ctx, stroke, progress, colorHex);
  },
  drawInstrument(ctx, colorHex) {
    // Sleek dry-erase marker barrel anchored at (0, 0)
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.lineTo(9, -3.5);
    ctx.lineTo(14, -3.5);
    ctx.lineTo(14, 3.5);
    ctx.lineTo(9, 3.5);
    ctx.lineTo(0, 1.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colorHex;
    ctx.fillRect(14, -5.4, 10, 10.8);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(24, -6.2, 64, 12.4, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.fillRect(78, -6.2, 10, 12.4);
  },
};
