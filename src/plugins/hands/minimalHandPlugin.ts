import { HandPlugin } from '../contracts';

export const minimalHandPlugin: HandPlugin = {
  id: 'hand-minimal',
  name: '极简线稿手',
  draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha, penDown, velocity, tMs }) {
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    ctx.translate(screenX, screenY - lift * 0.8);

    const microSway = penDown
      ? Math.sin(tMs * 0.018) * 0.022 * Math.min(1.2, velocity)
      : 0;
    const angle = Math.PI * 0.22 + microSway;

    // Subtle lift shadow
    ctx.save();
    ctx.translate(3 + lift * 0.45, 5 + lift * 0.65);
    ctx.rotate(angle);
    ctx.fillStyle = presentation.shadowColor;
    ctx.beginPath();
    ctx.ellipse(34, 2, 40, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(angle);
    presentation.drawInstrument(ctx, colorHex);

    // Translucent minimalist hand silhouette adapting to surface ink polarity
    const inkColor = presentation.palette.colors.white;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.moveTo(42, -13);
    ctx.bezierCurveTo(64, -20, 92, -14, 110, -4);
    ctx.lineTo(110, 22);
    ctx.bezierCurveTo(84, 28, 56, 22, 42, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= 0.68;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 1.6;

    // Back of hand contour
    ctx.beginPath();
    ctx.moveTo(42, -12);
    ctx.bezierCurveTo(64, -20, 92, -15, 112, -4);
    ctx.moveTo(112, 22);
    ctx.bezierCurveTo(84, 28, 56, 22, 44, 12);
    ctx.stroke();

    // Index finger & thumb minimal grip lines
    ctx.beginPath();
    ctx.moveTo(21, -4.5);
    ctx.bezierCurveTo(28, -12, 46, -13, 60, -8);
    ctx.moveTo(26, 3);
    ctx.bezierCurveTo(34, 1, 49, 5, 56, 11);
    ctx.bezierCurveTo(50, 17, 36, 15, 26, 9);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  },
};
