import { CameraPlugin } from '../contracts';
import { fitBounds } from './helpers';

export const staticOverviewCameraPlugin: CameraPlugin = {
  id: 'static-overview',
  name: '固定全景',
  evaluate(ctx) {
    return fitBounds(ctx.fullBounds, ctx.viewportW, ctx.viewportH, 56, 0.22, 1.35);
  },
};
