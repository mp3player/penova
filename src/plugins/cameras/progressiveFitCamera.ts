import { CameraPlugin } from '../contracts';
import { evaluateStepCamera } from './helpers';

export const progressiveFitCameraPlugin: CameraPlugin = {
  id: 'progressive-fit',
  name: '渐进全景',
  evaluate(ctx) {
    return evaluateStepCamera(ctx, {
      boundsMode: 'cumulative',
      padding: 62,
      maxZoom: 1.38,
    });
  },
};
