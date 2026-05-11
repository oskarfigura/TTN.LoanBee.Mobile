import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DealEditorForm } from '@/components/loans/DealEditorForm';
import {
  buildNextDealDraft,
  getChronologicalDeals,
  getMortgageTermInMonths,
  getNextDealStartDate,
  getSingleDraftDeal,
  normaliseDealChain,
} from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

export default function NewDealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);
  const existingDraft = useMemo(() => (loan ? getSingleDraftDeal(loan) : undefined), [loan]);

  useEffect(() => {
    if (!loan || !existingDraft) return;

    router.replace(`/saved/${loan.id}/deals/${existingDraft.id}`);
  }, [existingDraft, loan, router]);

  const initialDeal = useMemo<LoanDeal | null>(() => {
    if (!loan || existingDraft) return null;
    return buildNextDealDraft(loan, createLocalId());
  }, [existingDraft, loan]);

  if (loan && existingDraft) {
    return <SafeAreaView style={styles.safe} edges={['bottom']} />;
  }

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

  const deals = getChronologicalDeals(loan);
  const previous = deals[deals.length - 1];
  const canPublish = !previous || previous.status === 'completed';
  const fixedStartDate = previous ? getNextDealStartDate(previous, loan.formSnapshot.startDate) : undefined;

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
          fixedStartDate={fixedStartDate}
          mortgageStartDate={loan.formSnapshot.startDate}
          mortgageTermInMonths={getMortgageTermInMonths(loan)}
          onSave={deal => {
            savedLoansStorage.update(normaliseDealChain({
              ...loan,
              deals: [...loan.deals, deal],
              status: 'tracked',
            }, deal.id));
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
