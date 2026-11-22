import { HandPlugin } from '../contracts';

export const illustratedHandPlugin: HandPlugin = {
  id: 'hand-chalk',
  name: '手握画笔',
  draw({ ctx, screenX, screenY, presentation, colorHex, lift, alpha, penDown, velocity, tMs }) {
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    ctx.translate(screenX, screenY - lift * 0.8);

    const microSway = penDown
      ? Math.sin(tMs * 0.018) * 0.028 * Math.min(1.2, velocity)
      : 0;
    const angle = Math.PI * 0.22 + microSway;

    // Soft board shadow scaling cleanly with pen lift
    ctx.save();
    ctx.translate(4 + lift * 0.55, 6 + lift * 0.72);
    ctx.rotate(angle);
    ctx.fillStyle = presentation.shadowColor;
    ctx.beginPath();
    ctx.ellipse(38, 2, 46, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(angle);
    presentation.drawInstrument(ctx, colorHex);

    const skinBase = '#f4c7a5';
    const skinShadow = '#dfb08c';
    const outline = 'rgba(72, 46, 30, 0.42)';

    // Curled lower fingers behind the stick
    ctx.fillStyle = skinShadow;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(26, 4, 24, 16, 8);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(38, 11, 22, 14, 7);
    ctx.fill();
    ctx.stroke();

    // Palm / back of hand
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.moveTo(42, -14);
    ctx.bezierCurveTo(64, -22, 92, -16, 110, -4);
    ctx.lineTo(112, 24);
    ctx.bezierCurveTo(84, 30, 56, 24, 44, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Index finger resting along top of instrument
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.moveTo(20, -4.5);
    ctx.bezierCurveTo(26, -13, 46, -14, 62, -9);
    ctx.bezierCurveTo(65, -4, 58, 1, 44, 0.5);
    ctx.bezierCurveTo(32, 0.5, 22, -0.5, 20, -4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thumb pinching gently from the bottom-front
    ctx.fillStyle = '#f8d2b4';
    ctx.beginPath();
    ctx.moveTo(25, 2);
    ctx.bezierCurveTo(32, 0, 50, 4, 58, 11);
    ctx.bezierCurveTo(54, 18, 38, 16, 26, 10);
    ctx.bezierCurveTo(22, 7.5, 22, 3.5, 25, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Clean studio cuff sleeve fading out smoothly
    const sleeveGrad = ctx.createLinearGradient(96, 0, 155, 0);
    sleeveGrad.addColorStop(0, '#334155');
    sleeveGrad.addColorStop(1, 'rgba(51, 65, 85, 0)');
    ctx.fillStyle = sleeveGrad;
    ctx.beginPath();
    ctx.moveTo(98, -14);
    ctx.lineTo(156, -18);
    ctx.lineTo(158, 30);
    ctx.lineTo(98, 26);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },
};
