import { ChalkColor, ThemeId } from '../../model/scene';
import { ThemePalette } from '../../plugins/contracts';
import { presentationRegistry } from '../../plugins/registry';

export type { ThemePalette };

export function getThemePalette(theme: ThemeId): ThemePalette {
  return presentationRegistry.getOrDefault(theme).palette;
}

export function resolveColorHex(theme: ThemeId, color: ChalkColor): string {
  const palette = getThemePalette(theme);
  return palette.colors[color] ?? palette.colors.white;
}
