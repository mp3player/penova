import { HandPlugin } from '../contracts';

export const tipOnlyHandPlugin: HandPlugin = {
  id: 'tip-only',
  name: 'Pen Only',
  draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha, penDown, velocity, tMs }) {
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    ctx.translate(screenX, screenY - lift * 0.8);

    const microSway = penDown
      ? Math.sin(tMs * 0.018) * 0.02 * Math.min(1.2, velocity)
      : 0;
    const angle = Math.PI * 0.22 + microSway;

    ctx.save();
    ctx.translate(4 + lift * 0.55, 6 + lift * 0.72);
    ctx.rotate(angle);
    ctx.fillStyle = presentation.shadowColor;
    ctx.beginPath();
    ctx.ellipse(38, 2, 46, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(angle);
    presentation.drawInstrument(ctx, colorHex);
    ctx.restore();
  },
};
