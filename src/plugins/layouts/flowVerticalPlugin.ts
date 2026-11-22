import { deriveTeachingSteps } from '../../model/scene';
import { graphScriptCodec } from '../codecs/scriptParser';
import { LayoutPlugin } from '../contracts';
import { computeDagreFlowLayout } from './dagreFlow';

export const flowVerticalPlugin: LayoutPlugin = {
  id: 'flow-vertical',
  name: 'Vertical Flow',
  category: 'diagram',
  icon: 'flow-tb',
  dragMode: 'offset',
  supportsEdges: true,
  textCodec: graphScriptCodec,
  deriveSteps: deriveTeachingSteps,
  compute(scene, helpers) {
    return computeDagreFlowLayout(scene, helpers, 'TB');
  },
};
