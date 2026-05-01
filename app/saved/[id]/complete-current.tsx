import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CURRENCIES } from '@/currency/currencies';
import { getCurrentDeal, projectDeal } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

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
          <Text style={styles.notFoundText}>{t('mortgage.noCurrentDeal')}</Text>
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
        <Text style={styles.label}>{t('mortgage.completionDate')}</Text>
        <TextInput
          style={styles.input}
          value={completedAt}
          onChangeText={setCompletedAt}
          placeholder="2031-06-01"
          placeholderTextColor={colours.textSecondary}
        />

        <Text style={styles.label}>{t('mortgage.closingBankBalance')}</Text>
        <View style={styles.inputShell}>
          <Text style={styles.affix}>{currencySymbol}</Text>
          <TextInput
            style={styles.inputField}
            value={closingBalance}
            onChangeText={setClosingBalance}
            keyboardType="decimal-pad"
            placeholder="238420"
            placeholderTextColor={colours.textSecondary}
          />
        </View>

        <Text style={styles.label}>{t('mortgage.feesAdded')}</Text>
        <View style={styles.inputShell}>
          <Text style={styles.affix}>{currencySymbol}</Text>
          <TextInput
            style={styles.inputField}
            value={feesAdded}
            onChangeText={setFeesAdded}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colours.textSecondary}
          />
        </View>

        <Text style={styles.label}>{t('mortgage.notes')}</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('mortgage.notesPlaceholder')}
          placeholderTextColor={colours.textSecondary}
          multiline
        />

        <Button
          label={t('mortgage.completeDeal')}
          onPress={() => {
            savedLoansStorage.update({
              ...loan,
              deals: loan.deals.map(deal => deal.id === currentDeal.id
                ? {
                  ...deal,
                  status: 'completed',
                  completion: {
                    completedAt,
                    closingBalance: Number(closingBalance) || 0,
                    feesAdded: Number(feesAdded) || 0,
                    notes: notes.trim() || undefined,
                  },
                  updatedAt: new Date().toISOString(),
                }
                : deal),
            });
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
  container: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  helper: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    minHeight: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  noteInput: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
    paddingVertical: 10,
  },
  affix: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  action: { marginTop: 24 },
});
