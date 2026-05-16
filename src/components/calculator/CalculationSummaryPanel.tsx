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
      {/* Panel 1 — Key Metrics: 2×2 grid with equal visual prominence */}
      <View style={styles.summaryRaisedPanel}>
        {/* Row 1: Monthly Payment | Payoff Date */}
        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricKicker}>{t('results.monthlyPayment')}</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {formatCurrency(result.monthlyPayments, currency)}
            </Text>
          </View>
          <View style={styles.metricCellSeparator} />
          <View style={styles.metricCell}>
            <Text style={styles.metricKicker}>{t('results.payoffDate')}</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {payoffDateFormatted}
            </Text>
            {totalMonths > 0 ? (
              <Text style={styles.metricHelper} numberOfLines={1}>{termHelper}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.metricRowSeparator} />

        {/* Row 2: Total Interest | Total Cost */}
        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricKicker}>{t('results.totalInterest')}</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {formatCurrency(result.totalInterestPaid, currency)}
            </Text>
          </View>
          <View style={styles.metricCellSeparator} />
          <View style={styles.metricCell}>
            <Text style={styles.metricKicker}>{t('results.totalCost')}</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {formatCurrency(result.totalAmountPaid, currency)}
            </Text>
          </View>
        </View>
      </View>

      {/* Panel 2 — Loan Details (secondary info) */}
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
          {additionalPayment > 0 ? (
            <SummaryFact
              label={t('calculator.additionalPayment')}
              value={formatCurrency(additionalPayment, currency)}
            />
          ) : null}
        </View>
      </View>

      {/* Share action — outlined pill button below Loan Details */}
      {onShare ? (
        <TouchableOpacity
          style={styles.shareButton}
          onPress={onShare}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          {shareIcon ? <View style={styles.shareIcon}>{shareIcon}</View> : null}
          <Text style={styles.shareButtonText} numberOfLines={1}>
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
    paddingHorizontal: spacing.sm,
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.white,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  shareIcon: {
    marginRight: 2,
  },
  shareButtonText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  metricRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  metricCell: {
    flex: 1,
    minWidth: 0,
  },
  metricCellSeparator: {
    width: 1,
    backgroundColor: colours.border,
    marginHorizontal: spacing.md,
  },
  metricRowSeparator: {
    height: 1,
    backgroundColor: colours.border,
    marginHorizontal: -spacing.lg,
  },
  metricKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  metricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes['2xl'],
    color: colours.primary,
  },
  metricHelper: {
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
});
