import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { CumulativeAreaChart, hasCumulativeChartData } from '@/shared/ui/charts/CumulativeAreaChart';
import { ChartHelpButton, ChartHelpDrawer, type ChartHelpContent } from '@/shared/ui/charts/ChartHelp';
import { LoanBreakdownDonut } from '@/shared/ui/charts/LoanBreakdownDonut';
import { OverpaymentsComparisonChart } from '@/shared/ui/charts/OverpaymentsComparisonChart';
import { RepaymentBarChart } from '@/shared/ui/charts/RepaymentBarChart';
import { AppText } from '@oskarfigura/ui-native';
import { Card } from '@oskarfigura/ui-native';
import { FinancialDisclaimer } from '@/shared/ui/components/FinancialDisclaimer';
import { SegmentedControl } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { LoanResult } from '@/shared/domain/results/loanResultRoute';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';
import { buildAmortisationCsv } from '@oskarfigura/amortisation';
import { AmortisationTable } from './AmortisationTable';
import { LoanSummaryOverview } from './LoanSummaryOverview';

type CalculationTab = 'summary' | 'charts' | 'schedule';
type FullscreenPreview = 'repayment' | 'breakdown' | 'cumulative' | 'overpayment' | 'schedule';
type ChartHelpId = 'repaymentProjection' | 'loanBreakdown' | 'cumulativePayments' | 'balanceComparison';

interface Props {
  result: LoanResult;
  startDate: string;
  currency: CurrencyCode;
  style?: StyleProp<ViewStyle>;
  onShare?: () => void;
  shareLabel?: string;
  shareIcon?: React.ReactNode;
  savedLoan?: SavedLoan;
  // No-overpayment remaining-balance series. Passed by callers only when the loan carries a
  // recurring overpayment; when present a with/without comparison card is shown in Charts.
  baselineRemainingArray?: number[];
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
  baselineRemainingArray,
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
  const [chartHelp, setChartHelp] = useState<ChartHelpId | null>(null);
  const isPreviewOpen = fullscreenPreview !== null;
  const scrollRef = useRef<ScrollView>(null);
  const principalAmount = result.amount - result.downPayment;
  // Single source of truth for the comparison: the baseline series, but only when it has
  // enough points to plot (the chart needs ≥2 yearly samples). Render sites narrow off this
  // one value rather than re-checking the raw prop.
  const overpaymentBaseline = baselineRemainingArray && baselineRemainingArray.length > 1
    ? baselineRemainingArray
    : undefined;
  // Short loans can't fill the cumulative chart; when it falls back to an empty state
  // the card should not look tappable or offer a fullscreen view.
  const cumulativeInteractive = hasCumulativeChartData(result.loanChartMonthlyArray.length);

  // A fresh calculation (e.g. after Edit -> recalculate) reuses this screen, so
  // reset the scroll to the top rather than leaving the user where they left off.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [result]);
  // Switching tabs swaps in a different-height panel, so reset to the top rather than
  // leaving the user scrolled partway down the previous tab. No-ops when this view does
  // not own its scroll (scrollRef is unset).
  const handleTabChange = useCallback((tab: CalculationTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);
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

  const openChartHelp = useCallback((helpId: ChartHelpId) => {
    setChartHelp(helpId);
  }, []);

  const closeChartHelp = useCallback(() => {
    setChartHelp(null);
  }, []);

  useEffect(() => (
    () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    }
  ), []);

  const tabStrip = (
    <SegmentedControl
      value={activeTab}
      onChange={handleTabChange}
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
    if (fullscreenPreview === 'overpayment') return t('overpayments.balanceChart');
    return t('results.amortisationTable');
  };

  const getChartHelpContent = (helpId: ChartHelpId): ChartHelpContent => {
    if (helpId === 'repaymentProjection') {
      return {
        title: t('chartHelp.repaymentProjectionTitle'),
        body: t('chartHelp.repaymentProjectionBody'),
      };
    }
    if (helpId === 'loanBreakdown') {
      return {
        title: t('chartHelp.loanBreakdownTitle'),
        body: t('chartHelp.loanBreakdownBody'),
      };
    }
    if (helpId === 'cumulativePayments') {
      return {
        title: t('chartHelp.cumulativePaymentsTitle'),
        body: t('chartHelp.cumulativePaymentsBody'),
      };
    }

    return {
      title: t('chartHelp.balanceComparisonTitle'),
      body: t('chartHelp.balanceComparisonBody'),
    };
  };

