import { useState, useCallback } from 'react';
import { getLocales } from 'expo-localization';
import i18n from '@/i18n';
import { storage } from '@/storage/mmkv';
import { STORAGE_KEYS } from '@/storage/keys';
import { CurrencyCode } from '@/currency/currencies';
import { languageToCurrency } from '@/currency/defaults';

export const useLocale = () => {
  const [language, setLanguageState] = useState<string>(
    storage.getString(STORAGE_KEYS.USER_LANGUAGE) ?? getLocales()[0]?.languageCode ?? 'en'
  );

  const [currency, setCurrencyState] = useState<CurrencyCode>(
    (storage.getString(STORAGE_KEYS.USER_CURRENCY) as CurrencyCode | undefined) ??
      languageToCurrency(getLocales()[0]?.languageCode ?? 'en')
  );

  const setLanguage = useCallback((lang: string) => {
    storage.set(STORAGE_KEYS.USER_LANGUAGE, lang);
    i18n.changeLanguage(lang);
    setLanguageState(lang);
  }, []);

  const setCurrency = useCallback((curr: CurrencyCode) => {
    storage.set(STORAGE_KEYS.USER_CURRENCY, curr);
    setCurrencyState(curr);
  }, []);

  return { language, currency, setLanguage, setCurrency };
};
