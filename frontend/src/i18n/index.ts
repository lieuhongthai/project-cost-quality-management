import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
} as const;

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  // Japanese can be added later:
  // { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
