import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ResultsSummary } from '@/components/calculator/ResultsSummary';
import { AmortisationTable } from '@/components/calculator/AmortisationTable';
import { buildAmortisationCsv } from '@/components/calculator/amortisationTableUtils';
import { RepaymentBarChart } from '@/components/charts/RepaymentBarChart';
import { LoanBreakdownDonut } from '@/components/charts/LoanBreakdownDonut';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { BannerAd } from '@/ads/BannerAd';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { CurrencyCode } from '@/currency/currencies';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedLoan } from '@/types/SavedLoan';
import {
  LoanResult,
  getResultForSavedLoan,
} from '@/results/loanResultRoute';
import { savedLoansStorage } from '@/storage/savedLoans';
import { setResultLeaveGuard } from '@/navigation/resultLeaveGuard';
import { useStoreReview } from '@/review';
import { formatCurrency } from '@/currency/format';
import { getCalculationWebShareUrl, ShareableCalculationValues } from '@/share/calculationShareLink';
import { UnsavedResultModal } from '@/components/results/UnsavedResultModal';
import { EditIcon } from '@/components/loans/LoanIcons';

type ResultTab = 'summary' | 'charts' | 'schedule';

type ResultParams = {
  result?: string;
  formValues?: string;
  currency?: string;
  mode?: string;
  savedLoan?: string;
  savedLoanId?: string;
};

const parseJson = <T,>(value?: string): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const ShareIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.6 10.8l6.8-3.6M8.6 13.2l6.8 3.6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={6} cy={12} r={2.5} stroke={color} strokeWidth={2} />
    <Circle cx={18} cy={6} r={2.5} stroke={color} strokeWidth={2} />
    <Circle cx={18} cy={18} r={2.5} stroke={color} strokeWidth={2} />
  </Svg>
);

