import { HandPlugin } from '../contracts';

export interface ImageHandOptions {
  id: string;
  name: string;
  imageSrc: string;
  tipAnchorX: number;
  tipAnchorY: number;
  scale?: number;
}

export function createImageHandPlugin(opts: ImageHandOptions): HandPlugin {
  let cachedImg: HTMLImageElement | null = null;
  let loaded = false;

  const ensureImage = (): HTMLImageElement | null => {
    if (typeof Image === 'undefined') return null;
    if (!cachedImg) {
      const img = new Image();
      img.onload = () => {
        loaded = true;
      };
      img.src = opts.imageSrc;
      cachedImg = img;
      if (img.complete && img.naturalWidth > 0) {
        loaded = true;
      }
    }
    return loaded && cachedImg.naturalWidth > 0 ? cachedImg : null;
  };

  const scale = opts.scale ?? 1;

  return {
    id: opts.id,
    name: opts.name,
    draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha }) {
      if (alpha <= 0.01) return;
      const img = ensureImage();
      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
      ctx.translate(screenX, screenY - lift * 0.8);

      if (img) {
        ctx.save();
        ctx.shadowColor = presentation.shadowColor;
        ctx.shadowOffsetX = 4 + lift * 0.55;
        ctx.shadowOffsetY = 6 + lift * 0.72;
        ctx.shadowBlur = 8 + lift * 0.4;
        ctx.drawImage(
          img,
          -opts.tipAnchorX * scale,
          -opts.tipAnchorY * scale,
          img.naturalWidth * scale,
          img.naturalHeight * scale
        );
        ctx.restore();
      } else {
        // Fallback instrument until external PNG finishes decoding
        ctx.rotate(Math.PI * 0.22);
        presentation.drawInstrument(ctx, colorHex);
      }

      ctx.restore();
    },
  };
}
