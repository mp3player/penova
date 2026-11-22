import { easeInOutCubic } from '../cameras/helpers';
import { TransitionPlugin } from '../contracts';

export const crossfadeTransitionPlugin: TransitionPlugin = {
  id: 'crossfade',
  name: '柔和淡化',
  defaultDurationMs: 650,
  render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
    const u = easeInOutCubic(progress);
    ctx.drawImage(fromCanvas, 0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = u;
    ctx.drawImage(toCanvas, 0, 0, width, height);
    ctx.restore();
  },
};
