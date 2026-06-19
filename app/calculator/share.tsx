import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { Button, ButtonVariant } from '@oskarfigura/ui-native';
import { colours, fontFaces, fontSizes } from '@/shared/ui/theme';
import { beginDraftResult } from '@/shared/domain/results/loanResultRoute';
import { getShareableCalculationValuesFromParams } from '@/features/sharing/calculationShareLink';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import type { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';

const toSearchParams = (params: Record<string, string | string[] | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value[0] !== undefined) searchParams.set(key, value[0]);
      return;
    }
    if (value !== undefined) searchParams.set(key, value);
  });
  return searchParams;
};

export default function SharedCalculationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const values = getShareableCalculationValuesFromParams(toSearchParams(params));
    const result = getLoanCalculations(
      values.loanAmount,
      values.interest,
      values.termInYears,
      values.termInMonths,
      values.desiredMonthlyPayment ?? 0,
      values.calculationType as LoanCalculationType,
      values.downPayment,
      values.downPaymentType as DownPaymentType,
      values.additionalMonthlyPayment ?? 0,
      values.startDate,
    );

    router.replace({
      pathname: '/calculate/result' as never,
      params: {
        ...beginDraftResult(result, values as LoanCalculatorFormValues, values.currency as CurrencyCode),
        returnTo: '/',
      },
    });
  }, [params, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('share.opening')}</Text>
        <Button label={t('common.goBack')} onPress={() => router.replace('/' as never)} variant={ButtonVariant.Secondary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
});
