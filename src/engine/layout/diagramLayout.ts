import '../../plugins';
import { LessonScene } from '../../model/scene';
import {
  ComputedLayout,
  GroupBox,
  PositionedSceneNode,
} from '../../plugins/contracts';
import { layoutRegistry, presentationRegistry } from '../../plugins/registry';
import { clipPointToNodeBorder } from '../../plugins/layouts/shared';
import {
  measureSceneNode,
  MeasureTextFn,
  positionGroupChildren,
} from './textMeasure';

export type { PositionedSceneNode, GroupBox, ComputedLayout };
export { clipPointToNodeBorder };

export function computeDiagramLayout(
  scene: LessonScene,
  measureFn?: MeasureTextFn
): ComputedLayout {
  const layoutPlugin = layoutRegistry.getOrDefault(scene.layoutMode);
  const presentation = presentationRegistry.getOrDefault(scene.theme);
  return layoutPlugin.compute(scene, {
    measureNode: (node) =>
      measureSceneNode(node, measureFn, undefined, presentation.fontFamily),
    positionGroupChildren,
  });
}
