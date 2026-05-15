import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DashboardPinButton } from '@/components/loans/DashboardPinButton';
import { DashboardProgressGauge } from '@/components/loans/DashboardProgressGauge';
import { formatCurrency } from '@/currency/format';
import {
  buildSavedLoanDashboardProgress,
  buildSavedLoanSummary,
  LoanInsightMetric,
} from '@/loans/loanInsightSummary';
import { LoanResult } from '@/results/loanResultRoute';
import { colours, elevation, fontFaces, fontSizes, radii, spacing } from '@/theme';
import { SavedLoan } from '@/types/SavedLoan';

interface Props {
  loan: SavedLoan;
  result: LoanResult;
  onTogglePinned: () => void;
  onTryOverpayments: () => void;
}

const getRemainingTermCaptionKey = (monthsRemaining: number) => {
  if (monthsRemaining <= 0) return 'mortgage.remainingTermComplete';
  const years = Math.floor(monthsRemaining / 12);
  const months = monthsRemaining % 12;

  if (years > 0 && months > 0) return 'mortgage.remainingTermYearsMonths';
  if (years > 0) return 'mortgage.remainingTermYears';
  return 'mortgage.remainingTermMonths';
};

const getRemainingTermValues = (monthsRemaining: number) => ({
  years: Math.floor(Math.max(monthsRemaining, 0) / 12),
  months: Math.max(monthsRemaining, 0) % 12,
});

