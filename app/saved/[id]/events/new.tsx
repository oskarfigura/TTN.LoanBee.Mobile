import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { CURRENCIES } from '@/currency/currencies';
import { getCurrentDeal, projectDeal } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { MortgageEventType } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

const eventTypes: MortgageEventType[] = [
  'lumpOverpayment',
  'missedPayment',
  'paymentHoliday',
  'balanceCheckpoint',
  'note',
];

const eventLabel = (type: MortgageEventType) => {
  if (type === 'lumpOverpayment') return 'Lump overpayment';
  if (type === 'missedPayment') return 'Missed payment';
  if (type === 'paymentHoliday') return 'Payment holiday';
  if (type === 'balanceCheckpoint') return 'Bank balance';
  return 'Note';
};

export default function NewMortgageEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type?: MortgageEventType }>();
  const loan = savedLoansStorage.getById(id);
  const currentDeal = loan ? getCurrentDeal(loan) : undefined;
  const projected = currentDeal && loan ? projectDeal(currentDeal, loan.events) : null;
  const currencySymbol = CURRENCIES.find(c => c.code === loan?.currency)?.symbol ?? '£';

  const [eventType, setEventType] = useState<MortgageEventType>(
    type && eventTypes.includes(type) ? type : 'lumpOverpayment',
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(projected ? String(projected.balance) : '');
  const [note, setNote] = useState('');

  if (!loan || !currentDeal) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{t('mortgage.noCurrentDeal')}</Text>
        <Button label={t('common.goBack')} onPress={() => router.back()} />
      </View>
    );
  }

  const needsAmount = eventType === 'lumpOverpayment';
  const needsBalance = eventType === 'balanceCheckpoint';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('mortgage.addEvent')}</Text>
        <Text style={styles.helper}>{t('mortgage.eventHelp')}</Text>

        <Text style={styles.label}>{t('mortgage.eventType')}</Text>
        <View style={styles.chips}>
          {eventTypes.map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, eventType === item && styles.chipActive]}
              onPress={() => setEventType(item)}
            >
              <Text style={[styles.chipText, eventType === item && styles.chipTextActive]}>{eventLabel(item)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('mortgage.eventDate')}</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="2026-06-01"
          placeholderTextColor={colours.textSecondary}
        />

        {needsAmount && (
          <>
            <Text style={styles.label}>{t('mortgage.amount')}</Text>
            <View style={styles.inputShell}>
              <Text style={styles.affix}>{currencySymbol}</Text>
              <TextInput
                style={styles.inputField}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="5000"
                placeholderTextColor={colours.textSecondary}
              />
            </View>
          </>
        )}

        {needsBalance && (
          <>
            <Text style={styles.label}>{t('mortgage.bankConfirmedBalance')}</Text>
            <View style={styles.inputShell}>
              <Text style={styles.affix}>{currencySymbol}</Text>
              <TextInput
                style={styles.inputField}
                value={balance}
                onChangeText={setBalance}
                keyboardType="decimal-pad"
                placeholder="238420"
                placeholderTextColor={colours.textSecondary}
              />
            </View>
          </>
        )}

        <Text style={styles.label}>{t('mortgage.notes')}</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder={t('mortgage.notesPlaceholder')}
          placeholderTextColor={colours.textSecondary}
          multiline
        />

        <Button
          label={t('mortgage.saveEvent')}
          onPress={() => {
            const numericAmount = Number(amount) || 0;
            const numericBalance = Number(balance) || 0;
            if (needsAmount && numericAmount <= 0) {
              Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventAmount'));
              return;
            }
            if (needsAmount && projected && numericAmount > projected.balance) {
              Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.overpaymentTooLarge'));
              return;
            }
            if (needsBalance && numericBalance <= 0) {
              Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventBalance'));
              return;
            }

            const now = new Date().toISOString();
            savedLoansStorage.update({
              ...loan,
              events: [
                ...loan.events,
                {
                  id: createLocalId(),
                  createdAt: now,
                  updatedAt: now,
                  dealId: currentDeal.id,
                  type: eventType,
                  date,
                  amount: needsAmount ? numericAmount : undefined,
                  balance: needsBalance ? numericBalance : undefined,
                  note: note.trim() || undefined,
                },
              ],
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colours.primary,
    backgroundColor: colours.primary,
  },
  chipText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  chipTextActive: { color: colours.white },
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
