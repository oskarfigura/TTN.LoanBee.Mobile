import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { savedLoansStorage } from '@/storage/savedLoans';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { ResultsSummary } from '@/components/calculator/ResultsSummary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { formatCurrency } from '@/currency/format';
import { SafeAreaView } from 'react-native-safe-area-context';

const monthsBetween = (startDate: string, now: Date): number => {
  const start = new Date(startDate);
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
};

export default function LoanDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const result = useMemo(() => {
    if (!loan) return null;
    const fs = loan.formSnapshot;
    return getLoanCalculations(
      fs.loanAmount, fs.interest, fs.termInYears, fs.termInMonths,
      fs.desiredMonthlyPayment ?? 0,
      fs.calculationType.toLowerCase() as LoanCalculationType,
      fs.downPayment,
      fs.downPaymentType.toLowerCase() as DownPaymentType,
      fs.additionalMonthlyPayment ?? 0,
      fs.startDate,
    );
  }, [loan]);

  if (!loan || !result) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Loan not found</Text>
        <Button label="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const now = new Date();
  const elapsed = monthsBetween(loan.formSnapshot.startDate, now);
  const total = loan.resultSnapshot.totalTermInMonths;
  const progress = Math.min(elapsed / total, 1.0);
  const remaining = Math.max(0, total - elapsed);
  const hasSavings = (loan.formSnapshot.additionalMonthlyPayment ?? 0) > 0;
  const savings = loan.resultSnapshot.totalInterestPaidBaseline - loan.resultSnapshot.totalInterestPaid;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.nickname}>{loan.nickname}</Text>
          {loan.lender && <Text style={styles.lender}>{loan.lender}</Text>}
        </View>

        <ResultsSummary
          monthlyPayments={result.monthlyPayments}
          totalInterestPaid={result.totalInterestPaid}
          totalAmountPaid={result.totalAmountPaid}
          termInYears={result.termInYears}
          termInMonths={result.termInMonths}
          currency={loan.currency}
        />

        {/* Progress */}
        <Card style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Loan Progress</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {remaining > 0
              ? `${remaining} months of ${total} remaining`
              : 'Completed'}
          </Text>
        </Card>

        {/* Overpayment Savings */}
        {hasSavings && savings > 0 && (
          <Card style={styles.savingsCard}>
            <Text style={styles.savingsTitle}>Overpayment Savings</Text>
            <Text style={styles.savingsAmount}>
              {formatCurrency(savings, loan.currency)}
            </Text>
            <Text style={styles.savingsSubtitle}>saved in interest by overpaying</Text>
          </Card>
        )}

        <Button
          label="Edit Loan"
          onPress={() => router.push(`/saved/${id}/edit`)}
          variant="secondary"
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  titleRow: { marginBottom: 16 },
  nickname: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  lender: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginTop: 2,
  },
  progressCard: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginBottom: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colours.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colours.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  savingsCard: {
    backgroundColor: colours.successSurface,
    borderColor: colours.successBorder,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  savingsTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.secondary,
    marginBottom: 4,
  },
  savingsAmount: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.secondary,
  },
  savingsSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.secondary,
    marginTop: 2,
  },
});
