import { TransitionPlugin } from '../contracts';

export const cutTransitionPlugin: TransitionPlugin = {
  id: 'cut',
  name: '直接硬切',
  defaultDurationMs: 0,
  render({ ctx, width, height, progress, fromCanvas, toCanvas }) {
    ctx.drawImage(progress < 0.5 ? fromCanvas : toCanvas, 0, 0, width, height);
  },
};
