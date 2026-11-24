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
  label: 'Letter Paper',
  bgPrimary: '#fdf8ee',
  bgSecondary: '#f3e8d2',
  vignetteColor: 'rgba(128, 98, 62, 0.16)',
  subtitleColor: '#5c4d3c',
  labelPillBg: 'rgba(253, 248, 238, 0.96)',
  labelPillBorder: 'rgba(128, 98, 62, 0.24)',
  cardFillOpacity: 0.76,
  zoneFillOpacity: 0.05,
  cardFillColors: {
    white: '#fffdf7',
    yellow: '#fbf0d1',
    cyan: '#e4edf7',
    pink: '#f8e2e4',
    green: '#e3f0e8',
    orange: '#fae7d7',
  },
  cardShadow: {
    dx: 3,
    dy: 4,
    color: 'rgba(108, 82, 52, 0.09)',
  },
  preferNeutralCardTitle: true,
  subtitleBg: 'rgba(253, 248, 238, 0.94)',
  subtitleBorder: 'rgba(128, 98, 62, 0.26)',
  subtitleTextColor: '#1f2733',
  colors: {
    white: '#1f2733',
    yellow: '#916216',
    cyan: '#264c7d',
    pink: '#9e3039',
    green: '#255941',
    orange: '#a64d24',
  },
};

const PAPER_GRAIN_TILE_SIZE = 128;
let cachedPaperGrainTile: HTMLCanvasElement | null = null;

function getPaperGrainTile(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (cachedPaperGrainTile) return cachedPaperGrainTile;

  const tile = document.createElement('canvas');
  tile.width = PAPER_GRAIN_TILE_SIZE;
  tile.height = PAPER_GRAIN_TILE_SIZE;
  const tCtx = tile.getContext('2d');
  if (!tCtx) return null;

  const imgData = tCtx.createImageData(
    PAPER_GRAIN_TILE_SIZE,
    PAPER_GRAIN_TILE_SIZE
  );
  const data = imgData.data;
  for (let py = 0; py < PAPER_GRAIN_TILE_SIZE; py++) {
    for (let px = 0; px < PAPER_GRAIN_TILE_SIZE; px++) {
      const idx = (py * PAPER_GRAIN_TILE_SIZE + px) * 4;
      const n = (hash2D(px, py, 7919) & 255) / 255 - 0.5;
      if (n >= 0) {
        data[idx] = 255;
        data[idx + 1] = 252;
        data[idx + 2] = 244;
      } else {
        data[idx] = 138;
        data[idx + 1] = 108;
        data[idx + 2] = 68;
      }
      data[idx + 3] = Math.round(Math.abs(n) * 14);
    }
  }
  tCtx.putImageData(imgData, 0, 0);
  cachedPaperGrainTile = tile;
  return tile;
}

export const letterPaperPlugin: PresentationPlugin = {
  id: 'letter-paper',
  name: 'Letter Paper',
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

      // Fine warm cotton-paper fiber grain via tiled 128x128 offscreen noise pattern
      const grainTile = getPaperGrainTile();
      const pattern = grainTile ? c.createPattern(grainTile, 'repeat') : null;
      if (pattern) {
        c.fillStyle = pattern;
        c.fillRect(0, 0, w, h);
      }

      // Subtle ruled stationery horizontal lines (scales evenly across preview & 1080p export)
      const linePitch = Math.max(26, Math.round(Math.min(w, h) * 0.068));
      const firstRuleY = Math.round(h * 0.115);
      c.strokeStyle = 'rgba(150, 126, 94, 0.18)';
      c.lineWidth = Math.max(1, h / 650);
      c.beginPath();
      for (let y = firstRuleY; y < h - linePitch * 0.7; y += linePitch) {
        const crispY = Math.round(y) + 0.5;
        c.moveTo(0, crispY);
        c.lineTo(w, crispY);
      }
      c.stroke();

      // Delicate double top header rule
      const headerY = Math.round(firstRuleY - 4) + 0.5;
      c.strokeStyle = 'rgba(150, 126, 94, 0.15)';
      c.beginPath();
      c.moveTo(0, headerY);
      c.lineTo(w, headerY);
      c.stroke();

      // Classic double terracotta left margin lines
      const marginX = Math.max(34, Math.round(w * 0.082));
      c.strokeStyle = 'rgba(194, 96, 84, 0.24)';
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
