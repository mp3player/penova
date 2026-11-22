import { ThemeId } from '../../model/scene';
import { presentationRegistry } from '../../plugins/registry';
import { StrokePath } from '../../sdk/strokePath';

export {
  drawFallingDustParticles,
  drawPowderyStroke,
  drawSmoothLineStroke,
} from '../../sdk/chalkBrush';

export function drawStrokePath(
  ctx: CanvasRenderingContext2D,
  stroke: StrokePath,
  progress: number,
  theme: ThemeId
): void {
  presentationRegistry.getOrDefault(theme).drawStroke(ctx, stroke, progress);
}
