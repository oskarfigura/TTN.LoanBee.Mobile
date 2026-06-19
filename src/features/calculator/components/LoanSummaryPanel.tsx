import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DashboardPinButton } from '@/features/tracker/components/dashboard/DashboardPinButton';
import { DashboardProgressGauge } from '@/features/tracker/components/dashboard/DashboardProgressGauge';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { QuickActionTile } from '@oskarfigura/ui-native';
import { formatCurrency } from '@/shared/domain/currency/format';
import {
  buildSavedLoanDashboardProgress,
  buildSavedLoanSummary,
  formatPayoffDate,
  LoanInsightMetric,
} from '@/shared/domain/loans/loanInsightSummary';
import { OverpaymentImpact } from '@/shared/domain/loans/overpaymentScope';
import { LoanResult } from '@/shared/domain/results/loanResultRoute';
import { colours, elevation, fontFaces, fontSizes, radii, spacing } from '@/shared/ui/theme';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

interface Props {
  loan: SavedLoan;
  result: LoanResult;
  onTogglePinned?: () => void;
  onTryOverpayments?: () => void;
  /**
   * 'draft' renders the same summary for an unsaved calculation: no header/pin and
   * no progress gauge (nothing to track yet), a Share action instead of the
   * try-overpayments nudge, but the overpayment savings card still shows when the
   * calculation includes an additional payment.
   */
  mode?: 'saved' | 'draft';
  /** Draft-mode actions: calculations already persist automatically in Recent. */
  onCompare?: () => void;
  onTrack?: () => void;
  onShare?: () => void;
  overpaymentImpact?: OverpaymentImpact;
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
    <Text
      style={styles.summaryFactValue}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.68}
    >
      {value}
    </Text>
  </View>
);

