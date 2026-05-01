import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ResultsSummary } from '@/components/calculator/ResultsSummary';
import { AmortisationTable } from '@/components/calculator/AmortisationTable';
import { RepaymentBarChart } from '@/components/charts/RepaymentBarChart';
import { LoanBreakdownDonut } from '@/components/charts/LoanBreakdownDonut';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
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

export default function ResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<ResultParams>();
  const allowLeaveRef = useRef(false);
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

  const confirmLeave = useCallback((continueNavigation: () => void) => {
    Alert.alert(
      t('results.unsavedTitle'),
      t('results.unsavedMessage'),
      [
        { text: t('results.cancelLeave'), style: 'cancel' },
        {
          text: t('results.discard'),
          style: 'destructive',
          onPress: () => continueWithoutGuard(continueNavigation),
        },
        { text: t('results.saveBeforeLeaving'), onPress: openSave },
      ],
    );
  }, [continueWithoutGuard, openSave, t]);

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

  const handleNewCalculation = () => {
    const navigateHome = () => router.replace('/');
    if (isSavedMode) {
      navigateHome();
      return;
    }

    confirmLeave(() => continueWithoutGuard(navigateHome));
  };

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{t('results.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {savedLoan ? savedLoan.nickname : t('results.unsavedSubtitle')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleNewCalculation}>
              <Text style={styles.headerButtonText}>{t('results.newCalculation')}</Text>
            </TouchableOpacity>
            {isSavedMode ? (
              <View style={styles.savedPill}>
                <Text style={styles.savedPillText}>{t('results.saved')}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.headerButtonPrimary} onPress={openSave}>
                <Text style={styles.headerButtonPrimaryText}>{t('results.save')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

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
              totalInterestPaid={result.totalInterestPaid}
              totalAmountPaid={result.totalAmountPaid}
              termInYears={result.termInYears}
              termInMonths={result.termInMonths}
              startDate={String(formValues.startDate)}
              currency={currency}
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
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>{t('results.amortisationTable')}</Text>
            </View>
            <AmortisationTable
              items={result.tableItems}
              startDate={String(formValues.startDate)}
              currency={currency}
            />
          </Card>
        )}
      </ScrollView>

      {!isSavedMode && (
        <View style={styles.saveFooter}>
          <Button label={t('results.saveThisLoan')} onPress={openSave} />
        </View>
      )}
      <View style={styles.adFooter}>
        <BannerAd />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 24 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  header: {
    backgroundColor: colours.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colours.white,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.whiteSubtle,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colours.whiteSubtle,
  },
  headerButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.white,
  },
  headerButtonPrimary: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colours.white,
  },
  headerButtonPrimaryText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  savedPill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colours.successLight,
  },
  savedPillText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colours.secondary,
  },
  adFooter: {
    backgroundColor: colours.white,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingHorizontal: 16,
  },
  saveFooter: {
    backgroundColor: colours.white,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colours.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colours.border,
    marginTop: 0,
    marginBottom: 12,
    minHeight: 50,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
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
  chartTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.textSecondary,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  scheduleCard: {
    paddingBottom: 8,
  },
});
