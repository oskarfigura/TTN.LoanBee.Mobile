import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { buildDraftResultParams } from '@/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { MortgageDashboard } from '@/components/loans/MortgageDashboard';
import { Button } from '@/components/ui/Button';

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
      <ScreenHeader title={t('calculator.title')} subtitle={t('calculator.subtitle')} />
      <View style={styles.dashboardHint}>
        <Text style={styles.dashboardHintTitle}>{t('mortgage.pinToDashboard')}</Text>
        <Text style={styles.dashboardHintText}>{t('mortgage.dashboardHint')}</Text>
        {pinnedLoans.length > 0 && (
          <Button
            label={t('mortgage.backToDashboard')}
            onPress={() => setShowCalculator(false)}
            variant="ghost"
            style={styles.dashboardHintAction}
          />
        )}
      </View>
      <LoanForm form={form} onSubmit={handleSubmit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  dashboardHint: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  dashboardHintTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  dashboardHintText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 4,
  },
  dashboardHintAction: {
    marginTop: 8,
  },
});