const OutcomeFact = ({
  label,
  value,
  stacked,
}: {
  label: string;
  value: string;
  stacked: boolean;
}) => (
  <View style={[styles.outcomeFact, stacked && styles.outcomeFactStacked]}>
    <Text style={styles.outcomeFactLabel} numberOfLines={1}>{label}</Text>
    <Text
      style={[styles.outcomeFactValue, stacked && styles.outcomeFactValueStacked]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.62}
    >
      {value}
    </Text>
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

export const LoanSummaryPanel = ({
  loan,
  result,
  onTogglePinned,
  onTryOverpayments,
  mode = 'saved',
  onCompare,
  onTrack,
  onShare,
  overpaymentImpact,
}: Props) => {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isDraft = mode === 'draft';
  const stackOutcomeFacts = width < 360;
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
  const totalMonths = isDraft
    ? loan.resultSnapshot.totalTermInMonths
    : Number(timeProgress?.caption.values?.total ?? 0);
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
  const remainingTermCaptionKey = getRemainingTermCaptionKey(remainingMonths);
  const remainingTermValues = getRemainingTermValues(remainingMonths);

  const monthlyPayment = findMetric(insightSummary.metrics, 'results.monthlyPayment');
  const currentBalance = findMetric(insightSummary.progress?.metrics ?? [], 'mortgage.currentBalance');
  const payoffDate = isDraft
    ? {
      labelKey: 'results.payoffDate',
      value: formatPayoffDate(
        loan.formSnapshot.startDate,
        loan.resultSnapshot.totalTermInMonths,
        i18n.language,
      ),
    }
    : findMetric(insightSummary.metrics, 'results.payoffDate')
      ?? (insightSummary.hero.labelKey === 'results.payoffDate' ? insightSummary.hero : null);

  const totalInterest = isDraft
    ? {
      labelKey: 'results.totalInterest',
      value: formatCurrency(loan.resultSnapshot.totalInterestPaid, loan.currency),
    }
    : findMetric(insightSummary.metrics, 'results.totalInterest');
  const totalCost = isDraft
    ? {
      labelKey: 'results.totalCost',
      value: formatCurrency(
        result.totalAmountPaid - result.totalInterestPaid + loan.resultSnapshot.totalInterestPaid,
        loan.currency,
      ),
    }
    : findMetric(insightSummary.metrics, 'results.totalCost');

  const additionalPayment = loan.formSnapshot.additionalMonthlyPayment ?? 0;
  const lumpSumEvents = loan.events
    .filter(e => e.type === 'lumpOverpayment' && (e.amount ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const hasOverpayment = additionalPayment > 0
    || lumpSumEvents.length > 0;
  const snapshotInterestSaved = Math.max(
    0,
    loan.resultSnapshot.totalInterestPaidBaseline - result.totalInterestPaid,
  );
  const scenarioTermMonths = result.tableItems.length
    || ((result.termInYears * 12) + result.termInMonths);
  const enteredTermMonths = (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths;
  const snapshotTermSaved = loan.formSnapshot.calculationType.toLowerCase() === 'term'
    ? Math.max(0, enteredTermMonths - scenarioTermMonths)
    : 0;
  const interestSaved = overpaymentImpact?.interestSaved
    ?? insightSummary.progress?.interestSaved
    ?? snapshotInterestSaved;
  const termSavedMonths = overpaymentImpact?.secondary.kind === 'monthsSaved'
    ? overpaymentImpact.secondary.value
    : insightSummary.progress?.termSavedMonths
    ?? snapshotTermSaved;

  return (
    <View style={styles.panel}>
      {/* Header + progress gauge: only for a saved loan (a draft has no name to
          show, nothing to pin, and ~0% elapsed so the gauge is meaningless). */}
      {!isDraft ? (
        <>
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
              onPress={() => onTogglePinned?.()}
              style={styles.summaryPinButton}
            />
          </View>

          <DashboardProgressGauge progress={dashboardProgress} />
        </>
      ) : null}

      {isDraft ? (
        <View style={styles.resultCard}>
          {monthlyPayment ? (
            <View style={styles.paymentHero}>
              <Text style={styles.paymentHeroLabel}>{t(monthlyPayment.labelKey)}</Text>
              <Text
                style={styles.paymentHeroValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.64}
              >
                {monthlyPayment.value}
              </Text>
              <View style={styles.paymentHeroMetaRow}>
                <Text style={styles.paymentHeroMeta}>{`${loan.formSnapshot.interest}%`}</Text>
                {enteredTermMonths > 0 ? (
                  <View style={styles.paymentHeroMetaSegment}>
                    <View style={styles.paymentHeroMetaDot} />
                    <Text style={styles.paymentHeroMeta}>
                      {formatTermDuration(enteredTermMonths, t('results.years'), t('results.months'))}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.resultOutcomes}>
            {payoffDate ? (
              <View style={styles.payoffOutcome}>
                <View style={styles.payoffOutcomeCopy}>
                  <Text style={styles.outcomeFactLabel}>{t(payoffDate.labelKey)}</Text>
                  <Text
                    style={styles.payoffOutcomeValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {payoffDate.value}
                  </Text>
                  {totalMonths > 0 ? (
                    <Text style={styles.summaryMetricHelper} numberOfLines={1}>
                      {t(remainingTermCaptionKey, remainingTermValues)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.payoffIcon}>
                  <Icon
                    icon={IconName.CalendarDateIcon}
                    size={19}
                    color={colours.primary}
                    strokeWidth={1.8}
                  />
                </View>
              </View>
            ) : null}

            <View style={[
              styles.lifetimeCostRow,
              stackOutcomeFacts && styles.lifetimeCostRowStacked,
            ]}>
              {totalInterest ? (
                <OutcomeFact
                  label={t(totalInterest.labelKey)}
                  value={totalInterest.value}
                  stacked={stackOutcomeFacts}
                />
              ) : null}
              {totalInterest && totalCost ? (
                <View style={[
                  styles.lifetimeCostDivider,
                  stackOutcomeFacts && styles.lifetimeCostDividerStacked,
                ]} />
              ) : null}
              {totalCost ? (
                <OutcomeFact
                  label={t(totalCost.labelKey)}
                  value={totalCost.value}
                  stacked={stackOutcomeFacts}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.loanDetailsFooter}>
            <Text style={styles.summarySectionKicker}>{t('loan.loanDetails')}</Text>
            <View style={styles.loanDetailsRow}>
              <SummaryFact
                label={t('calculator.loanAmount')}
                value={formatCurrency(result.amount, loan.currency)}
              />
              <SummaryFact
                label={t('calculator.interestRate')}
                value={`${loan.formSnapshot.interest}%`}
              />
            </View>
          </View>
        </View>
      ) : (
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

          {payoffDate ? (
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
          ) : null}
        </View>
      )}

      {/* Overpayments now explain their outcome before the page asks the user to act. */}
      {hasOverpayment && interestSaved > 0 ? (
        <View style={styles.savingsCard}>
          <View style={styles.savingsIcon}>
            <Icon icon={IconName.ArrowTrendingDownIcon} size={20} color={colours.success} strokeWidth={1.9} />
          </View>
          <View style={styles.savingsCopy}>
            <Text style={styles.savingsKicker}>{t('loan.overpaymentSavings')}</Text>
            <Text
              style={styles.savingsHeadline}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {t('loan.overpaymentCouldSave', {
                amount: formatCurrency(interestSaved, loan.currency),
              })}
            </Text>
            <View style={styles.savingsMeta}>
              {additionalPayment > 0 ? (
                <Text style={styles.savingsMetaText}>
                  {t('loan.overpaymentEachMonth', {
                    amount: formatCurrency(additionalPayment, loan.currency),
                  })}
                </Text>
              ) : null}
              {lumpSumEvents[0] ? (
                <Text style={styles.savingsMetaText}>
                  {t('loan.overpaymentOneOff', {
                    amount: formatCurrency(lumpSumEvents[0].amount ?? 0, loan.currency),
                  })}
                </Text>
              ) : null}
              {termSavedMonths > 0 ? (
                <Text style={styles.savingsTerm}>
                  {t('loan.overpaymentSooner', {
                    duration: formatTermDuration(
                      termSavedMonths,
                      t('results.years'),
                      t('results.months'),
                    ),
                  })}
                </Text>
              ) : null}
            </View>
            {isDraft && onTryOverpayments ? (
              <TouchableOpacity
                onPress={onTryOverpayments}
                activeOpacity={0.84}
                style={styles.savingsManageRow}
                accessibilityRole="button"
              >
                <Text style={styles.savingsManageText}>{t('overpayments.adjustPreview')} →</Text>
              </TouchableOpacity>
            ) : !isDraft && onTryOverpayments ? (
              <TouchableOpacity
                onPress={onTryOverpayments}
                activeOpacity={0.84}
                style={styles.savingsManageRow}
                accessibilityRole="button"
              >
                <Text style={styles.savingsManageText}>{t('overpayments.manage')} →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : onTryOverpayments ? (
        <TouchableOpacity
          style={styles.nudgeCard}
          onPress={onTryOverpayments}
          activeOpacity={0.84}
          accessibilityRole="button"
        >
          <View style={styles.nudgeIcon}>
            <Icon icon={IconName.ArrowTrendingDownIcon} size={20} color={colours.primary} strokeWidth={1.9} />
          </View>
          <View style={styles.nudgeCopy}>
            <Text style={styles.nudgeTitle}>{t('loan.nudgeTitle')}</Text>
            <Text style={styles.nudgeBody} numberOfLines={2}>{t('loan.nudgeBody')}</Text>
          </View>
          <Text style={styles.nudgeCtaText}>→</Text>
        </TouchableOpacity>
      ) : null}

      {/* Saving into tracked borrowing is the main commitment. Compare and Share
          remain available, but the shorter summary keeps them safely above the ad. */}
      {isDraft ? (
        <View style={styles.quickActionsCard}>
          <View style={styles.quickActionsRow}>
            {onTrack ? (
              <QuickActionTile
                label={t('results.save')}
                icon={<Icon icon={IconName.SaveIcon} size={21} color={colours.primary} strokeWidth={1.9} />}
                onPress={onTrack}
              />
            ) : null}
            {onCompare ? (
              <QuickActionTile
                label={t('compare.short')}
                icon={<Icon icon={IconName.ScaleIcon} size={21} color={colours.primary} strokeWidth={1.9} />}
                onPress={onCompare}
              />
            ) : null}
            {onShare ? (
              <QuickActionTile
                label={t('share.short')}
                icon={<Icon icon={IconName.ShareIcon} size={21} color={colours.primary} strokeWidth={1.9} />}
                onPress={onShare}
              />
            ) : null}
          </View>
          <View style={styles.recentNotice}>
            <Icon icon={IconName.ClockIcon} size={15} color={colours.secondary} strokeWidth={1.9} />
            <Text style={styles.recentNoticeText}>{t('recent.savedAutomatically')}</Text>
          </View>
        </View>
      ) : null}

      {!isDraft ? (
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
            {enteredTermMonths > 0 ? (
              <SummaryFact
                label={t('results.loanTerm')}
                value={formatTermDuration(enteredTermMonths, t('results.years'), t('results.months'))}
              />
            ) : null}
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
      ) : null}

    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingTop: 0,
    paddingBottom: spacing.md,
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
  resultCard: {
    borderRadius: radii.chip,
    backgroundColor: colours.white,
    ...elevation.level1,
  },
  paymentHero: {
    borderTopLeftRadius: radii.chip,
    borderTopRightRadius: radii.chip,
    backgroundColor: colours.surfaceAccent,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  paymentHeroLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  paymentHeroValue: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes['3xl'],
    lineHeight: 41,
    color: colours.primary,
  },
  paymentHeroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: spacing.xxxs,
    marginTop: spacing.xs,
  },
  paymentHeroMetaSegment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentHeroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: radii.full,
    backgroundColor: colours.primary,
    opacity: 0.45,
    marginHorizontal: spacing.xs,
  },
  paymentHeroMeta: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: colours.primary,
    opacity: 0.65,
  },
  resultOutcomes: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  payoffOutcome: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  payoffOutcomeCopy: {
    flex: 1,
    minWidth: 0,
  },
  payoffOutcomeValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 26,
    color: colours.primary,
    marginTop: spacing.xxxs,
  },
  payoffIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceMuted,
  },
  lifetimeCostRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.sm,
  },
  lifetimeCostRowStacked: {
    flexDirection: 'column',
  },
  lifetimeCostDivider: {
    width: 1,
    backgroundColor: colours.border,
    marginHorizontal: spacing.sm,
  },
  lifetimeCostDividerStacked: {
    width: '100%',
    height: 1,
    marginHorizontal: 0,
    marginVertical: spacing.xs,
  },
  outcomeFact: {
    flex: 1,
    minWidth: 0,
  },
  outcomeFactStacked: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  outcomeFactLabel: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: colours.textSecondary,
  },
  outcomeFactValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textPrimary,
    marginTop: spacing.xxs,
  },
  outcomeFactValueStacked: {
    flex: 1,
    marginTop: 0,
    textAlign: 'right',
  },
  loanDetailsFooter: {
    borderBottomLeftRadius: radii.chip,
    borderBottomRightRadius: radii.chip,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  loanDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
    columnGap: spacing.md,
  },
  summaryRaisedPanel: {
    borderRadius: radii.chip,
    backgroundColor: colours.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...elevation.level1,
  },
  summaryMetricRow: {
    minHeight: 58,
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
    fontSize: fontSizes.sm,
    lineHeight: 17,
    color: colours.textSecondary,
  },
  summarySectionKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  summarySectionHeader: {
    marginBottom: spacing.xs,
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
    ...fontFaces.body.medium,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: colours.textSecondary,
    marginBottom: spacing.xxxs,
  },
  summaryFactValue: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textPrimary,
  },
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radii.chip,
    backgroundColor: colours.successSurface,
    borderWidth: 1,
    borderColor: colours.successBorder,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  savingsIcon: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.successLight,
  },
  savingsCopy: {
    flex: 1,
    minWidth: 0,
  },
  savingsKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    lineHeight: 15,
    color: colours.success,
    textTransform: 'uppercase',
    marginBottom: spacing.xxxs,
  },
  savingsHeadline: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.success,
  },
  savingsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  savingsMetaText: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colours.textSecondary,
  },
  savingsTerm: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colours.success,
    backgroundColor: colours.successLight,
    borderRadius: radii.status,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
  },
  savingsManageRow: {
    borderTopWidth: 1,
    borderTopColor: colours.successBorder,
    paddingTop: spacing.xs,
    marginTop: spacing.xxs,
  },
  savingsManageText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    lineHeight: 17,
    color: colours.secondary,
  },
  nudgeCard: {
    minHeight: 66,
    flexDirection: 'row',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  nudgeIcon: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.white,
  },
  nudgeCopy: {
    flex: 1,
    minWidth: 0,
  },
  nudgeTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: colours.textPrimary,
  },
  nudgeBody: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
  },
  nudgeCtaText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    color: colours.primary,
  },
  quickActionsCard: {
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    borderRadius: radii.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  recentNotice: {
    borderTopWidth: 1,
    borderTopColor: colours.surfaceStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  recentNoticeText: {
    ...fontFaces.body.regular,
    flex: 1,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colours.textSecondary,
  },
});
