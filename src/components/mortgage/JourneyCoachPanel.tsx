import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { formatCurrency } from '@/currency/format';
import { buildMortgageProjection } from '@/mortgage/projection';
import { getChronologicalDeals, getCurrentDeal, getDealOverpaymentImpact } from '@/mortgage/tracker';
import { JourneyStep } from '@/mortgage/journey/types';
import { LoanGroup } from '@/types/SavedLoan';
import { colours, layout, radii, spacing } from '@/theme';

interface Props {
  step: JourneyStep;
  loan: LoanGroup;
}

/**
 * Fills the space above the journey sheet with guidance: a per-step tip while
 * the user is still entering basics, switching to a live "mortgage so far"
 * recap once there's deal data to summarise.
 */
export const JourneyCoachPanel = ({ step, loan }: Props) => {
  const { t } = useTranslation();
  const tip = t(`journey.coach.${step.kind}`, { defaultValue: '' });
  const showSummary = step.group === 'deal' && getChronologicalDeals(loan).length > 0;

  // On the overpayment steps, show the interest this deal's overpayments have
  // already saved — the most motivating moment to put a number in front of the
  // user is right where they enter it.
  const isOverpaymentStep = step.kind === 'deal.regularOverpayment' || step.kind === 'deal.lumpOverpayments';
  const dealForStep = step.dealId ? loan.deals.find(d => d.id === step.dealId) : undefined;
  const dealSavings = isOverpaymentStep && dealForStep
    ? getDealOverpaymentImpact(dealForStep, loan.events).interestSaved
    : 0;

  return (
    <View style={styles.container} pointerEvents="none">
      {tip ? (
        <View style={styles.tipCard}>
          <AppText style={styles.tipIcon}>💡</AppText>
          <AppText variant="bodySm" tone="muted" style={styles.tipText}>{tip}</AppText>
        </View>
      ) : null}
      {dealSavings > 0 ? (
        <View style={styles.savingsCard}>
          <AppText variant="bodySm" tone="muted">{t('journey.coach.dealSavingsLabel')}</AppText>
          <AppText variant="bodyMd" style={styles.savingsValue}>
            {formatCurrency(dealSavings, loan.currency)}
          </AppText>
        </View>
      ) : null}
      {showSummary ? <MortgageSoFar loan={loan} /> : null}
    </View>
  );
};

const MortgageSoFar = ({ loan }: { loan: LoanGroup }) => {
  const { t } = useTranslation();
  const projection = useMemo(() => buildMortgageProjection(loan), [loan]);
  const deal = getCurrentDeal(loan) ?? getChronologicalDeals(loan).slice(-1)[0];

  const heading = [loan.nickname || t('journey.draftUntitled'), loan.lender]
    .filter(Boolean)
    .join(' · ');

  const dealLabel = deal
    ? `${deal.interestRate}% · ${deal.remainingTermInYears}${t('mortgage.totalMortgageTermYears')}`
    : undefined;

  const row = (label: string, value: string) => (
    <View style={styles.statRow}>
      <AppText variant="bodySm" tone="muted">{label}</AppText>
      <AppText variant="bodySm" style={styles.statValue}>{value}</AppText>
    </View>
  );

  return (
    <View style={styles.summaryCard}>
      <AppText variant="labelSm" tone="accent" style={styles.summaryHeading}>{heading}</AppText>
      {row(t('journey.coach.summary.borrowed'), formatCurrency(loan.formSnapshot.loanAmount, loan.currency))}
      {dealLabel ? row(t('journey.coach.summary.currentDeal'), dealLabel) : null}
      {row(t('journey.coach.summary.balanceNow'), formatCurrency(projection.currentBalance, loan.currency))}
      {row(t('journey.coach.summary.interestSoFar'), formatCurrency(projection.totalInterestPaid, loan.currency))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colours.surfaceMuted,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tipIcon: { fontSize: 16, lineHeight: 20 },
  tipText: { flex: 1 },
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colours.successSurface,
    borderWidth: 1,
    borderColor: colours.successBorder,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  savingsValue: { color: colours.success },
  summaryCard: {
    backgroundColor: colours.surfaceAccent,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  summaryHeading: { textTransform: 'uppercase', marginBottom: spacing.xxs },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statValue: { color: colours.textPrimary },
});