  const getFullscreenHelpId = (): ChartHelpId | null => {
    if (fullscreenPreview === 'repayment') return 'repaymentProjection';
    if (fullscreenPreview === 'breakdown') return 'loanBreakdown';
    if (fullscreenPreview === 'cumulative') return 'cumulativePayments';
    if (fullscreenPreview === 'overpayment') return 'balanceComparison';
    return null;
  };

  const renderChartHeader = (title: string, helpId: ChartHelpId, interactive = true) => (
    <View style={styles.chartHeader}>
      <AppText variant="title3" style={styles.chartTitle}>{title}</AppText>
      <View style={styles.chartActions}>
        <ChartHelpButton
          accessibilityLabel={t('chartHelp.open', { title })}
          onPress={() => openChartHelp(helpId)}
        />
        {interactive ? <Icon icon={IconName.Maximize01Icon} size={18} color={colours.primary} /> : null}
      </View>
    </View>
  );

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

    if (fullscreenPreview === 'overpayment' && overpaymentBaseline) {
      return (
        <OverpaymentsComparisonChart
          baselineRemaining={overpaymentBaseline}
          scenarioRemaining={result.loanChartRemainingArray}
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

  const fullscreenHelpId = getFullscreenHelpId();
  const chartHelpContent = chartHelp ? getChartHelpContent(chartHelp) : null;

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
              {renderChartHeader(t('results.repaymentBreakdown'), 'repaymentProjection')}
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
              {renderChartHeader(t('results.loanBreakdown'), 'loanBreakdown')}
              <LoanBreakdownDonut
                principal={principalAmount}
                totalInterest={result.totalInterestPaid}
                currency={currency}
              />
            </Card>
          </Pressable>
          <Pressable
            onPress={cumulativeInteractive ? () => openFullscreenPreview('cumulative') : undefined}
            disabled={!cumulativeInteractive}
            accessibilityRole="button"
            accessibilityLabel={`${t('results.cumulativePayments')} ${t('results.fullScreen')}`}
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard}>
              {renderChartHeader(t('results.cumulativePayments'), 'cumulativePayments', cumulativeInteractive)}
              <CumulativeAreaChart
                monthlyArray={result.loanChartMonthlyArray}
                interestArray={result.loanChartInterestArray}
                remainingArray={result.loanChartRemainingArray}
                currency={currency}
              />
            </Card>
          </Pressable>
          {overpaymentBaseline ? (
            <Pressable
              onPress={() => openFullscreenPreview('overpayment')}
              accessibilityRole="button"
              accessibilityLabel={`${t('overpayments.balanceChart')} ${t('results.fullScreen')}`}
              style={({ pressed }) => [pressed && styles.previewPressed]}
            >
              <Card style={styles.chartCard}>
                {renderChartHeader(t('overpayments.balanceChart'), 'balanceComparison')}
                <OverpaymentsComparisonChart
                  baselineRemaining={overpaymentBaseline}
                  scenarioRemaining={result.loanChartRemainingArray}
                  currency={currency}
                />
              </Card>
            </Pressable>
          ) : null}
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
                <Icon icon={IconName.Maximize01Icon} size={18} color={colours.primary} />
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
            {fullscreenHelpId ? (
              <ChartHelpButton
                accessibilityLabel={t('chartHelp.open', { title: getFullscreenTitle() })}
                onPress={() => openChartHelp(fullscreenHelpId)}
              />
            ) : null}
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
      <ChartHelpDrawer
        visible={chartHelp !== null}
        content={chartHelpContent}
        closeLabel={t('common.close')}
        onClose={closeChartHelp}
      />
    </>
  );

  if (ownsScroll) {
    // The tab strip is a fixed sibling ABOVE the scroll view, not a sticky header
    // inside it. React Native's `stickyHeaderIndices` translates the pinned header to
    // keep it at the top, but on the new architecture the touch target does not follow
    // that translation — so once the user scrolled, taps on the pinned tabs fell through
    // and the Summary/Charts/Schedule tabs became unresponsive. Rendering the tabs
    // outside the ScrollView keeps their hit-target stable (and removes the need for the
    // old zIndex/elevation overlap workaround, since the views no longer overlap).
    return (
      <View style={[styles.scroll, style]}>
        <View style={styles.fixedTabs}>{tabStrip}</View>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tabBody}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      {tabStrip}
      {tabBody}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {},
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['3xl'],
  },
  fixedTabs: {
    // Full-width pinned header above the scroll view. The horizontal padding matches the
    // scroll content's; the underline tab strip's own negative margin bleeds its bottom
    // border edge-to-edge, exactly as before — but the tabs are now always tappable.
    paddingHorizontal: layout.screenPadding,
    backgroundColor: colours.background,
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
  chartTitle: {
    flex: 1,
  },
  chartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
