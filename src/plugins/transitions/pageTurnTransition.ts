import { easeInOutCubic } from '../cameras/helpers';
import { TransitionPlugin } from '../contracts';

export const pageTurnTransitionPlugin: TransitionPlugin = {
  id: 'page-turn',
  name: 'Page Turn',
  defaultDurationMs: 800,
  render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
    const u = easeInOutCubic(progress);
    const slideX = -width * u;
    const underShift = (1 - u) * Math.min(36, width * 0.04);

    // Subtle settle-in for the incoming page underneath
    ctx.save();
    ctx.globalAlpha = 0.72 + 0.28 * u;
    ctx.drawImage(toCanvas, underShift, 0, width, height);
    ctx.restore();

    // Soft cast shadow beside the receding page edge
    const edgeX = width + slideX;
    if (edgeX > 0 && edgeX < width) {
      const shadowW = Math.min(44, width * 0.05);
      const grad = ctx.createLinearGradient(edgeX, 0, edgeX + shadowW, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.34)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(edgeX, 0, shadowW, height);
    }

    // Outgoing page slides smoothly left off the stage
    ctx.drawImage(fromCanvas, slideX, 0, width, height);
  },
};
