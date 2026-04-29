import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { storage } from '@/storage/mmkv';
import { STORAGE_KEYS } from '@/storage/keys';

import en from './locales/en.json';
import pl from './locales/pl.json';

const savedLanguage = storage.getString(STORAGE_KEYS.USER_LANGUAGE);
const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
const language = savedLanguage ?? deviceLocale;
const supportedLanguage = ['en', 'pl'].includes(language) ? language : 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, pl: { translation: pl } },
  lng: supportedLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
