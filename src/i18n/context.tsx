import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  localizeCodecMeta,
  localizeExporterShort,
  localizePluginName,
  localizeTransitionShort,
  MessageKey,
  translate,
} from './messages';
import { Locale, LOCALE_STORAGE_KEY, LocalizedCodecMeta } from './types';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  pluginName: (id: string, fallback: string) => string;
  exporterShort: (id: string, fallback?: string) => string;
  transitionShort: (id: string, fallbackName: string) => string;
  codecMeta: (codec: {
    id: string;
    label: string;
    hintTitle: string;
    hintLines: string[];
  }) => LocalizedCodecMeta;
}

function readInitialLocale(): Locale {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'en';
  }
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'en' || saved === 'zh-CN') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return 'en';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // Ignore storage write errors
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.title = translate(locale, 'app.documentTitle');
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      pluginName: (id, fallback) => localizePluginName(locale, id, fallback),
      exporterShort: (id, fallback) =>
        localizeExporterShort(locale, id, fallback),
      transitionShort: (id, fallbackName) =>
        localizeTransitionShort(locale, id, fallbackName),
      codecMeta: (codec) => localizeCodecMeta(locale, codec),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback outside React provider (e.g., isolated component tests)
    return {
      locale: 'en',
      setLocale: () => {},
      t: (key, params) => translate('en', key, params),
      pluginName: (id, fallback) => localizePluginName('en', id, fallback),
      exporterShort: (id, fallback) =>
        localizeExporterShort('en', id, fallback),
      transitionShort: (id, fallbackName) =>
        localizeTransitionShort('en', id, fallbackName),
      codecMeta: (codec) => localizeCodecMeta('en', codec),
    };
  }
  return ctx;
}
