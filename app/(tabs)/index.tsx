import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLoanCalculatorForm, LoanCalculatorFormValues } from '@/hooks/useLoanCalculatorForm';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanForm } from '@/components/calculator/LoanForm';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { BannerAd } from '@/ads/BannerAd';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const form = useLoanCalculatorForm();

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
      pathname: '/calculator/result',
      params: {
        result: JSON.stringify(result),
        formValues: JSON.stringify(values),
        currency: values.currency,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.logo}>🐝 LoanBee</Text>
        <Text style={styles.subtitle}>{t('calculator.subtitle')}</Text>
      </View>
      <LoanForm form={form} onSubmit={handleSubmit} />
      <View style={styles.footer}>
        <Disclaimer />
        <BannerAd />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  header: {
    backgroundColor: colours.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  logo: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.white,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.whiteSubtle,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 16,
  },
});
