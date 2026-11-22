import { ThemeId } from '../../model/scene';
import { presentationRegistry } from '../../plugins/registry';

export {
  drawCachedSurface,
  paintRadialBackdrop,
  type SurfacePainter,
} from '../../sdk/surfaceCache';

export function drawSurfaceBackground(
  ctx: CanvasRenderingContext2D,
  theme: ThemeId,
  width: number,
  height: number
): void {
  presentationRegistry.getOrDefault(theme).drawSurface(ctx, width, height);
}
