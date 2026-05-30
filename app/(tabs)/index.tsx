import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getDefaultCurrency,
  useLoanCalculatorForm,
  LoanCalculatorFormValues,
} from '@/hooks/useLoanCalculatorForm';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { CurrencyCode } from '@/currency/currencies';
import { LoanForm } from '@/components/calculator/LoanForm';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { colours, spacing } from '@/theme';
import { buildDraftResultParams } from '@/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { MortgageDashboard } from '@/components/loans/MortgageDashboard';
import { hasSeenGuide } from '@/onboarding/guideState';
import { whenConsentFlowComplete } from '@/onboarding/firstRunGate';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ calculator?: string; dashboard?: string }>();
  const form = useLoanCalculatorForm();
  const { loans, refresh } = useSavedLoans();
  const [showCalculator, setShowCalculator] = useState(false);
  const pinnedLoans = useMemo(() => (
    loans
      .filter(loan => loan.pinnedToDashboard)
      .sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0))
  ), [loans]);
  const firstRunChecked = useRef(false);

  useEffect(() => {
    if (firstRunChecked.current) return;
    firstRunChecked.current = true;
    if (hasSeenGuide()) return;

    let cancelled = false;

    whenConsentFlowComplete().then(() => {
      if (!cancelled && !hasSeenGuide()) {
        router.push('/guide?firstRun=1');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (params.calculator === '1') {
      setShowCalculator(true);
    }
  }, [params.calculator]);

  useEffect(() => {
    if (params.dashboard) {
      setShowCalculator(false);
    }
  }, [params.dashboard]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      form.setValue('currency', getDefaultCurrency(), {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }, [form, refresh])
  );

  const handleSubmit = (values: LoanCalculatorFormValues) => {
    const result = getLoanCalculations(
      values.loanAmount,
      values.interest,
      values.termInYears ?? 0,
      values.termInMonths ?? 0,
      values.desiredMonthlyPayment ?? 0,
      values.calculationType as LoanCalculationType,
      values.downPayment,
      values.downPaymentType as DownPaymentType,
      values.additionalMonthlyPayment,
      values.startDate,
    );

    router.push({
      pathname: '/result' as never,
      params: buildDraftResultParams(result, values, values.currency as CurrencyCode),
    });
  };

  if (pinnedLoans.length > 0 && !showCalculator) {
    return (
      // No 'bottom' edge: tab screens sit above the tab bar, which already clears the
      // device bottom inset. Adding it here double-counts and opens a gap above the bar.
      <SafeAreaView style={styles.safe} edges={[]}>
        <MortgageDashboard loans={pinnedLoans} onNewCalculation={() => setShowCalculator(true)} />
      </SafeAreaView>
    );
  }

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t('calculator.title')}
        variant="top-level"
        leftAction={pinnedLoans.length > 0 ? <HeaderBackAction onPress={() => setShowCalculator(false)} /> : undefined}
      />
      <LoanForm
        form={form}
        onSubmit={handleSubmit}
        topContent={(
          <View style={styles.pageIntro}>
            <AppText variant="bodyLg" tone="muted" style={styles.pageSubtitle}>
              {t('calculator.subtitle')}
            </AppText>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  pageIntro: {
    marginBottom: spacing.lg,
  },
  pageSubtitle: {
    maxWidth: '96%',
  },
});
