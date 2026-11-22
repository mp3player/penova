import { HandStyle, ThemeId } from '../../model/scene';
import { PresentationPlugin } from '../../plugins/contracts';
import { handRegistry, presentationRegistry } from '../../plugins/registry';

export interface WritingHandMotion {
  penDown?: boolean;
  velocity?: number;
  tMs?: number;
}

export function drawWritingHand(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  themeOrPlugin: ThemeId | PresentationPlugin,
  colorHex: string,
  lift: number,
  alpha: number,
  handStyle: HandStyle,
  motion: WritingHandMotion = {}
): void {
  const presentation =
    typeof themeOrPlugin === 'string'
      ? presentationRegistry.getOrDefault(themeOrPlugin)
      : themeOrPlugin;

  handRegistry.getOrDefault(handStyle).draw({
    ctx,
    screenX,
    screenY,
    presentation,
    colorHex,
    lift,
    alpha,
    penDown: motion.penDown ?? false,
    velocity: motion.velocity ?? 0,
    tMs: motion.tMs ?? 0,
  });
}
