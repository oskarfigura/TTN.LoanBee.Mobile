import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useLocale } from '@/hooks/useLocale';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/FormPrimitives';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colours, layout, spacing } from '@/theme';
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
      <ScreenHeader title={t('settings.title')} variant="top-level" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.section} variant="accent" padding={layout.cardPadding}>
          <AppText variant="labelSm" tone="muted" style={styles.sectionLabel}>{t('settings.language')}</AppText>
          <SegmentedControl
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map(lang => ({ label: lang.label, value: lang.code }))}
          />
        </Card>

        <Card style={styles.section} padding={layout.cardPadding}>
          <AppText variant="labelSm" tone="muted" style={styles.sectionLabel}>{t('settings.defaultCurrency')}</AppText>
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </Card>

        <Card style={styles.section} padding={layout.cardPadding}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync('https://thetechnarrative.com/terms')}
          >
            <AppText variant="bodyMd" tone="accent">{t('settings.termsAndConditions')}</AppText>
            <AppText variant="title2" tone="muted">›</AppText>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync('https://thetechnarrative.com/privacy')}
          >
            <AppText variant="bodyMd" tone="accent">{t('settings.privacyPolicy')}</AppText>
            <AppText variant="title2" tone="muted">›</AppText>
          </TouchableOpacity>
        </Card>

        <AppText variant="helper" tone="muted" style={styles.version}>{t('settings.version')} {version}</AppText>
        <View style={styles.footer}>
          <AppText variant="helper" tone="muted" style={styles.footerText}>{t('settings.copyright')}</AppText>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync('https://thetechnarrative.com/terms')}
          >
            <AppText variant="labelSm" tone="accent">{t('settings.termsAndConditions').toUpperCase()}</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: layout.screenPadding, paddingBottom: 40 },
  section: { marginBottom: spacing.md },
  sectionLabel: {
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: colours.borderSoft,
    marginVertical: spacing.sm,
  },
  version: {
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: 12,
    gap: 8,
  },
  footerText: {
    textAlign: 'center',
  },
});
