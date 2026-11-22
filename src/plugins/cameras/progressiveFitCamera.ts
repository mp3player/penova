import { CameraPlugin } from '../contracts';
import { evaluateStepCamera } from './helpers';

export const progressiveFitCameraPlugin: CameraPlugin = {
  id: 'progressive-fit',
  name: 'Progressive Fit',
  evaluate(ctx) {
    return evaluateStepCamera(ctx, {
      boundsMode: 'cumulative',
      padding: 62,
      maxZoom: 1.38,
    });
  },
};
