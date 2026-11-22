import { deriveTeachingSteps } from '../../model/scene';
import { graphScriptCodec } from '../codecs/scriptParser';
import { LayoutPlugin } from '../contracts';
import { computeDagreFlowLayout } from './dagreFlow';

export const flowHorizontalPlugin: LayoutPlugin = {
  id: 'flow-horizontal',
  name: '横向流程',
  category: 'diagram',
  icon: 'flow-lr',
  dragMode: 'offset',
  supportsEdges: true,
  textCodec: graphScriptCodec,
  deriveSteps: deriveTeachingSteps,
  compute(scene, helpers) {
    return computeDagreFlowLayout(scene, helpers, 'LR');
  },
};
