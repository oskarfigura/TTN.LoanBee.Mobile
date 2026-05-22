import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
import { LoanBreakdownDonut } from '@/components/charts/LoanBreakdownDonut';
import { RepaymentBarChart } from '@/components/charts/RepaymentBarChart';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { SegmentedControl } from '@/components/ui/FormPrimitives';
import { CurrencyCode } from '@/currency/currencies';
import { LoanResult } from '@/results/loanResultRoute';
import { colours, layout, radii, spacing } from '@/theme';
import { SavedLoan } from '@/types/SavedLoan';
import { AmortisationTable } from './AmortisationTable';
import { buildAmortisationCsv } from './amortisationTableUtils';
import { LoanSummaryOverview } from './LoanSummaryOverview';

type CalculationTab = 'summary' | 'charts' | 'schedule';
type FullscreenPreview = 'repayment' | 'breakdown' | 'cumulative' | 'schedule';

interface Props {
  result: LoanResult;
  startDate: string;
  currency: CurrencyCode;
  style?: StyleProp<ViewStyle>;
  onShare?: () => void;
  shareLabel?: string;
  shareIcon?: React.ReactNode;
  savedLoan?: SavedLoan;
  summaryContent?: React.ReactNode;
  tabStyle?: 'segmented' | 'underline';
  showFinancialDisclaimer?: boolean;
  ownsScroll?: boolean;
  scrollContentStyle?: StyleProp<ViewStyle>;
}

