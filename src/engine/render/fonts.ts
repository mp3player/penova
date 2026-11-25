import { LessonScene, SceneFontPreset } from '../../model/scene';

export interface SceneFontPresetOption {
  id: SceneFontPreset;
  labelEn: string;
  labelZh: string;
  fontFamily?: string;
  loadFamilies: string[];
}

export const SCENE_FONT_PRESETS: readonly SceneFontPresetOption[] = [
  {
    id: 'theme-default',
    labelEn: 'Theme Default',
    labelZh: '主题默认',
    loadFamilies: [],
  },
  {
    id: 'xiaolai',
    labelEn: 'Xiaolai Hand (CN)',
    labelZh: '小赖手绘 (推荐百搭)',
    fontFamily: "'Penova Xiaolai', 'Xiaolai', 'Segoe Print', cursive",
    loadFamilies: ['Penova Xiaolai'],
  },
  {
    id: 'marker',
    labelEn: 'LXGW Marker (Board)',
    labelZh: '霞鹜漫黑 (板书粗笔)',
    fontFamily: "'Penova Marker', 'LXGW Marker Gothic', 'Segoe Print', cursive",
    loadFamilies: ['Penova Marker'],
  },
  {
    id: 'kuaile',
    labelEn: 'ZCOOL KuaiLe (Playful)',
    labelZh: '站酷快乐 (圆润俏皮)',
    fontFamily: "'Penova KuaiLe', 'ZCOOL KuaiLe', cursive",
    loadFamilies: ['Penova KuaiLe'],
  },
  {
    id: 'longcang',
    labelEn: 'Long Cang (Brush)',
    labelZh: '龙藏手书 (毛笔随性)',
    fontFamily: "'Penova LongCang', 'Long Cang', cursive",
    loadFamilies: ['Penova LongCang'],
  },
  {
    id: 'blueprint-hand',
    labelEn: 'Architects + Xiaolai',
    labelZh: '建筑师手写 + 小赖',
    fontFamily:
      "'Penova Architects', 'Architects Daughter', 'Penova Xiaolai', 'Xiaolai', cursive",
    loadFamilies: ['Penova Architects', 'Penova Xiaolai'],
  },
  {
    id: 'wenkai',
    labelEn: 'LXGW WenKai (Classic)',
    labelZh: '霞鹜文楷 (经典楷书)',
    fontFamily: "'Penova WenKai', 'LXGW WenKai', 'KaiTi', serif",
    loadFamilies: ['Penova WenKai'],
  },
];

const FONT_PRESET_MAP = new Map<string, SceneFontPresetOption>(
  SCENE_FONT_PRESETS.map((p) => [p.id, p])
);

export function isSceneFontPreset(raw: string): raw is SceneFontPreset {
  return FONT_PRESET_MAP.has(raw);
}

export function getSceneFontPresetOption(
  preset: SceneFontPreset | undefined
): SceneFontPresetOption {
  return (
    (preset ? FONT_PRESET_MAP.get(preset) : undefined) ?? SCENE_FONT_PRESETS[0]
  );
}

export function resolveSceneFontFamily(
  scene: Pick<LessonScene, 'theme' | 'font'>,
  fallbackThemeFont: string
): string {
  const opt = getSceneFontPresetOption(scene.font);
  return opt.fontFamily ?? fallbackThemeFont;
}
