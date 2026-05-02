import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { SavedLoan } from '@/types/SavedLoan';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colours, spacing } from '@/theme';
import { formatCurrency } from '@/currency/format';
import { monthsBetween } from '@/utils/date';
import { getMortgageTrackerSummary } from '@/mortgage/tracker';
import { PinIcon } from '@/components/loans/LoanIcons';

interface Props {
  loan: SavedLoan;
  onPress: () => void;
  onDelete: () => void;
  onTogglePinned: () => void;
}

export const LoanProfileCard = ({ loan, onPress, onDelete, onTogglePinned }: Props) => {
  const { t } = useTranslation();
  const now = new Date();
  const elapsed = monthsBetween(loan.formSnapshot.startDate, now);
  const total = loan.resultSnapshot.totalTermInMonths;
  const progress = Math.min(elapsed / total, 1.0);
  const remaining = Math.max(0, total - elapsed);
  const hasSavings = (loan.formSnapshot.additionalMonthlyPayment ?? 0) > 0;
  const savings = loan.resultSnapshot.totalInterestPaidBaseline - loan.resultSnapshot.totalInterestPaid;
  const mortgageSummary = loan.category === 'mortgage'
    ? getMortgageTrackerSummary(loan, now)
    : null;
  const payment = mortgageSummary?.currentDeal?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments;
  const progressValue = mortgageSummary?.balanceProgress ?? progress;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card} variant="accent" padding={20}>
        <View style={styles.header}>
          <View>
            <AppText variant="title2">{loan.nickname}</AppText>
            {loan.lender ? <AppText variant="bodySm" tone="muted" style={styles.lender}>{loan.lender}</AppText> : null}
          </View>
          <Badge label={t(`saved.category.${loan.category}`)} />
        </View>

        <AppText variant="metricMd" tone="accent" style={styles.payment}>
          {formatCurrency(payment, loan.currency)} / mo
        </AppText>

        <View style={styles.progressContainer}>
          <ProgressBar progress={progressValue} color={loan.category === 'mortgage' ? colours.tealDeep : colours.primary} />
          <AppText variant="helper" tone="muted" style={styles.progressLabel}>
            {mortgageSummary
              ? t('mortgage.balancePaid', { percent: Math.round(progressValue * 100) })
              : remaining > 0
                ? t('saved.progress', { months: remaining, total })
                : t('saved.completed')}
          </AppText>
        </View>

        {((hasSavings && savings > 0) || (mortgageSummary?.overpaymentSavingsEstimate ?? 0) > 0) && (
          <View style={styles.savingsBadge}>
            <AppText variant="labelMd" tone="success">
              {t('saved.overpaymentSaving', {
                amount: formatCurrency(
                  mortgageSummary?.overpaymentSavingsEstimate ?? savings,
                  loan.currency,
                ),
              })}
            </AppText>
          </View>
        )}

        <View style={styles.footer}>
          <AppText variant="helper" tone="muted">{t('saved.startedOn', { date: loan.formSnapshot.startDate })}</AppText>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={onTogglePinned} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={styles.pinBtn}>
                <PinIcon color={colours.primary} size={14} />
                <AppText variant="labelMd" tone="accent">
                  {loan.pinnedToDashboard ? t('mortgage.pinned') : t('mortgage.pinToDashboard')}
                </AppText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppText variant="labelMd" tone="error">{t('saved.delete')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  lender: {
    marginTop: 2,
  },
  payment: {
    marginVertical: spacing.sm,
  },
  progressContainer: { marginBottom: 8 },
  progressLabel: {
    marginTop: spacing.xs,
  },
  savingsBadge: {
    backgroundColor: colours.successSurface,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colours.successBorder,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colours.borderSoft,
    paddingTop: 8,
    marginTop: 4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