export const LoanCalculationView = ({
  result,
  startDate,
  currency,
  style,
  onShare,
  shareLabel,
  shareIcon,
  savedLoan,
  summaryContent,
  tabStyle = 'segmented',
  showFinancialDisclaimer = false,
  ownsScroll = false,
  scrollContentStyle,
}: Props) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<CalculationTab>('summary');
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState<FullscreenPreview | null>(null);
  const isPreviewOpen = fullscreenPreview !== null;
  const principalAmount = result.amount - result.downPayment;
  const tabs: Array<{ value: CalculationTab; label: string }> = [
    { value: 'summary', label: t('results.summary') },
    { value: 'charts', label: t('results.charts') },
    { value: 'schedule', label: t('results.schedule') },
  ];

  const handleExportCsv = useCallback(async () => {
    if (isExportingCsv) return;

    setIsExportingCsv(true);

    try {
      const csvContent = buildAmortisationCsv({
        items: result.tableItems,
        startDate,
        language: i18n.language,
        headers: {
          period: t('results.period'),
          openingBalance: t('results.openingBalance'),
          principal: t('results.principal'),
          interest: t('results.interest'),
          closingBalance: t('results.closingBalance'),
        },
      });

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        await Share.share({
          title: t('results.exportCsv'),
          message: csvContent,
        });
        return;
      }

      const fileName = `loanbee-amortisation-${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new File(Paths.cache, fileName);

      file.create({ intermediates: true, overwrite: true });
      file.write(csvContent);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: t('results.exportCsv'),
      });
    } catch {
      Alert.alert(t('results.exportErrorTitle'), t('results.exportErrorMessage'));
    } finally {
      setIsExportingCsv(false);
    }
  }, [i18n.language, isExportingCsv, result.tableItems, startDate, t]);

  const openFullscreenPreview = useCallback((preview: FullscreenPreview) => {
    setFullscreenPreview(preview);
    ScreenOrientation.unlockAsync().catch(() => undefined);
  }, []);

  const closeFullscreenPreview = useCallback(() => {
    setFullscreenPreview(null);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);

  useEffect(() => (
    () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    }
  ), []);

  const tabStrip = (
    <SegmentedControl
      value={activeTab}
      onChange={setActiveTab}
      options={tabs}
      variant={tabStyle === 'underline' ? 'underline' : 'primary'}
      textVariant={tabStyle === 'underline' ? 'labelMd' : 'labelSm'}
      style={[styles.tabControl, tabStyle === 'underline' && styles.underlineTabControl]}
    />
  );

  const getFullscreenTitle = () => {
    if (fullscreenPreview === 'repayment') return t('results.repaymentBreakdown');
    if (fullscreenPreview === 'breakdown') return t('results.loanBreakdown');
    if (fullscreenPreview === 'cumulative') return t('results.cumulativePayments');
    return t('results.amortisationTable');
  };

  const renderFullscreenPreview = () => {
    if (fullscreenPreview === 'repayment') {
      return (
        <RepaymentBarChart
          monthlyArray={result.loanChartMonthlyArray}
          interestArray={result.loanChartInterestArray}
          currency={currency}
          height={320}
        />
      );
    }

    if (fullscreenPreview === 'breakdown') {
      return (
        <LoanBreakdownDonut
          principal={principalAmount}
          totalInterest={result.totalInterestPaid}
          currency={currency}
          radius={118}
        />
      );
    }

    if (fullscreenPreview === 'cumulative') {
      return (
        <CumulativeAreaChart
          monthlyArray={result.loanChartMonthlyArray}
          interestArray={result.loanChartInterestArray}
          remainingArray={result.loanChartRemainingArray}
          currency={currency}
          height={320}
        />
      );
    }

    if (fullscreenPreview === 'schedule') {
      return (
        <AmortisationTable
          items={result.tableItems}
          startDate={startDate}
          currency={currency}
        />
      );
    }

    return null;
  };

  const tabBody = (
    <>
      {showFinancialDisclaimer ? (
        <FinancialDisclaimer dismissible style={styles.financialDisclaimer} />
      ) : null}

      {activeTab === 'summary' && (
        <View style={[styles.tabPanel, tabStyle === 'underline' && styles.underlineTabPanel]}>
          {summaryContent ?? (
            <LoanSummaryOverview
              result={result}
              startDate={startDate}
              currency={currency}
              mode={savedLoan ? 'saved' : 'calculation'}
              savedLoan={savedLoan}
              onShare={onShare}
              shareLabel={shareLabel}
              shareIcon={shareIcon}
            />
          )}
        </View>
      )}

      {activeTab === 'charts' && (
        <View style={[styles.tabPanel, tabStyle === 'underline' && styles.underlineTabPanel]}>
          <Pressable
            onPress={() => openFullscreenPreview('repayment')}
            accessibilityRole="button"
            accessibilityLabel={`${t('results.repaymentBreakdown')} ${t('results.fullScreen')}`}
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <AppText variant="title3">{t('results.repaymentBreakdown')}</AppText>
                <FullscreenIcon />
              </View>
              <RepaymentBarChart
                monthlyArray={result.loanChartMonthlyArray}
                interestArray={result.loanChartInterestArray}
                currency={currency}
              />
            </Card>
          </Pressable>
          <Pressable
            onPress={() => openFullscreenPreview('breakdown')}
            accessibilityRole="button"
            accessibilityLabel={`${t('results.loanBreakdown')} ${t('results.fullScreen')}`}
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <AppText variant="title3">{t('results.loanBreakdown')}</AppText>
                <FullscreenIcon />
              </View>
              <LoanBreakdownDonut
                principal={principalAmount}
                totalInterest={result.totalInterestPaid}
                currency={currency}
              />
            </Card>
          </Pressable>
          <Pressable
            onPress={() => openFullscreenPreview('cumulative')}
            accessibilityRole="button"
            accessibilityLabel={`${t('results.cumulativePayments')} ${t('results.fullScreen')}`}
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <AppText variant="title3">{t('results.cumulativePayments')}</AppText>
                <FullscreenIcon />
              </View>
              <CumulativeAreaChart
                monthlyArray={result.loanChartMonthlyArray}
                interestArray={result.loanChartInterestArray}
                remainingArray={result.loanChartRemainingArray}
                currency={currency}
              />
            </Card>
          </Pressable>
        </View>
      )}

      {activeTab === 'schedule' && (
        <Card style={[styles.chartCard, styles.scheduleCard, tabStyle === 'underline' && styles.underlineTabPanel]}>
          <View style={[styles.chartHeader, styles.scheduleHeader]}>
            <AppText variant="title3" style={styles.scheduleTitle}>{t('results.amortisationTable')}</AppText>
            <View style={styles.scheduleActions}>
              <TouchableOpacity
                style={[styles.exportButton, isExportingCsv && styles.exportButtonDisabled]}
                onPress={handleExportCsv}
                disabled={isExportingCsv}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <AppText variant="labelSm" tone="accent" style={styles.actionButtonText}>
                  {isExportingCsv ? t('results.exportingCsv') : t('results.exportCsv')}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={() => openFullscreenPreview('schedule')}
                accessibilityRole="button"
                accessibilityLabel={t('results.fullScreen')}
                activeOpacity={0.8}
              >
                <FullscreenIcon />
              </TouchableOpacity>
            </View>
          </View>
          <AmortisationTable
            items={result.tableItems}
            startDate={startDate}
            currency={currency}
          />
        </Card>
      )}

      <Modal
        visible={isPreviewOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={closeFullscreenPreview}
      >
        <SafeAreaView style={styles.fullscreenSafe} edges={['top', 'bottom']}>
          <View style={styles.fullscreenHeader}>
            <AppText variant="title3" style={styles.scheduleTitle}>{getFullscreenTitle()}</AppText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeFullscreenPreview}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <AppText variant="labelSm" tone="accent" style={styles.actionButtonText}>
                {t('common.close')}
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.fullscreenBody}
            contentContainerStyle={styles.fullscreenContent}
            showsVerticalScrollIndicator={false}
          >
            {renderFullscreenPreview()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );

  if (ownsScroll) {
    return (
      <ScrollView
        style={[styles.scroll, style]}
        contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stickyTabs}>{tabStrip}</View>
        {tabBody}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, style]}>
      {tabStrip}
      {tabBody}
    </View>
  );
};

const FullscreenIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 10L21 3M21 3H16.5M21 3V7.5M10 14L3 21M3 21H7.5M3 21L3 16.5"
      stroke={colours.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const styles = StyleSheet.create({
  root: {},
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['3xl'],
  },
  stickyTabs: {
    marginHorizontal: -layout.screenPadding,
    backgroundColor: colours.background,
    zIndex: 2,
    elevation: 2,
  },
  tabControl: { marginBottom: spacing.sm },
  underlineTabControl: {
    marginHorizontal: -layout.screenPadding,
    marginBottom: 0,
  },
  financialDisclaimer: {
    marginTop: spacing.sm,
  },
  underlineTabPanel: {
    marginTop: spacing.sm,
  },
  tabPanel: {
    marginTop: 2,
  },
  chartCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
  },
  chartHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  previewPressed: {
    opacity: 0.84,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleTitle: {
    flex: 1,
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  fullscreenButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
  },
  actionButtonText: {
    textTransform: 'uppercase',
  },
  scheduleCard: {
    paddingBottom: 8,
  },
  fullscreenSafe: {
    flex: 1,
    backgroundColor: colours.background,
  },
  fullscreenHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.background,
  },
  closeButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  fullscreenBody: {
    flex: 1,
  },
  fullscreenContent: {
    padding: layout.screenPadding,
    paddingBottom: spacing['2xl'],
  },
});
