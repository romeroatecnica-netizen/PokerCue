import {LOCALES_EAST} from './locales_east';
import {LOCALES_WEST} from './locales_west';
import {LangCode, SUPPORTED_LANGS, TranslationBundle} from './types';

export * from './types';

export const TRANSLATIONS: Record<LangCode, TranslationBundle> = {
  ...LOCALES_WEST,
  ...LOCALES_EAST,
};

const VALID_LANG_SET = new Set<string>(SUPPORTED_LANGS.map((l) => l.code));

export function isSupportedLang(value: string | null | undefined): value is LangCode {
  return Boolean(value && VALID_LANG_SET.has(value));
}

export function detectInitialLanguage(): LangCode {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get('lang')?.toLowerCase();
    if (isSupportedLang(queryLang)) {
      return queryLang;
    }

    try {
      const saved = window.localStorage.getItem('pokercue_lang');
      if (isSupportedLang(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }

    const navLangs =
      typeof navigator !== 'undefined'
        ? navigator.languages && navigator.languages.length > 0
          ? navigator.languages
          : [navigator.language]
        : [];

    for (const raw of navLangs) {
      if (!raw) continue;
      const primary = raw.toLowerCase().split('-')[0];
      if (isSupportedLang(primary)) {
        return primary;
      }
    }
  }
  return 'en';
}