export default function ResultScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<ResultParams>();
  const allowLeaveRef = useRef(false);
  const pendingLeaveRef = useRef<(() => void) | null>(null);
  const recordedReviewActionRef = useRef(false);
  const { recordUsefulAction, requestReview } = useStoreReview();

  const savedLoan = useMemo(() => {
    const fromParams = parseJson<SavedLoan>(params.savedLoan);
    if (fromParams) return fromParams;
    return params.savedLoanId ? savedLoansStorage.getById(params.savedLoanId) ?? null : null;
  }, [params.savedLoan, params.savedLoanId]);
  const isSavedMode = params.mode === 'saved' && savedLoan !== null;

  const result = useMemo(() => {
    if (savedLoan) return getResultForSavedLoan(savedLoan);
    return parseJson<LoanResult>(params.result);
  }, [params.result, savedLoan]);
  const formValues = useMemo(() => (
    savedLoan?.formSnapshot ?? parseJson<Record<string, unknown>>(params.formValues)
  ), [params.formValues, savedLoan]);
  const currency = ((savedLoan?.currency ?? params.currency) as CurrencyCode | undefined) ?? 'GBP';
  const [activeTab, setActiveTab] = useState<ResultTab>('summary');
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  useEffect(() => {
    if (isSavedMode || !result || recordedReviewActionRef.current) return;

    recordedReviewActionRef.current = true;
    recordUsefulAction()
      .then(() => requestReview())
      .catch(() => undefined);
  }, [isSavedMode, recordUsefulAction, requestReview, result]);

  const continueWithoutGuard = useCallback((continueNavigation: () => void) => {
    allowLeaveRef.current = true;
    setResultLeaveGuard(null);
    continueNavigation();
    setTimeout(() => {
      allowLeaveRef.current = false;
    }, 0);
  }, []);

  const openSave = useCallback(() => {
    if (!result || !formValues) return;

    router.push({
      pathname: '/saved/new',
      params: {
        result: params.result ?? JSON.stringify(result),
        formValues: params.formValues ?? JSON.stringify(formValues),
        currency,
        returnToResult: '1',
      },
    });
  }, [currency, formValues, params.formValues, params.result, result, router]);

  const handleShare = useCallback(async () => {
    if (!result || !formValues) return;

    const shareValues = {
      ...(formValues as Partial<ShareableCalculationValues>),
      currency,
    } as ShareableCalculationValues;
    const shareUrl = getCalculationWebShareUrl(shareValues);
    const monthlyPayment = formatCurrency(result.monthlyPayments, currency);
    const totalInterest = formatCurrency(result.totalInterestPaid, currency);
    const totalCost = formatCurrency(result.totalAmountPaid, currency);

    try {
      await Share.share({
        title: t('share.title'),
        message: [
          t('share.intro'),
          '',
          t('share.monthlyPayment', { amount: monthlyPayment }),
          t('share.totalInterest', { amount: totalInterest }),
          t('share.totalCost', { amount: totalCost }),
          '',
          t('share.viewCalculation'),
          shareUrl,
        ].join('\n'),
        url: shareUrl,
      });
    } catch {
      Alert.alert(t('share.errorTitle'), t('share.errorMessage'));
    }
  }, [currency, formValues, result, t]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleExportCsv = useCallback(async () => {
    if (!result || !formValues || isExportingCsv) return;

    setIsExportingCsv(true);

    try {
      const csvContent = buildAmortisationCsv({
        items: result.tableItems,
        startDate: String(formValues.startDate),
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

      const exportsDirectory = Paths.cache;
      const fileName = `loanbee-amortisation-${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new File(exportsDirectory, fileName);

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
  }, [formValues, i18n.language, isExportingCsv, result, t]);

  const confirmLeave = useCallback((continueNavigation: () => void) => {
    pendingLeaveRef.current = continueNavigation;
    setShowUnsavedModal(true);
  }, []);

  const keepEditing = useCallback(() => {
    pendingLeaveRef.current = null;
    setShowUnsavedModal(false);
  }, []);

  const saveBeforeLeaving = useCallback(() => {
    pendingLeaveRef.current = null;
    setShowUnsavedModal(false);
    openSave();
  }, [openSave]);

  const discardAndLeave = useCallback(() => {
    const pending = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setShowUnsavedModal(false);
    if (pending) {
      continueWithoutGuard(pending);
    }
  }, [continueWithoutGuard]);

  useFocusEffect(
    useCallback(() => {
      if (isSavedMode) return undefined;
      setResultLeaveGuard(confirmLeave);
      return () => setResultLeaveGuard(null);
    }, [confirmLeave, isSavedMode]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (isSavedMode || allowLeaveRef.current) return;

      event.preventDefault();
      confirmLeave(() => {
        continueWithoutGuard(() => navigation.dispatch(event.data.action));
      });
    });

    return unsubscribe;
  }, [confirmLeave, continueWithoutGuard, isSavedMode, navigation]);

  if (!result || !formValues) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('results.notFound')}</Text>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const principalAmount = result.amount - result.downPayment;
  const tabs: Array<{ key: ResultTab; label: string }> = [
    { key: 'summary', label: t('results.summary') },
    { key: 'charts', label: t('results.charts') },
    { key: 'schedule', label: t('results.schedule') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('results.title')}
        subtitle={savedLoan ? undefined : t('results.unsavedSubtitle')}
        leftAction={<HeaderBackAction onPress={handleBack} />}
        rightAction={!isSavedMode ? (
          <TouchableOpacity
            style={styles.headerSaveButton}
            onPress={openSave}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Text style={styles.headerSaveText}>{t('results.save')}</Text>
          </TouchableOpacity>
        ) : savedLoan ? (
          <TouchableOpacity
            style={styles.headerEditButton}
            onPress={() => router.push(`/saved/${savedLoan.id}/edit`)}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <EditIcon color={colours.primary} />
          </TouchableOpacity>
        ) : undefined}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <FinancialDisclaimer />

        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'summary' && (
          <View style={styles.tabPanel}>
            <ResultsSummary
              monthlyPayments={result.monthlyPayments}
              principalAmount={principalAmount}
              totalInterestPaid={result.totalInterestPaid}
              totalAmountPaid={result.totalAmountPaid}
              termInYears={result.termInYears}
              termInMonths={result.termInMonths}
              startDate={String(formValues.startDate)}
              currency={currency}
              onShare={handleShare}
              shareLabel={t('share.short')}
              shareIcon={<ShareIcon color={colours.white} />}
            />
          </View>
        )}

        {activeTab === 'charts' && (
          <View style={styles.tabPanel}>
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>{t('results.repaymentBreakdown')}</Text>
              </View>
              <RepaymentBarChart
                monthlyArray={result.loanChartMonthlyArray}
                interestArray={result.loanChartInterestArray}
                labelArray={result.loanChartLabelArray}
                currency={currency}
              />
            </Card>
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>{t('results.loanBreakdown')}</Text>
              </View>
              <LoanBreakdownDonut
                principal={principalAmount}
                totalInterest={result.totalInterestPaid}
                currency={currency}
              />
            </Card>
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>{t('results.cumulativePayments')}</Text>
              </View>
              <CumulativeAreaChart
                monthlyArray={result.loanChartMonthlyArray}
                interestArray={result.loanChartInterestArray}
                remainingArray={result.loanChartRemainingArray}
                currency={currency}
              />
            </Card>
          </View>
        )}

        {activeTab === 'schedule' && (
          <Card style={[styles.chartCard, styles.scheduleCard]}>
            <View style={[styles.chartHeader, styles.scheduleHeader]}>
              <Text style={[styles.chartTitle, styles.scheduleTitle]}>{t('results.amortisationTable')}</Text>
              <TouchableOpacity
                style={[styles.exportButton, isExportingCsv && styles.exportButtonDisabled]}
                onPress={handleExportCsv}
                disabled={isExportingCsv}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <Text style={styles.exportButtonText}>
                  {isExportingCsv ? t('results.exportingCsv') : t('results.exportCsv')}
                </Text>
              </TouchableOpacity>
            </View>
            <AmortisationTable
              items={result.tableItems}
              startDate={String(formValues.startDate)}
              currency={currency}
            />
          </Card>
        )}
      </ScrollView>

      <View style={styles.adFooter}>
        <BannerAd />
      </View>
      <UnsavedResultModal
        visible={showUnsavedModal}
        onKeepEditing={keepEditing}
        onSave={saveBeforeLeaving}
        onDiscard={discardAndLeave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  scroll: { flex: 1 },
  container: { padding: 14, paddingBottom: 20 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  headerSaveButton: {
    minHeight: 36,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colours.primary,
    paddingHorizontal: 16,
  },
  headerSaveText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colours.white,
  },
  headerEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
  },
  adFooter: {
    backgroundColor: colours.white,
    borderTopWidth: 1,
    borderTopColor: colours.surface,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colours.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    marginTop: 0,
    marginBottom: 10,
    minHeight: 44,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: colours.primary,
  },
  tabText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colours.white,
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
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.textSecondary,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  scheduleTitle: {
    flex: 1,
  },
  exportButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scheduleCard: {
    paddingBottom: 8,
  },
});
