import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { DismissibleBanner } from '@oskarfigura/ui-native';
import { HeaderCloseAction } from '@/components/ui/HeaderCloseAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DealEditorForm } from '@/components/loans/DealEditorForm';
import {
  buildNextDealDraft,
  getEstimateBackedDeal,
  getChronologicalDeals,
  getMortgageTermInMonths,
  getNextDealStartDate,
  getPublishedDeals,
  getSingleDraftDeal,
  isEstimateBackedDeal,
  normaliseDealChain,
  withMortgageTermInMonths,
} from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { colours } from '@/theme';

export default function NewDealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);
  const existingDraft = useMemo(() => (loan ? getSingleDraftDeal(loan) : undefined), [loan]);
  const estimateDeal = useMemo(() => (loan ? getEstimateBackedDeal(loan) : undefined), [loan]);
  const realPublishedDeals = useMemo(() => (loan ? getPublishedDeals(loan) : []), [loan]);

  useEffect(() => {
    if (!loan || !existingDraft) return;

    router.replace(`/saved/${loan.id}/deals/${existingDraft.id}`);
  }, [existingDraft, loan, router]);

  useEffect(() => {
    if (!loan || existingDraft || !estimateDeal || realPublishedDeals.length > 0) return;

    router.replace(`/saved/${loan.id}/deals/${estimateDeal.id}`);
  }, [estimateDeal, existingDraft, loan, realPublishedDeals.length, router]);

  const initialDeal = useMemo<LoanDeal | null>(() => {
    if (!loan || existingDraft || (estimateDeal && realPublishedDeals.length === 0)) return null;
    return buildNextDealDraft(loan, createLocalId());
  }, [estimateDeal, existingDraft, loan, realPublishedDeals.length]);

  if (loan && (existingDraft || (estimateDeal && realPublishedDeals.length === 0))) {
    return <SafeAreaView style={styles.safe} edges={['bottom']} />;
  }

  if (!loan || !initialDeal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.addNextDeal')}
          variant="editor"
          leftAction={<HeaderCloseAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <AppText variant="title3" style={styles.notFoundText}>{t('saved.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const deals = getChronologicalDeals(loan).filter(item => !isEstimateBackedDeal(loan, item));
  const previous = deals[deals.length - 1];
  const canPublish = !previous || previous.status === 'completed';
  const fixedStartDate = previous ? getNextDealStartDate(previous, loan.formSnapshot.startDate) : undefined;
  const isInitialDeal = !previous;

  const banner = !canPublish && previous ? (
    <DismissibleBanner
      tone="warning"
      title={t('mortgage.completeBeforeNewDealTitle')}
      message={t('mortgage.completeBeforeNewDealMessage')}
      action={{
        label: t('mortgage.completeCurrentDeal'),
        onPress: () => router.push(`/saved/${loan.id}/complete-current`),
      }}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={isInitialDeal ? t('mortgage.addFirstDeal') : t('mortgage.addNextDeal')}
        variant="editor"
        leftAction={<HeaderCloseAction onPress={() => router.back()} />}
      />
      <DealEditorForm
        currency={loan.currency}
        initialDeal={initialDeal}
        canPublish={canPublish}
        fixedStartDate={fixedStartDate}
        mortgageStartDate={loan.formSnapshot.startDate}
        mortgageTermInMonths={getMortgageTermInMonths(loan)}
        isInitialDeal={isInitialDeal}
        canEditMortgageTerm
        onCancel={() => router.back()}
        banner={banner}
        onSave={(deal, updatedMortgageTermInMonths) => {
          const nextLoan = updatedMortgageTermInMonths
            ? withMortgageTermInMonths(loan, updatedMortgageTermInMonths)
            : loan;
          savedLoansStorage.update(normaliseDealChain({
            ...nextLoan,
            deals: [...nextLoan.deals, deal],
            status: 'tracked',
          }, deal.id));
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: 16 },
});
