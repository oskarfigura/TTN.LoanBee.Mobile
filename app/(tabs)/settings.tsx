import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useLocale } from '@/hooks/useLocale';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { Card } from '@/components/ui/Card';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { language, currency, setLanguage, setCurrency } = useLocale();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
          <View style={styles.toggleRow}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.toggleBtn, language === lang.code && styles.toggleBtnActive]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text style={[styles.toggleText, language === lang.code && styles.toggleTextActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings.defaultCurrency')}</Text>
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </Card>

        <Card style={styles.section}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync('https://thetechnarrative.com/terms')}
          >
            <Text style={styles.linkText}>{t('settings.termsAndConditions')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync('https://thetechnarrative.com/privacy')}
          >
            <Text style={styles.linkText}>{t('settings.privacyPolicy')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        <Text style={styles.version}>{t('settings.version')} {version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  header: {
    backgroundColor: colours.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.white,
  },
  container: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 16 },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colours.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    height: 44,
  },
  toggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colours.primary },
  toggleText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  toggleTextActive: { color: colours.white },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.primary,
  },
  chevron: {
    fontFamily: fonts.body,
    fontSize: fontSizes.lg,
    color: colours.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colours.border,
    marginVertical: 8,
  },
  version: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textAlign: 'center',
    paddingTop: 8,
  },
});
