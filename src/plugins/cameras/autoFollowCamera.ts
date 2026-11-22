import { CameraPlugin } from '../contracts';
import { evaluateStepCamera } from './helpers';

export const autoFollowCameraPlugin: CameraPlugin = {
  id: 'auto-follow',
  name: '智能聚焦',
  evaluate(ctx) {
    return evaluateStepCamera(ctx, {
      boundsMode: 'focus',
      padding: 84,
      maxZoom: 1.55,
    });
  },
};
