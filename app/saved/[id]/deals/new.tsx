import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DealEditorForm } from '@/components/loans/DealEditorForm';
import { getMortgageTrackerSummary, getPublishedDeals } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

const addYears = (dateString: string, years: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split('T')[0];
};

const addDays = (dateString: string, days: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export default function NewDealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const initialDeal = useMemo<LoanDeal | null>(() => {
    if (!loan) return null;
    const summary = getMortgageTrackerSummary(loan);
    const published = getPublishedDeals(loan);
    const previous = published[published.length - 1];
    const startDate = previous ? addDays(previous.endDate, 1) : loan.formSnapshot.startDate;
    const now = new Date().toISOString();

    return {
      id: createLocalId(),
      createdAt: now,
      updatedAt: now,
      name: '5-year Fixed',
      lender: loan.lender,
      status: 'draft',
      startDate,
      endDate: addYears(startDate, 5),
      openingBalance: summary.currentBalance,
      interestRate: previous?.interestRate ?? loan.formSnapshot.interest,
      repaymentType: previous?.repaymentType ?? 'repayment',
      monthlyPayment: previous?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments,
      regularOverpayment: previous?.regularOverpayment ?? loan.formSnapshot.additionalMonthlyPayment ?? 0,
      remainingTermInYears: previous?.remainingTermInYears ?? loan.formSnapshot.termInYears,
      remainingTermInMonths: previous?.remainingTermInMonths ?? loan.formSnapshot.termInMonths,
    };
  }, [loan]);

  if (!loan || !initialDeal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.addNextDeal')}
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('saved.notFound')}</Text>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const published = getPublishedDeals(loan);
  const previous = published[published.length - 1];
  const canPublish = !previous || previous.status === 'completed';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.addNextDeal')}
        subtitle={loan.nickname}
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {!canPublish && previous && (
          <View style={styles.blocker}>
            <Text style={styles.blockerTitle}>{t('mortgage.completeBeforeNewDealTitle')}</Text>
            <Text style={styles.blockerText}>{t('mortgage.completeBeforeNewDealMessage')}</Text>
            <Button
              label={t('mortgage.completeCurrentDeal')}
              onPress={() => router.push(`/saved/${loan.id}/complete-current`)}
              style={styles.blockerAction}
            />
          </View>
        )}
        <DealEditorForm
          currency={loan.currency}
          initialDeal={initialDeal}
          canPublish={canPublish}
          onSave={deal => {
            savedLoansStorage.update({
              ...loan,
              deals: [...loan.deals, deal],
              status: 'tracked',
            });
            router.back();
          }}
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
  blocker: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    padding: 16,
    marginBottom: 16,
  },
  blockerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  blockerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
  blockerAction: { marginTop: 14 },
});
