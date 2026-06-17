import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { ProgressBar } from '@oskarfigura/ui-native';
import { LoanInsightSummary } from '@/shared/domain/loans/loanInsightSummary';
import { LoanResult } from '@/shared/domain/results/loanResultRoute';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';
import { colours, spacing } from '@/shared/ui/theme';
import { monthsBetween } from '@/shared/lib/utils/date';

interface Props {
  loan: SavedLoan;
  result: LoanResult;
  summary: LoanInsightSummary;
  style?: StyleProp<ViewStyle>;
}

export const SavedLoanProgressBar = ({ loan, result, summary, style }: Props) => {
  const { t } = useTranslation();
  const elapsedMonths = Math.max(0, monthsBetween(loan.formSnapshot.startDate, new Date()));
  const totalMonths = Math.max(loan.resultSnapshot.totalTermInMonths, result.tableItems.length, 1);
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
  const principalAmount = Math.max(result.amount - result.downPayment, 0);
  const currentBalanceIndex = Math.min(elapsedMonths, result.tableItems.length) - 1;
  const currentBalanceValue = currentBalanceIndex >= 0
    ? Number(result.tableItems[currentBalanceIndex]?.ending ?? principalAmount)
    : principalAmount;
  const safeCurrentBalance = Number.isFinite(currentBalanceValue) ? currentBalanceValue : principalAmount;
  // Loan-level lump-sum events aren't in the amortisation table. Subtract them so
  // the progress bar reflects actual payments made, not just the scheduled balance.
  const today = new Date().toISOString().slice(0, 10);
  const lumpSumOffset = loan.category === 'loan'
    ? (loan.events ?? [])
        .filter(e => e.type === 'lumpOverpayment' && !e.dealId && e.date <= today)
        .reduce((sum, e) => sum + (e.amount ?? 0), 0)
    : 0;
  const adjustedBalance = Math.max(0, safeCurrentBalance - lumpSumOffset);
  const balancePaidProgress = principalAmount > 0
    ? Math.max(0, Math.min((principalAmount - adjustedBalance) / principalAmount, 1))
    : 0;
  const progressValue = loan.category === 'mortgage'
    ? summary.progress?.value ?? 0
    : balancePaidProgress;
  const progressPercent = Math.round(progressValue * 100);
  const remainingYears = Math.floor(remainingMonths / 12);
  const remainingExtraMonths = remainingMonths % 12;
  const remainingLabel = remainingMonths <= 0
    ? t('saved.completed')
    : remainingYears > 0
      ? t('saved.remainingYears', {
        years: remainingYears,
        months: remainingExtraMonths,
        suffix: remainingExtraMonths > 0 ? ` ${remainingExtraMonths} ${t('results.months')}` : '',
      })
      : t('saved.remainingMonths', { months: remainingMonths });

  return (
    <View style={[styles.progressBlock, style]}>
      <View style={styles.progressHeader}>
        <AppText variant="helper" tone="muted" numberOfLines={1} style={styles.progressLabel}>
          {t('saved.balancePaidWithPercent', { percent: progressPercent })}
        </AppText>
        <AppText variant="helper" tone="muted" numberOfLines={1} style={styles.remainingLabel}>
          {remainingLabel}
        </AppText>
      </View>
      <ProgressBar
        progress={progressValue}
        color={loan.category === 'mortgage' ? colours.teal : colours.accent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  progressBlock: {
    gap: spacing.xxs,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressLabel: {
    flex: 1,
    minWidth: 0,
  },
  remainingLabel: {
    flexShrink: 0,
    maxWidth: '50%',
    textAlign: 'right',
  },
});
