import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { AppTextInput, FieldLabel, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { HeaderCloseAction } from '@/components/ui/HeaderCloseAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CURRENCIES } from '@/currency/currencies';
import { getCurrentDeal, projectDeal, recalculateLaterDealOpeningBalances } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, layout, spacing } from '@/theme';
import { MortgageEvent } from '@/types/SavedLoan';
import { formatFriendlyDate, formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { createLocalId } from '@/utils/id';

type OverpaymentRow = { id: string; date: string; amount: string };

type OverpaymentEntryRowProps = {
  row: OverpaymentRow;
  currencySymbol: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onDateChange: (id: string, date: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onRemove: (id: string) => void;
};

const OverpaymentEntryRow = ({
  row,
  currencySymbol,
  minimumDate,
  maximumDate,
  onDateChange,
  onAmountChange,
  onRemove,
}: OverpaymentEntryRowProps) => {
  const { i18n } = useTranslation();
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerValue = parseDateLabelValue(row.date) ?? new Date();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setPickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onDateChange(row.id, formatIsoDate(selectedDate));
  };

  return (
    <View style={styles.overpaymentRow}>
      <View style={styles.overpaymentDateInput}>
        <>
          <TouchableOpacity onPress={() => setPickerVisible(current => !current)} activeOpacity={0.84}>
            <InputSurface>
              <AppTextInput
                value={formatFriendlyDate(row.date, i18n.language)}
                editable={false}
                placeholder=""
                style={styles.dateText}
              />
            </InputSurface>
          </TouchableOpacity>
          {pickerVisible ? (
            <InputSurface style={Platform.OS === 'ios' ? styles.iosDateSurface : undefined}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleDateChange}
              />
            </InputSurface>
          ) : null}
        </>
      </View>
      <InputSurface style={styles.overpaymentAmountInput}>
        <InputAffix>{currencySymbol}</InputAffix>
        <AppTextInput
          value={row.amount}
          onChangeText={amount => onAmountChange(row.id, amount)}
          keyboardType="decimal-pad"
          placeholder="5000"
        />
      </InputSurface>
      <TouchableOpacity style={styles.overpaymentRemove} onPress={() => onRemove(row.id)} activeOpacity={0.84}>
        <AppText style={styles.overpaymentRemoveText}>×</AppText>
      </TouchableOpacity>
    </View>
  );
};

export default function CompleteCurrentDealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);
  const currentDeal = loan ? getCurrentDeal(loan) : undefined;
  const currencySymbol = CURRENCIES.find(c => c.code === loan?.currency)?.symbol ?? '£';
  const defaultCompletedAt = currentDeal?.endDate ?? formatIsoDate(new Date());
  const getExpectedClosingBalance = (completionDate: string): number => {
    const projectionDate = parseDateLabelValue(completionDate) ?? new Date();
    return currentDeal && loan
      ? projectDeal(currentDeal, loan.events, projectionDate).balance
      : currentDeal?.openingBalance ?? 0;
  };

  const [completedAt, setCompletedAt] = useState(defaultCompletedAt);
  const [closingBalance, setClosingBalance] = useState(() => String(getExpectedClosingBalance(defaultCompletedAt)));
  const [closingBalanceEdited, setClosingBalanceEdited] = useState(false);
  const [feesAdded, setFeesAdded] = useState('0');
  const [notes, setNotes] = useState('');
  const [overpayments, setOverpayments] = useState<OverpaymentRow[]>([]);
  const minimumCompletionDate = currentDeal ? parseDateLabelValue(currentDeal.startDate) ?? undefined : undefined;

  const addOverpaymentRow = () =>
    setOverpayments(prev => [...prev, { id: createLocalId('op'), date: currentDeal?.startDate ?? formatIsoDate(new Date()), amount: '' }]);

  const updateOverpaymentRow = (id: string, field: keyof Omit<OverpaymentRow, 'id'>, value: string) =>
    setOverpayments(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));

  const removeOverpaymentRow = (id: string) =>
    setOverpayments(prev => prev.filter(row => row.id !== id));

  const handleCompletedAtChange = (value: string) => {
    setCompletedAt(value);
    if (!closingBalanceEdited) {
      setClosingBalance(String(getExpectedClosingBalance(value)));
    }
  };

  const handleClosingBalanceChange = (value: string) => {
    setClosingBalanceEdited(true);
    setClosingBalance(value);
  };

  if (!loan || !currentDeal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.completeCurrentDeal')}
          variant="editor"
          leftAction={<HeaderCloseAction onPress={() => router.back()} />}
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
        variant="editor"
        leftAction={<HeaderCloseAction onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.field}>
          <DatePickerField
            label={t('mortgage.completionDate')}
            value={completedAt}
            onChange={handleCompletedAtChange}
            hint={t('mortgage.dateFormatHint')}
            minimumDate={minimumCompletionDate}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.closingBankBalance')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={closingBalance}
              onChangeText={handleClosingBalanceChange}
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
          <FieldLabel>{t('mortgage.overpaymentsDuringDeal')}</FieldLabel>
          {overpayments.map(row => (
            <OverpaymentEntryRow
              key={row.id}
              row={row}
              currencySymbol={currencySymbol}
              minimumDate={minimumCompletionDate}
              maximumDate={parseDateLabelValue(completedAt) ?? undefined}
              onDateChange={(rowId, date) => updateOverpaymentRow(rowId, 'date', date)}
              onAmountChange={(rowId, amount) => updateOverpaymentRow(rowId, 'amount', amount)}
              onRemove={removeOverpaymentRow}
            />
          ))}
          <Button
            label={t('mortgage.addOverpaymentRow')}
            onPress={addOverpaymentRow}
            variant="icon-pill"
            style={styles.addOverpaymentButton}
          />
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
            if (!isValidIsoDate(completedAt)) {
              Alert.alert(t('mortgage.invalidDealTitle'), t('mortgage.invalidCompletionDetails'));
              return;
            }

            const now = new Date().toISOString();
            const validOverpayments: MortgageEvent[] = overpayments
              .filter(row =>
                isValidIsoDate(row.date) &&
                row.date >= currentDeal.startDate &&
                row.date <= completedAt &&
                Number(row.amount) > 0
              )
              .map(row => ({
                id: createLocalId('ev'),
                createdAt: now,
                updatedAt: now,
                dealId: currentDeal.id,
                type: 'lumpOverpayment' as const,
                date: row.date,
                amount: Number(row.amount),
              }));

            const updatedLoan = {
              ...loan,
              events: [...loan.events, ...validOverpayments],
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
                  updatedAt: now,
                }
                : deal),
            };
            savedLoansStorage.update(recalculateLaterDealOpeningBalances(updatedLoan, currentDeal.id));
            router.back();
          }}
          style={styles.action}
        />
        <Button
          label={t('save.cancel')}
          onPress={() => router.back()}
          variant="ghost"
          style={styles.cancelBtn}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  keyboardView: { flex: 1 },
  container: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: spacing.md },
  field: { marginTop: spacing.md },
  overpaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  overpaymentDateInput: { flex: 3 },
  iosDateSurface: { justifyContent: 'center' },
  dateText: { color: colours.textPrimary },
  overpaymentAmountInput: { flex: 2 },
  overpaymentRemove: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overpaymentRemoveText: {
    color: colours.error,
    fontSize: 22,
  },
  addOverpaymentButton: { marginTop: spacing.xs },
  noteInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  action: { marginTop: spacing.xl },
  cancelBtn: { marginTop: spacing.xs },
});
