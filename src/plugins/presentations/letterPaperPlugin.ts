import { drawSmoothLineStroke } from '../../sdk/chalkBrush';
import { hash2D } from '../../sdk/random';
import {
  drawCachedSurface,
  paintRadialBackdrop,
} from '../../sdk/surfaceCache';
import { PresentationPlugin, ThemePalette } from '../contracts';

const LETTER_PAPER_FONT =
  "'KaiTi', 'STKaiti', 'FangSong', 'Segoe Script', 'Georgia', serif";

const palette: ThemePalette = {
  id: 'letter-paper',
  label: '信纸钢笔',
  bgPrimary: '#fcf6e8',
  bgSecondary: '#efe2c6',
  vignetteColor: 'rgba(138, 108, 68, 0.2)',
  subtitleColor: '#6b5742',
  labelPillBg: 'rgba(255, 250, 238, 0.94)',
  labelPillBorder: 'rgba(139, 107, 74, 0.28)',
  colors: {
    white: '#162033',
    yellow: '#8a5a00',
    cyan: '#1d409c',
    pink: '#a61b1b',
    green: '#145a2f',
    orange: '#9c3f08',
  },
};

export const letterPaperPlugin: PresentationPlugin = {
  id: 'letter-paper',
  name: '信纸钢笔',
  palette,
  fontFamily: LETTER_PAPER_FONT,
  shadowColor: 'rgba(68, 48, 24, 0.16)',
  soundProfile: {
    baseFreqHz: 1520,
    velocityFreqBoostHz: 320,
    baseGain: 0.022,
  },
  drawSurface(ctx, width, height) {
    drawCachedSurface(ctx, 'letter-paper', width, height, (c, w, h) => {
      paintRadialBackdrop(c, w, h, palette);

      // Fine warm cotton-paper fiber grain via isotropic avalanche hash
      const imgData = c.getImageData(0, 0, w, h);
      const data = imgData.data;
      const len = data.length;
      for (let i = 0; i < len; i += 4) {
        const px = (i >> 2) % w;
        const py = ((i >> 2) / w) | 0;
        const hash = hash2D(px, py, 7919);
        const delta = ((hash & 255) / 255 - 0.5) * 6.5;
        data[i] = Math.max(0, Math.min(255, data[i] + delta));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + delta - 0.5));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + delta - 1.2));
      }
      c.putImageData(imgData, 0, 0);

      // Subtle ruled stationery horizontal lines (scales evenly across preview & 1080p export)
      const linePitch = Math.max(26, Math.round(Math.min(w, h) * 0.068));
      const firstRuleY = Math.round(h * 0.115);
      c.strokeStyle = 'rgba(155, 130, 96, 0.2)';
      c.lineWidth = Math.max(1, h / 650);
      c.beginPath();
      for (let y = firstRuleY; y < h - linePitch * 0.7; y += linePitch) {
        const crispY = Math.round(y) + 0.5;
        c.moveTo(0, crispY);
        c.lineTo(w, crispY);
      }
      c.stroke();

      // Classic double terracotta left margin lines
      const marginX = Math.max(34, Math.round(w * 0.082));
      c.strokeStyle = 'rgba(196, 104, 94, 0.26)';
      c.lineWidth = Math.max(1, h / 650);
      c.beginPath();
      c.moveTo(marginX + 0.5, 0);
      c.lineTo(marginX + 0.5, h);
      c.moveTo(marginX + 4.5, 0);
      c.lineTo(marginX + 4.5, h);
      c.stroke();

      // Soft antique warm vignette
      const vig = c.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.38,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.76
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
    // Classic fountain pen anchored with nib tip at (0, 0)
    // Gold nib
    ctx.fillStyle = '#d7ad53';
    ctx.strokeStyle = '#8b651e';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(7, -3.2);
    ctx.lineTo(17, -4.6);
    ctx.lineTo(19, 0);
    ctx.lineTo(17, 4.6);
    ctx.lineTo(7, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ink slit + breather hole
    ctx.strokeStyle = '#2d2112';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0.8, 0);
    ctx.lineTo(11, 0);
    ctx.stroke();
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(11.5, 0, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Grip section + brass collar ring
    ctx.fillStyle = '#252b3b';
    ctx.fillRect(17, -4.7, 9, 9.4);
    ctx.fillStyle = '#d7ad53';
    ctx.fillRect(26, -5.4, 3.2, 10.8);

    // Deep lacquer barrel
    ctx.fillStyle = '#1d283f';
    ctx.beginPath();
    ctx.roundRect(29, -5.8, 62, 11.6, 3.5);
    ctx.fill();

    // Ink color accent band + glossy highlight
    ctx.fillStyle = colorHex;
    ctx.fillRect(42, -5.8, 4.5, 11.6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(32, -4.1, 54, 2.1);

    // Brass end cap
    ctx.fillStyle = '#d7ad53';
    ctx.fillRect(86, -5.2, 5, 10.4);
  },
};
