import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SavedLoan } from '@/types/SavedLoan';
import { Card } from '@/components/ui/Card';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { formatCurrency } from '@/currency/format';

interface Props {
  loan: SavedLoan;
  onPress: () => void;
  onDelete: () => void;
}

const monthsBetween = (startDate: string, now: Date): number => {
  const start = new Date(startDate);
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
};

export const LoanProfileCard = ({ loan, onPress, onDelete }: Props) => {
  const { t } = useTranslation();
  const now = new Date();
  const elapsed = monthsBetween(loan.formSnapshot.startDate, now);
  const total = loan.resultSnapshot.totalTermInMonths;
  const progress = Math.min(elapsed / total, 1.0);
  const remaining = Math.max(0, total - elapsed);
  const hasSavings = (loan.formSnapshot.additionalMonthlyPayment ?? 0) > 0;
  const savings = loan.resultSnapshot.totalInterestPaidBaseline - loan.resultSnapshot.totalInterestPaid;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.nickname}>{loan.nickname}</Text>
            {loan.lender && <Text style={styles.lender}>{loan.lender}</Text>}
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {t(`saved.category.${loan.category}`)}
            </Text>
          </View>
        </View>

        <Text style={styles.payment}>
          {formatCurrency(loan.resultSnapshot.monthlyPayments, loan.currency)} / mo
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {remaining > 0
              ? t('saved.progress', { months: remaining, total })
              : 'Completed'}
          </Text>
        </View>

        {/* Overpayment Savings */}
        {hasSavings && savings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              {t('saved.overpaymentSaving', { amount: formatCurrency(savings, loan.currency) })}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.date}>Started {loan.formSnapshot.startDate}</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteBtn}>{t('saved.delete')}</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  nickname: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  lender: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colours.border,
  },
  categoryText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  payment: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.primary,
    marginVertical: 8,
  },
  progressContainer: { marginBottom: 8 },
  progressTrack: {
    height: 6,
    backgroundColor: colours.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colours.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  savingsBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  savingsText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.secondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: 8,
    marginTop: 4,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  deleteBtn: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.error,
  },
});
