import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { AppTextInput, FieldLabel, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CURRENCIES } from '@/currency/currencies';
import { getCurrentDeal, projectDeal, recalculateLaterDealOpeningBalances } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, layout, spacing } from '@/theme';

export default function CompleteCurrentDealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);
  const currentDeal = loan ? getCurrentDeal(loan) : undefined;
  const projected = currentDeal && loan ? projectDeal(currentDeal, loan.events) : null;
  const currencySymbol = CURRENCIES.find(c => c.code === loan?.currency)?.symbol ?? '£';

  const [completedAt, setCompletedAt] = useState(currentDeal?.endDate ?? new Date().toISOString().split('T')[0]);
  const [closingBalance, setClosingBalance] = useState(String(projected?.balance ?? currentDeal?.openingBalance ?? 0));
  const [feesAdded, setFeesAdded] = useState('0');
  const [notes, setNotes] = useState('');

  if (!loan || !currentDeal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.completeCurrentDeal')}
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <AppText variant="title3" style={styles.notFoundText}>{t('mortgage.noCurrentDeal')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.completeCurrentDeal')}
        subtitle={t('mortgage.completeDealHelp')}
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.field}>
          <FieldLabel>{t('mortgage.completionDate')}</FieldLabel>
          <InputSurface>
            <AppTextInput
              value={completedAt}
              onChangeText={setCompletedAt}
              placeholder="2031-06-01"
            />
          </InputSurface>
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.closingBankBalance')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={closingBalance}
              onChangeText={setClosingBalance}
              keyboardType="decimal-pad"
              placeholder="238420"
            />
          </InputSurface>
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.feesAdded')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={feesAdded}
              onChangeText={setFeesAdded}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </InputSurface>
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.notes')}</FieldLabel>
          <InputSurface multiline>
            <AppTextInput
              style={styles.noteInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('mortgage.notesPlaceholder')}
              multiline
            />
          </InputSurface>
        </View>

        <Button
          label={t('mortgage.completeDeal')}
          onPress={() => {
            const updatedLoan = {
              ...loan,
              deals: loan.deals.map(deal => deal.id === currentDeal.id
                ? {
                  ...deal,
                  status: 'completed' as const,
                  completion: {
                    completedAt,
                    closingBalance: Number(closingBalance) || 0,
                    feesAdded: Number(feesAdded) || 0,
                    notes: notes.trim() || undefined,
                  },
                  updatedAt: new Date().toISOString(),
                }
                : deal),
            };
            savedLoansStorage.update(recalculateLaterDealOpeningBalances(updatedLoan, currentDeal.id));
            router.back();
          }}
          style={styles.action}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: spacing.md },
  field: { marginTop: spacing.md },
  noteInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  action: { marginTop: spacing.xl },
});
