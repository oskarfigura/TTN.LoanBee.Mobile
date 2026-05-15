import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildResultSnapshot } from '@/loans/loanGroupFactory';
import { computeLoanWithEvents } from '@/loans/loanScenario';
import { upsertMortgageEvent } from '@/mortgage/events';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { savedLoansStorage } from '@/storage/savedLoans';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppTextInput, FieldLabel, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { CURRENCIES } from '@/currency/currencies';
import { colours, layout, spacing } from '@/theme';
import { MortgageEvent } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';

const oneYearFromNow = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return formatIsoDate(d);
};

export default function NewLoanLumpSumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(oneYearFromNow());
  const [note, setNote] = useState('');

  if (!loan) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('loan.addLumpSum')}
          variant="editor"
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <AppText variant="title3">{t('saved.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} style={styles.notFoundBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const currencySymbol = CURRENCIES.find(c => c.code === loan.currency)?.symbol ?? '£';
  const loanStartDate = parseDateLabelValue(loan.formSnapshot.startDate) ?? new Date();
  const today = new Date();
  const minDate = loanStartDate > today ? loanStartDate : today;
  const maxDate = (() => {
    const d = new Date(loanStartDate);
    d.setMonth(d.getMonth() + loan.resultSnapshot.totalTermInMonths - 1);
    return d;
  })();

  const handleSave = () => {
    const numericAmount = parseFloat(amount) || 0;

    if (numericAmount <= 0) {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventAmount'));
      return;
    }
    if (!isValidIsoDate(date)) {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventDate'));
      return;
    }

    const now = new Date().toISOString();
    const event: MortgageEvent = {
      id: createLocalId(),
      createdAt: now,
      updatedAt: now,
      type: 'lumpOverpayment',
      date,
      amount: numericAmount,
      note: note.trim() || undefined,
    };

    const updatedLoan = upsertMortgageEvent(loan, event);
    const scenario = computeLoanWithEvents(updatedLoan);
    const baseResult = getResultForSavedLoan(loan);

    savedLoansStorage.update({
      ...updatedLoan,
      resultSnapshot: {
        ...buildResultSnapshot(baseResult, loan.resultSnapshot.totalInterestPaidBaseline),
        totalInterestPaid: scenario.totalInterestPaid,
        totalTermInMonths: scenario.totalTermInMonths,
      },
      updatedAt: now,
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('loan.addLumpSum')}
        subtitle={t('loan.addLumpSumHelp')}
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FinancialDisclaimer dismissible style={styles.disclaimer} />

        <View style={styles.field}>
          <FieldLabel>{t('recalculate.lumpSumLabel')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="5000"
              autoFocus
            />
          </InputSurface>
        </View>

        <View style={styles.field}>
          <DatePickerField
            label={t('recalculate.lumpSumDateLabel')}
            value={date}
            onChange={setDate}
            hint={t('recalculate.lumpSumDateHint')}
            minimumDate={minDate}
            maximumDate={maxDate}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.notes')}</FieldLabel>
          <InputSurface multiline>
            <AppTextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder={t('mortgage.notesPlaceholder')}
              multiline
            />
          </InputSurface>
        </View>

        <Button label={t('mortgage.saveEvent')} onPress={handleSave} style={styles.saveBtn} />
        <Button label={t('save.cancel')} onPress={() => router.back()} variant="ghost" style={styles.cancelBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundBtn: { marginTop: spacing.md },
  disclaimer: { marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  noteInput: { minHeight: 88, textAlignVertical: 'top' },
  saveBtn: { marginTop: spacing.xl },
  cancelBtn: { marginTop: spacing.xs },
});
