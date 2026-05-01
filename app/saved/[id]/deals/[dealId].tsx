import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { DealEditorForm } from '@/components/loans/DealEditorForm';
import { canActivateDeal } from '@/mortgage/tracker';
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
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{t('saved.notFound')}</Text>
        <Button label={t('common.goBack')} onPress={() => router.back()} />
      </View>
    );
  }

  const saveDeal = (updatedDeal: LoanDeal) => {
    const commit = () => {
      savedLoansStorage.update({
        ...loan,
        deals: loan.deals.map(item => item.id === updatedDeal.id ? updatedDeal : item),
      });
      router.back();
    };

    if (deal.status === 'completed') {
      Alert.alert(
        t('mortgage.editCompletedTitle'),
        t('mortgage.editCompletedMessage'),
        [
          { text: t('results.cancelLeave'), style: 'cancel' },
          { text: t('edit.save'), onPress: commit },
        ],
      );
      return;
    }

    commit();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <DealEditorForm
          currency={loan.currency}
          initialDeal={deal}
          canPublish={canActivateDeal(loan, deal.id)}
          onSave={saveDeal}
          onDeleteDraft={deal.status === 'draft' ? () => {
            savedLoansStorage.update({
              ...loan,
              deals: loan.deals.filter(item => item.id !== deal.id),
            });
            router.back();
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
