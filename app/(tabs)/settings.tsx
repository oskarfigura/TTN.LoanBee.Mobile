import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import { useLocale } from '@/shared/lib/hooks/useLocale';
import { CurrencyPicker } from '@/features/calculator/components/CurrencyPicker';
import { AppText } from '@oskarfigura/ui-native';
import { Card } from '@oskarfigura/ui-native';
import { ChoiceTabs } from '@/shared/ui/components/ChoiceTabs';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import {
  buildSavedLoansBackup,
  DataTransferError,
  parseSavedLoansBackup,
} from '@/shared/lib/storage/dataTransfer';
import { clearLastCrash, getLastCrash } from '@/shared/lib/services/diagnostics/crashLog';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
];

const SettingsCallout = ({
  title,
  body,
  icon,
  tone,
  onPress,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  tone: 'guide' | 'about' | 'contact';
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.callout}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
  >
    <View style={[
      styles.calloutIconTile,
      tone === 'guide'
        ? styles.calloutIconTileGuide
        : tone === 'contact'
          ? styles.calloutIconTileContact
          : styles.calloutIconTileAbout,
    ]}>
      {icon}
    </View>
    <View style={styles.calloutCopy}>
      <AppText variant="labelMd">{title}</AppText>
      <AppText variant="bodySm" tone="muted">{body}</AppText>
    </View>
    <View style={styles.calloutChevron}>
      <Icon icon={IconName.ChevronRightIcon} size={16} color={colours.textSecondary} strokeWidth={2} />
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ fromDashboard?: string }>();
  const { language, currency, setLanguage, setCurrency } = useLocale();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const openedFromDashboard = params.fromDashboard === '1';
  const [devActionCount, setDevActionCount] = useState(0);
  const [isTransferringData, setIsTransferringData] = useState(false);

  const loadVisualQaData = async () => {
    if (!__DEV__) return;

    const { seedVisualQaLoans } = await import('@/shared/lib/dev/visualQaSeed');
    const loans = seedVisualQaLoans();
    setDevActionCount(count => count + 1);
    Alert.alert(
      t('settings.devDataLoadedTitle'),
      t('settings.devDataLoadedMessage', { count: loans.length }),
      [
        {
          text: t('settings.devDataViewSaved'),
          onPress: () => router.push('/saved'),
        },
        { text: t('common.close') },
      ],
    );
  };

  const confirmLoadVisualQaData = () => {
    Alert.alert(
      t('settings.devDataTitle'),
      t('settings.devDataReplaceWarning'),
      [
        { text: t('common.close'), style: 'cancel' },
        { text: t('settings.devDataLoad'), onPress: loadVisualQaData },
      ],
    );
  };

  const clearSavedLoans = () => {
    savedLoansStorage.clear();
    setDevActionCount(count => count + 1);
    Alert.alert(t('settings.devDataClearedTitle'), t('settings.devDataClearedMessage'));
  };

  const handleExportData = async () => {
    if (isTransferringData) return;
    if (savedLoansStorage.getAll().length === 0) {
      Alert.alert(t('settings.dataExportEmptyTitle'), t('settings.dataExportEmptyMessage'));
      return;
    }
    setIsTransferringData(true);
    try {
      const json = buildSavedLoansBackup();
      const fileName = `loanbee-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File(Paths.cache, fileName);
      file.create({ intermediates: true, overwrite: true });
      file.write(json);

      try {
        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert(t('settings.dataExportErrorTitle'), t('settings.dataExportErrorMessage'));
          return;
        }
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: t('settings.dataExport'),
        });
      } finally {
        // The backup lives in the OS-managed cache; remove it once shared so copies
        // of the user's loan data don't linger on disk.
        try { file.delete(); } catch { /* best-effort cleanup */ }
      }
    } catch {
      Alert.alert(t('settings.dataExportErrorTitle'), t('settings.dataExportErrorMessage'));
    } finally {
      setIsTransferringData(false);
    }
  };

  const applyImport = (raw: string) => {
    let loans;
    try {
      loans = parseSavedLoansBackup(raw);
    } catch (error) {
      const code = error instanceof DataTransferError ? error.code : 'invalidShape';
      Alert.alert(t('settings.dataImportErrorTitle'), t(`settings.dataImportError_${code}`));
      return;
    }
    Alert.alert(
      t('settings.dataImportConfirmTitle'),
      t('settings.dataImportConfirmMessage', { count: loans.length }),
      [
        { text: t('common.close'), style: 'cancel' },
        {
          text: t('settings.dataImportConfirm'),
          style: 'destructive',
          onPress: () => {
            const imported = savedLoansStorage.importAll(loans);
            Alert.alert(
              t('settings.dataImportSuccessTitle'),
              t('settings.dataImportSuccessMessage', { count: imported.length }),
            );
          },
        },
      ],
    );
  };

  const handleImportData = async () => {
    if (isTransferringData) return;
    setIsTransferringData(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const raw = await new File(result.assets[0].uri).text();
      applyImport(raw);
    } catch {
      Alert.alert(t('settings.dataImportErrorTitle'), t('settings.dataImportError_invalidShape'));
    } finally {
      setIsTransferringData(false);
    }
  };

  const viewLastCrash = () => {
    const crash = getLastCrash();
    if (!crash) {
      Alert.alert(t('settings.devCrashTitle'), t('settings.devCrashNone'));
      return;
    }
    const detail = `${crash.timestamp}\n[${crash.context}${crash.fatal ? ', fatal' : ''}]\n\n${crash.message}`;
    Alert.alert(t('settings.devCrashTitle'), detail, [
      {
        text: t('settings.devCrashClear'),
        style: 'destructive',
        onPress: () => {
          clearLastCrash();
          setDevActionCount(count => count + 1);
        },
      },
      { text: t('common.close') },
    ]);
  };

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t('settings.title')}
        variant="top-level"
        leftAction={openedFromDashboard ? (
          <HeaderBackAction onPress={() => router.replace('/')} />
        ) : undefined}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.section} padding={layout.cardPadding}>
          <AppText variant="labelSm" tone="muted" style={styles.sectionLabel}>{t('settings.language')}</AppText>
          <ChoiceTabs
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map(lang => ({ label: lang.label, value: lang.code }))}
          />
        </Card>

        <Card style={styles.section} padding={layout.cardPadding}>
          <AppText variant="labelSm" tone="muted" style={styles.sectionLabel}>{t('settings.defaultCurrency')}</AppText>
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </Card>

        <Card style={styles.section} padding={0}>
          <SettingsCallout
            title={t('guide.settingsEntry')}
            body={t('settings.howItWorksBody')}
            tone="guide"
            icon={<Icon icon={IconName.RouteIcon} size={20} color={colours.primary} strokeWidth={2} />}
            onPress={() => router.push('/guide')}
          />
          <View style={styles.calloutDivider} />
          <SettingsCallout
            title={t('settings.about')}
            body={t('settings.aboutBody')}
            tone="about"
            icon={<Icon icon={IconName.InfoCircleIcon} size={20} color={colours.tealDeep} strokeWidth={2} />}
            onPress={() => router.push('/about')}
          />
          <View style={styles.calloutDivider} />
          <SettingsCallout
            title={t('settings.contact')}
            body={t('settings.contactBody')}
            tone="contact"
            icon={<Icon icon={IconName.MailIcon} size={20} color={colours.primary} strokeWidth={2} />}
            onPress={() => router.push('/contact')}
          />
        </Card>

        <Card style={styles.section} padding={layout.cardPadding}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync('https://www.loanamortisationcalculator.com/terms-conditions')}
          >
            <AppText variant="bodyMd" tone="accent">{t('settings.termsAndConditions')}</AppText>
            <AppText variant="title2" tone="muted">›</AppText>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync('https://www.loanamortisationcalculator.com/privacy-policy')}
          >
            <AppText variant="bodyMd" tone="accent">{t('settings.privacyPolicy')}</AppText>
            <AppText variant="title2" tone="muted">›</AppText>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section} padding={layout.cardPadding}>
          <AppText variant="labelSm" tone="muted" style={styles.sectionLabel}>
            {t('settings.dataTitle')}
          </AppText>
          <AppText variant="bodySm" tone="muted" style={styles.devHelp}>
            {t('settings.dataHelp')}
          </AppText>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={handleExportData}
            disabled={isTransferringData}
          >
            <AppText variant="bodyMd" tone="accent">{t('settings.dataExport')}</AppText>
            <AppText variant="title2" tone="muted">›</AppText>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={handleImportData}
            disabled={isTransferringData}
          >
            <AppText variant="bodyMd" tone="accent">{t('settings.dataImport')}</AppText>
            <AppText variant="title2" tone="muted">›</AppText>
          </TouchableOpacity>
        </Card>

        {__DEV__ ? (
          <Card style={styles.section} padding={layout.cardPadding}>
            <AppText variant="labelSm" tone="muted" style={styles.sectionLabel}>
              {t('settings.devDataTitle')}
            </AppText>
            <AppText variant="bodySm" tone="muted" style={styles.devHelp}>
              {t('settings.devDataHelp')}
            </AppText>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={confirmLoadVisualQaData}
            >
              <AppText variant="bodyMd" tone="accent">{t('settings.devDataLoad')}</AppText>
              <AppText variant="title2" tone="muted">›</AppText>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={clearSavedLoans}
            >
              <AppText variant="bodyMd" tone="accent">{t('settings.devDataClear')}</AppText>
              <AppText variant="title2" tone="muted">›</AppText>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={viewLastCrash}
            >
              <AppText variant="bodyMd" tone="accent">{t('settings.devCrashView')}</AppText>
              <AppText variant="title2" tone="muted">›</AppText>
            </TouchableOpacity>
            {devActionCount > 0 ? (
              <AppText variant="helper" tone="muted" style={styles.devStatus}>
                {t('settings.devDataUpdated')}
              </AppText>
            ) : null}
          </Card>
        ) : null}

        <AppText variant="helper" tone="muted" style={styles.version}>{t('settings.version')} {version}</AppText>
        <View style={styles.footer}>
          <AppText variant="helper" tone="muted" style={styles.footerText}>{t('settings.copyright')}</AppText>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync('https://www.loanamortisationcalculator.com/terms-conditions')}
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
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.md,
  },
  calloutIconTile: {
    width: 42,
    height: 42,
    borderRadius: radii.status,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  calloutIconTileGuide: {
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceMuted,
  },
  calloutIconTileAbout: {
    borderColor: colours.secondarySoft,
    backgroundColor: colours.successSurface,
  },
  calloutIconTileContact: {
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceMuted,
  },
  calloutCopy: {
    flex: 1,
    gap: spacing.xxxs,
  },
  calloutChevron: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceMuted,
  },
  calloutDivider: {
    height: 1,
    marginLeft: layout.cardPadding + 42 + spacing.md,
    backgroundColor: colours.border,
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
  devHelp: {
    marginBottom: spacing.sm,
  },
  devStatus: {
    marginTop: spacing.xs,
  },
});
