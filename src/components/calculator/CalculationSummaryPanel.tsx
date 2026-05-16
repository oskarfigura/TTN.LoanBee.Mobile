import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/currency/format';
import { formatPayoffDate } from '@/loans/loanInsightSummary';
import { LoanResult } from '@/results/loanResultRoute';
import { CurrencyCode } from '@/currency/currencies';
import { colours, elevation, fontFaces, fontSizes, radii, spacing } from '@/theme';

interface Props {
  result: LoanResult;
  currency: CurrencyCode;
  startDate: string;
  additionalMonthlyPayment?: number;
  onShare?: () => void;
  shareLabel?: string;
  shareIcon?: React.ReactNode;
}

const formatTermDuration = (months: number, yrsLabel: string, moLabel: string): string => {
  const years = Math.floor(months / 12);
  const mo = months % 12;
  if (years === 0) return `${mo} ${moLabel}`;
  if (mo === 0) return `${years} ${yrsLabel}`;
  return `${years} ${yrsLabel} ${mo} ${moLabel}`;
};

const SummaryFact = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryFact}>
    <Text style={styles.summaryFactLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.summaryFactValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

export const CalculationSummaryPanel = ({
  result,
  currency,
  startDate,
  additionalMonthlyPayment,
  onShare,
  shareLabel,
  shareIcon,
}: Props) => {
  const { t, i18n } = useTranslation();
  const totalMonths = Math.max(
    result.tableItems.length,
    result.termInYears * 12 + result.termInMonths,
  );
  const payoffDateFormatted = formatPayoffDate(startDate, totalMonths, i18n.language);
  const termHelper = formatTermDuration(totalMonths, t('results.years'), t('results.months'));
  const additionalPayment = additionalMonthlyPayment ?? 0;

  return (
    <View style={styles.panel}>
      <View style={styles.summaryRaisedPanel}>
        <View style={styles.summaryMetricRow}>
          <Text style={styles.summaryMetricLabel}>{t('results.monthlyPayment')}</Text>
          <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(result.monthlyPayments, currency)}
          </Text>
        </View>
        <View style={styles.summaryMetricRow}>
          <Text style={styles.summaryMetricLabel}>{t('results.payoffDate')}</Text>
          <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
            {payoffDateFormatted}
          </Text>
          {totalMonths > 0 ? (
            <Text style={styles.summaryMetricHelper} numberOfLines={1}>{termHelper}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.summaryRaisedPanel}>
        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionKicker}>{t('loan.loanDetails')}</Text>
        </View>
        <View style={styles.summaryFactGrid}>
          <SummaryFact
            label={t('calculator.loanAmount')}
            value={formatCurrency(result.amount, currency)}
          />
          <SummaryFact
            label={t('calculator.interestRate')}
            value={`${result.interest}%`}
          />
          <SummaryFact
            label={t('results.totalInterest')}
            value={formatCurrency(result.totalInterestPaid, currency)}
          />
          <SummaryFact
            label={t('results.totalCost')}
            value={formatCurrency(result.totalAmountPaid, currency)}
          />
          {additionalPayment > 0 ? (
            <SummaryFact
              label={t('calculator.additionalPayment')}
              value={formatCurrency(additionalPayment, currency)}
            />
          ) : null}
        </View>
      </View>

      {onShare ? (
        <TouchableOpacity
          style={styles.shareRow}
          onPress={onShare}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          {shareIcon ? <View style={styles.shareIcon}>{shareIcon}</View> : null}
          <Text style={styles.shareText} numberOfLines={1} adjustsFontSizeToFit>
            {shareLabel ?? t('share.short')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  summaryRaisedPanel: {
    borderRadius: radii.chip,
    backgroundColor: colours.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    ...elevation.level2,
  },
  summaryMetricRow: {
    minHeight: 66,
    justifyContent: 'center',
  },
  summaryMetricLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  summaryMetricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
    color: colours.primary,
  },
  summaryMetricHelper: {
    ...fontFaces.body.medium,
    marginTop: spacing.xxxs,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colours.textSecondary,
  },
  summarySectionHeader: {
    marginBottom: spacing.sm,
  },
  summarySectionKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  summaryFactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    columnGap: spacing.md,
  },
  summaryFact: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
  },
  summaryFactLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginBottom: spacing.xxxs,
  },
  summaryFactValue: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  shareIcon: {
    marginRight: 5,
  },
  shareText: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xs,
    color: colours.primary,
  },
});
