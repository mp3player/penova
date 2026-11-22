import { CameraPlugin } from '../contracts';
import { evaluateStepCamera } from './helpers';

export const autoFollowCameraPlugin: CameraPlugin = {
  id: 'auto-follow',
  name: 'Auto Follow',
  evaluate(ctx) {
    return evaluateStepCamera(ctx, {
      boundsMode: 'focus',
      padding: 84,
      maxZoom: 1.55,
    });
  },
};
