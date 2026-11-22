export type Locale = 'en' | 'zh-CN';

export const LOCALE_STORAGE_KEY = 'penova-studio:locale';

export interface LocalizedCodecMeta {
  label: string;
  hintTitle: string;
  hintLines: string[];
}
