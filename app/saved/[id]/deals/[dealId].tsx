import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DealEditorForm } from '@/components/loans/DealEditorForm';
import {
  canActivateDeal,
  getLaterDeals,
  recalculateLaterDealOpeningBalances,
  removeDealAndRecalculateLater,
} from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal } from '@/types/SavedLoan';
import { colours, fonts, fontSizes } from '@/theme';

export default function EditDealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, dealId } = useLocalSearchParams<{ id: string; dealId: string }>();
  const loan = savedLoansStorage.getById(id);
  const deal = loan?.deals.find(item => item.id === dealId);

  if (!loan || !deal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.editDeal')}
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('saved.notFound')}</Text>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const saveDeal = (updatedDeal: LoanDeal) => {
    const nextLoan = {
      ...loan,
      deals: loan.deals.map(item => item.id === updatedDeal.id ? updatedDeal : item),
    };
    const laterDeals = getLaterDeals(nextLoan, updatedDeal.id);
    const commit = (recalculateLaterDeals = false) => {
      savedLoansStorage.update(recalculateLaterDeals
        ? recalculateLaterDealOpeningBalances(nextLoan, updatedDeal.id)
        : nextLoan);
      router.back();
    };

    if (laterDeals.length > 0) {
      Alert.alert(
        t('mortgage.recalculateLaterDealsTitle'),
        t('mortgage.recalculateLaterDealsMessage', { count: laterDeals.length }),
        [
          { text: t('results.cancelLeave'), style: 'cancel' },
          { text: t('mortgage.recalculateLaterDealsAction'), onPress: () => commit(true) },
        ],
      );
      return;
    }

    if (deal.status === 'completed') {
      Alert.alert(
        t('mortgage.editCompletedTitle'),
        t('mortgage.editCompletedMessage'),
        [
          { text: t('results.cancelLeave'), style: 'cancel' },
          { text: t('edit.save'), onPress: () => commit() },
        ],
      );
      return;
    }

    commit();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.editDeal')}
        subtitle={deal.name}
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <DealEditorForm
          currency={loan.currency}
          initialDeal={deal}
          canPublish={canActivateDeal(loan, deal.id)}
          onSave={saveDeal}
          onDeleteDraft={deal.status === 'draft' ? () => {
            Alert.alert(
              t('mortgage.deleteDraftTitle'),
              t('mortgage.deleteDraftMessage'),
              [
                { text: t('results.cancelLeave'), style: 'cancel' },
                {
                  text: t('mortgage.deleteDraft'),
                  style: 'destructive',
                  onPress: () => {
                    savedLoansStorage.update(removeDealAndRecalculateLater(loan, deal.id));
                    router.back();
                  },
                },
              ],
            );
          } : undefined}
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
});
