import { useState, useCallback } from 'react';
import { getLocales } from 'expo-localization';
import i18n from '@/shared/lib/i18n';
import { storage } from '@/shared/lib/storage/mmkv';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { languageToCurrency } from '@/shared/domain/currency/defaults';

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
