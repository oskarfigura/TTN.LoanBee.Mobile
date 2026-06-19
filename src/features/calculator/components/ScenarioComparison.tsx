import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AppText,
  AppTextInput,
  Button,
  ButtonVariant,
  FieldLabel,
  InputAffix,
  InputSurface,
} from '@oskarfigura/ui-native';
import { CURRENCIES, CurrencyCode } from '@/shared/domain/currency/currencies';
import { formatCurrency } from '@/shared/domain/currency/format';
import { getResultForFormValues, LoanResult } from '@/shared/domain/results/loanResultRoute';
import { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';

interface Props {
  baseline: LoanResult;
  formValues: LoanCalculatorFormValues;
  currency: CurrencyCode;
  onClose: () => void;
}

const numberText = (value: number | null | undefined) => (
  Number.isFinite(Number(value)) ? String(value ?? 0) : ''
);

const termLabel = (months: number, yearsCopy: string, monthsCopy: string) => {
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years > 0 && remaining > 0) return `${years} ${yearsCopy} ${remaining} ${monthsCopy}`;
  if (years > 0) return `${years} ${yearsCopy}`;
  return `${remaining} ${monthsCopy}`;
};

const Metric = ({ label, baseline, compared }: {
  label: string;
  baseline: string;
  compared: string;
}) => (
  <View style={styles.metricRow}>
    <AppText variant="bodySm" tone="muted" style={styles.metricLabel}>{label}</AppText>
    <AppText variant="labelMd" style={styles.metricValue}>{baseline}</AppText>
    <AppText variant="labelMd" tone="accent" style={styles.metricValue}>{compared}</AppText>
  </View>
);

export const ScenarioComparison = ({ baseline, formValues, currency, onClose }: Props) => {
  const { t } = useTranslation();
  const initialTotalMonths = Math.max(
    1,
    baseline.tableItems.length
      || (baseline.termInYears * 12) + baseline.termInMonths
      || (Number(formValues.termInYears) * 12) + Number(formValues.termInMonths),
  );
  const [rate, setRate] = useState(numberText(formValues.interest));
  const [termYears, setTermYears] = useState(String(Math.floor(initialTotalMonths / 12)));
  const [termMonths, setTermMonths] = useState(String(initialTotalMonths % 12));
  const [overpayment, setOverpayment] = useState(numberText(formValues.additionalMonthlyPayment));
  const currencySymbol = CURRENCIES.find(item => item.code === currency)?.symbol ?? '£';

  const compared = useMemo(() => {
    const numericRate = Number(rate);
    const years = Number(termYears);
    const months = Number(termMonths);
    const extra = Number(overpayment);
    const totalMonths = (years * 12) + months;
    if (
      !Number.isFinite(numericRate)
      || numericRate <= 0
      || !Number.isInteger(years)
      || !Number.isInteger(months)
      || years < 0
      || months < 0
      || months > 11
      || totalMonths <= 0
      || !Number.isFinite(extra)
      || extra < 0
    ) {
      return null;
    }

    return getResultForFormValues({
      ...formValues,
      interest: numericRate,
      termInYears: years,
      termInMonths: months,
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: extra,
      calculationType: 'term',
    });
  }, [formValues, overpayment, rate, termMonths, termYears]);

  const baselineMonths = initialTotalMonths;
  const comparedMonths = compared?.tableItems.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="title2">{t('compare.title')}</AppText>
          <AppText variant="bodySm" tone="muted">{t('compare.body')}</AppText>
        </View>
        <Button label={t('common.close')} onPress={onClose} variant={ButtonVariant.Ghost} />
      </View>

      <View style={styles.fields}>
        <View style={styles.field}>
          <FieldLabel>{t('calculator.interestRate')}</FieldLabel>
          <InputSurface>
            <AppTextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
            <InputAffix trailing>%</InputAffix>
          </InputSurface>
        </View>
        <View style={styles.termFields}>
          <View style={styles.termField}>
            <FieldLabel>{t('calculator.termYears')}</FieldLabel>
            <InputSurface>
              <AppTextInput value={termYears} onChangeText={setTermYears} keyboardType="number-pad" />
            </InputSurface>
          </View>
          <View style={styles.termField}>
            <FieldLabel>{t('calculator.termMonths')}</FieldLabel>
            <InputSurface>
              <AppTextInput value={termMonths} onChangeText={setTermMonths} keyboardType="number-pad" />
            </InputSurface>
          </View>
        </View>
        <View style={styles.field}>
          <FieldLabel>{t('calculator.additionalPayment')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput value={overpayment} onChangeText={setOverpayment} keyboardType="decimal-pad" />
          </InputSurface>
          <View style={styles.quickOptions}>
            {[50, 100, 250].map(amount => (
              <TouchableOpacity
                key={amount}
                onPress={() => setOverpayment(String(amount))}
                style={styles.quickOption}
                accessibilityRole="button"
              >
                <AppText variant="labelSm" tone="accent">+{currencySymbol}{amount}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {compared ? (
        <View style={styles.comparison}>
          <View style={styles.columnHeader}>
            <AppText variant="labelSm" tone="muted" style={styles.metricLabel} />
            <AppText variant="labelSm" style={styles.metricValue}>{t('compare.current')}</AppText>
            <AppText variant="labelSm" tone="accent" style={styles.metricValue}>{t('compare.newScenario')}</AppText>
          </View>
          <Metric
            label={t('results.monthlyPayment')}
            baseline={formatCurrency(baseline.monthlyPayments, currency)}
            compared={formatCurrency(compared.monthlyPayments, currency)}
          />
          <Metric
            label={t('results.totalInterest')}
            baseline={formatCurrency(baseline.totalInterestPaid, currency)}
            compared={formatCurrency(compared.totalInterestPaid, currency)}
          />
          <Metric
            label={t('results.loanTerm')}
            baseline={termLabel(baselineMonths, t('results.years'), t('results.months'))}
            compared={termLabel(comparedMonths, t('results.years'), t('results.months'))}
          />
        </View>
      ) : (
        <AppText variant="bodySm" style={styles.errorText}>{t('compare.invalid')}</AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    padding: layout.cardPadding,
    gap: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceAccent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  fields: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  termFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  termField: {
    flex: 1,
    gap: spacing.xs,
  },
  quickOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quickOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceRaised,
  },
  comparison: {
    overflow: 'hidden',
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceRaised,
  },
  columnHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colours.surfaceMuted,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colours.borderSoft,
  },
  metricLabel: {
    flex: 1.25,
  },
  metricValue: {
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    color: colours.error,
  },
});
