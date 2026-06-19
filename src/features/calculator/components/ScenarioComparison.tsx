import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AppText,
  AppTextInput,
  FieldLabel,
  InputAffix,
  InputSurface,
} from '@oskarfigura/ui-native';
import { OverpaymentSheetModal } from '@/features/tracker/components/overpayments/OverpaymentSheetPrimitives';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { CURRENCIES, CurrencyCode } from '@/shared/domain/currency/currencies';
import { formatCurrency } from '@/shared/domain/currency/format';
import { getComparisonInsight } from '@/shared/domain/loans/comparisonInsight';
import { getResultForFormValues, LoanResult } from '@/shared/domain/results/loanResultRoute';
import { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';
import { colours, radii, spacing } from '@/shared/ui/theme';

interface Props {
  visible: boolean;
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
    <View style={styles.metricLabelCell}>
      <AppText variant="labelMd">{label}</AppText>
    </View>
    <View style={styles.metricCell}>
      <AppText variant="bodySm" tone="muted" style={styles.metricValue}>{baseline}</AppText>
    </View>
    <View style={styles.metricCell}>
      <AppText variant="labelMd" tone="accent" style={styles.metricValue}>{compared}</AppText>
    </View>
  </View>
);

export const ScenarioComparison = ({ visible, baseline, formValues, currency, onClose }: Props) => {
  const { t } = useTranslation();
  const enteredTotalMonths = (
    Number(formValues.termInYears) * 12
  ) + Number(formValues.termInMonths);
  const initialTotalMonths = Math.max(
    1,
    enteredTotalMonths
      || (baseline.termInYears * 12) + baseline.termInMonths
      || baseline.tableItems.length,
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
      || numericRate > 100
      || !Number.isInteger(years)
      || !Number.isInteger(months)
      || years < 0
      || years > 100
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

  const baselineMonths = baseline.tableItems.length || initialTotalMonths;
  const comparedMonths = compared?.tableItems.length ?? 0;
  const insight = useMemo(() => {
    if (!compared) return null;

    const comparisonInsight = getComparisonInsight({
      currentInterest: baseline.totalInterestPaid,
      comparedInterest: compared.totalInterestPaid,
      currentMonths: baselineMonths,
      comparedMonths,
    });
    if (!comparisonInsight) return null;

    const amount = comparisonInsight.interestSaved
      ? formatCurrency(comparisonInsight.interestSaved, currency)
      : undefined;
    const term = comparisonInsight.monthsSaved
      ? termLabel(
        comparisonInsight.monthsSaved,
        t('results.years'),
        t('results.months'),
      )
      : undefined;

    if (comparisonInsight.winner === 'current') {
      if (amount && term) {
        return {
          winner: comparisonInsight.winner,
          text: t('compare.currentSavingsAndTime', { amount, term }),
        };
      }
      if (amount) {
        return {
          winner: comparisonInsight.winner,
          text: t('compare.currentSavings', { amount }),
        };
      }
      return term ? {
        winner: comparisonInsight.winner,
        text: t('compare.currentTimeSaving', { term }),
      } : null;
    }

    if (amount && term) {
      return {
        winner: comparisonInsight.winner,
        text: t('compare.savingsAndTime', { amount, term }),
      };
    }
    if (amount) {
      return {
        winner: comparisonInsight.winner,
        text: t('compare.savings', { amount }),
      };
    }
    return term ? {
      winner: comparisonInsight.winner,
      text: t('compare.timeSaving', { term }),
    } : null;
  }, [baseline.totalInterestPaid, baselineMonths, compared, comparedMonths, currency, t]);

  return (
    <OverpaymentSheetModal
      visible={visible}
      title={t('compare.title')}
      onClose={onClose}
      maxHeightRatio={0.92}
      closeLabel={t('common.close')}
    >
      <AppText variant="bodySm" tone="muted" style={styles.intro}>{t('compare.body')}</AppText>
      <View style={styles.fields}>
        <View style={styles.field}>
          <FieldLabel>{t('calculator.interestRate')}</FieldLabel>
          <InputSurface>
            <AppTextInput
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <InputAffix trailing>%</InputAffix>
          </InputSurface>
        </View>
        <View style={styles.termFields}>
          <View style={styles.termField}>
            <FieldLabel>{t('calculator.termYears')}</FieldLabel>
            <InputSurface>
              <AppTextInput
                value={termYears}
                onChangeText={setTermYears}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </InputSurface>
          </View>
          <View style={styles.termField}>
            <FieldLabel>{t('calculator.termMonths')}</FieldLabel>
            <InputSurface>
              <AppTextInput
                value={termMonths}
                onChangeText={setTermMonths}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </InputSurface>
          </View>
        </View>
        <View style={styles.field}>
          <FieldLabel>{t('calculator.additionalPayment')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={overpayment}
              onChangeText={setOverpayment}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
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
            <View style={styles.metricLabelCell} />
            <View style={styles.metricCell}>
              <AppText variant="labelSm" tone="muted" style={styles.metricValue}>{t('compare.current')}</AppText>
            </View>
            <View style={styles.metricCell}>
              <AppText variant="labelSm" tone="accent" style={styles.metricValue}>{t('compare.newScenario')}</AppText>
            </View>
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
          {insight ? (
            <View style={[
              styles.insight,
              insight.winner === 'current' && styles.currentInsight,
            ]}>
              <Icon
                icon={IconName.CoinsStackedIcon}
                size={18}
                color={insight.winner === 'current' ? colours.primary : colours.success}
                strokeWidth={1.9}
              />
              <AppText
                variant="labelMd"
                tone={insight.winner === 'current' ? 'accent' : 'success'}
                style={styles.insightText}
              >
                {insight.text}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : (
        <AppText variant="bodySm" style={styles.errorText}>{t('compare.invalid')}</AppText>
      )}
    </OverpaymentSheetModal>
  );
};

const styles = StyleSheet.create({
  intro: {
    marginBottom: spacing.xs,
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
    backgroundColor: colours.surfaceMuted,
  },
  metricRow: {
    flexDirection: 'row',
    minHeight: 44,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
  metricLabelCell: {
    flex: 1.15,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metricCell: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  metricValue: {
    textAlign: 'center',
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colours.successBorder,
    backgroundColor: colours.successSurface,
  },
  currentInsight: {
    borderTopColor: colours.surfaceStrong,
    backgroundColor: colours.surfaceMuted,
  },
  insightText: {
    flex: 1,
  },
  errorText: {
    color: colours.error,
  },
});