const SummaryFact = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryFact}>
    <Text style={styles.summaryFactLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.summaryFactValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const findMetric = (metrics: LoanInsightMetric[], labelKey: string) =>
  metrics.find(m => m.labelKey === labelKey);

const formatTermDuration = (months: number, yrsLabel: string, moLabel: string): string => {
  const years = Math.floor(months / 12);
  const mo = months % 12;
  if (years === 0) return `${mo} ${moLabel}`;
  if (mo === 0) return `${years} ${yrsLabel}`;
  return `${years} ${yrsLabel} ${mo} ${moLabel}`;
};

export const LoanSummaryPanel = ({ loan, result, onTogglePinned, onTryOverpayments }: Props) => {
  const { t, i18n } = useTranslation();
  const asOf = useMemo(() => new Date(), []);
  const insightSummary = useMemo(
    () => buildSavedLoanSummary(loan, result, asOf, i18n.language),
    [asOf, i18n.language, loan, result],
  );
  const dashboardProgress = useMemo(
    () => buildSavedLoanDashboardProgress(loan, result, asOf),
    [asOf, loan, result],
  );

  const timeProgress = dashboardProgress.find(item => item.labelKey === 'mortgage.timeProgress');
  const elapsedMonths = Number(timeProgress?.caption.values?.elapsed ?? 0);
  const totalMonths = Number(timeProgress?.caption.values?.total ?? 0);
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
  const remainingTermCaptionKey = getRemainingTermCaptionKey(remainingMonths);
  const remainingTermValues = getRemainingTermValues(remainingMonths);

  const monthlyPayment = findMetric(insightSummary.metrics, 'results.monthlyPayment');
  const currentBalance = findMetric(insightSummary.progress?.metrics ?? [], 'mortgage.currentBalance');
  const payoffDate = insightSummary.hero;

  const totalInterest = findMetric(insightSummary.metrics, 'results.totalInterest');
  const totalCost = findMetric(insightSummary.metrics, 'results.totalCost');

  const additionalPayment = loan.formSnapshot.additionalMonthlyPayment ?? 0;
  const lumpSumEvents = loan.events
    .filter(e => e.type === 'lumpOverpayment' && (e.amount ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const hasOverpayment = additionalPayment > 0 || lumpSumEvents.length > 0;
  const interestSaved = insightSummary.progress?.interestSaved;
  const termSavedMonths = insightSummary.progress?.termSavedMonths;

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryHeaderCopy}>
          <Text
            style={styles.summaryTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {loan.nickname}
          </Text>
          <Text style={styles.summarySubtitle} numberOfLines={1}>
            {loan.lender || t('saved.category.loan')}
          </Text>
        </View>
        <DashboardPinButton
          pinned={loan.pinnedToDashboard}
          onPress={onTogglePinned}
          style={styles.summaryPinButton}
        />
      </View>

      {/* Progress gauge */}
      <DashboardProgressGauge progress={dashboardProgress} />

      {/* Key metrics panel */}
      <View style={styles.summaryRaisedPanel}>
        {monthlyPayment ? (
          <View style={styles.summaryMetricRow}>
            <Text style={styles.summaryMetricLabel}>{t(monthlyPayment.labelKey)}</Text>
            <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
              {monthlyPayment.value}
            </Text>
          </View>
        ) : null}

        {currentBalance ? (
          <View style={styles.summaryMetricRow}>
            <Text style={styles.summaryMetricLabel}>{t(currentBalance.labelKey)}</Text>
            <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
              {currentBalance.value}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryMetricRow}>
          <Text style={styles.summaryMetricLabel}>{t(payoffDate.labelKey)}</Text>
          <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
            {payoffDate.value}
          </Text>
          {totalMonths > 0 ? (
            <Text style={styles.summaryMetricHelper} numberOfLines={1}>
              {t(remainingTermCaptionKey, remainingTermValues)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Loan details panel */}
      <View style={styles.summaryRaisedPanel}>
        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionKicker}>{t('loan.loanDetails')}</Text>
        </View>
        <View style={styles.summaryFactGrid}>
          <SummaryFact
            label={t('calculator.loanAmount')}
            value={formatCurrency(result.amount, loan.currency)}
          />
          <SummaryFact
            label={t('calculator.interestRate')}
            value={`${loan.formSnapshot.interest}%`}
          />
          {totalInterest ? (
            <SummaryFact label={t(totalInterest.labelKey)} value={totalInterest.value} />
          ) : null}
          {totalCost ? (
            <SummaryFact label={t(totalCost.labelKey)} value={totalCost.value} />
          ) : null}
          {additionalPayment > 0 ? (
            <SummaryFact
              label={t('calculator.additionalPayment')}
              value={formatCurrency(additionalPayment, loan.currency)}
            />
          ) : null}
          {lumpSumEvents.map(event => (
            <SummaryFact
              key={event.id}
              label={t('recalculate.lumpSumLabel')}
              value={formatCurrency(event.amount ?? 0, loan.currency)}
            />
          ))}
        </View>
      </View>

      {/* Overpayment savings / nudge card */}
      {hasOverpayment && interestSaved ? (
        <View style={styles.savingsCard}>
          <Text style={styles.savingsKicker}>{t('loan.overpaymentSavings')}</Text>
          <View style={styles.savingsRow}>
            <Text style={styles.savingsRowLabel}>{t('recalculate.interestSaved')}</Text>
            <Text style={styles.savingsRowValue}>
              {formatCurrency(interestSaved, loan.currency)}
            </Text>
          </View>
          {termSavedMonths ? (
            <View style={styles.savingsRow}>
              <Text style={styles.savingsRowLabel}>{t('recalculate.timeSaved')}</Text>
              <Text style={styles.savingsRowValue}>
                {formatTermDuration(termSavedMonths, t('results.years'), t('results.months'))}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.nudgeCard}>
          <Text style={styles.nudgeTitle}>{t('loan.nudgeTitle')}</Text>
          <Text style={styles.nudgeBody}>{t('loan.nudgeBody')}</Text>
          <TouchableOpacity onPress={onTryOverpayments} activeOpacity={0.84} style={styles.nudgeCta}>
            <Text style={styles.nudgeCtaText}>{t('recalculate.ctaButton')} →</Text>
          </TouchableOpacity>
        </View>
      )}
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
  summaryHeader: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: 44,
    minHeight: 62,
  },
  summaryHeaderCopy: {
    alignItems: 'center',
    minWidth: 0,
  },
  summaryTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    lineHeight: 32,
    color: colours.primary,
    textAlign: 'center',
  },
  summarySubtitle: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
  },
  summaryPinButton: {
    position: 'absolute',
    top: 0,
    right: 0,
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
  savingsCard: {
    borderRadius: radii.chip,
    backgroundColor: colours.successSurface,
    borderWidth: 1,
    borderColor: colours.successBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  savingsKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.secondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxxs,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsRowLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  savingsRowValue: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.secondary,
  },
  nudgeCard: {
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  nudgeTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    textAlign: 'center',
  },
  nudgeBody: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textAlign: 'center',
  },
  nudgeCta: {
    marginTop: spacing.xxxs,
  },
  nudgeCtaText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.primary,
  },
});
