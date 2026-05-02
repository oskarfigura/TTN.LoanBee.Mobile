import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { colours, layout, spacing } from '@/theme';
import { buildDraftResultParams } from '@/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { MortgageDashboard } from '@/components/loans/MortgageDashboard';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ calculator?: string }>();
  const form = useLoanCalculatorForm();
  const { loans, refresh } = useSavedLoans();
  const [showCalculator, setShowCalculator] = useState(false);
  const pinnedLoans = useMemo(() => (
    loans
      .filter(loan => loan.pinnedToDashboard)
      .sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0))
  ), [loans]);

  useEffect(() => {
    if (params.calculator === '1') {
      setShowCalculator(true);
    }
  }, [params.calculator]);

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
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <MortgageDashboard loans={pinnedLoans} onNewCalculation={() => setShowCalculator(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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
            <AppText variant="display" tone="accent" style={styles.pageTitle}>
              Mortgage & Loan Calculator
            </AppText>
            <AppText variant="bodyLg" tone="muted" style={styles.pageSubtitle}>
              {t('calculator.subtitle')}
            </AppText>
            <View style={styles.helperRow}>
              <AppText variant="bodySm" tone="muted" style={styles.helperText}>
                {t('mortgage.dashboardHint')}
              </AppText>
              {pinnedLoans.length > 0 ? (
                <Button
                  label={t('saved.title')}
                  onPress={() => router.push('/saved')}
                  variant="secondary"
                  style={styles.helperAction}
                />
              ) : null}
            </View>
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
  pageTitle: {
    marginBottom: spacing.sm,
    maxWidth: '92%',
  },
  pageSubtitle: {
    maxWidth: '96%',
  },
  helperRow: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  helperText: {
    maxWidth: '92%',
  },
  helperAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: layout.cardPadding,
  },
});
