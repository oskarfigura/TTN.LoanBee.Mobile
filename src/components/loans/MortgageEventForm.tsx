import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { AppTextInput, FieldLabel, InputAffix, InputSurface, PillSelector } from '@/components/ui/FormPrimitives';
import { CURRENCIES } from '@/currency/currencies';
import { projectDeal } from '@/mortgage/tracker';
import { LoanDeal, MortgageEvent, MortgageEventType } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { colours, spacing } from '@/theme';

export const mortgageEventTypes: MortgageEventType[] = [
  'balanceCheckpoint',
  'note',
  'missedPayment',
  'paymentHoliday',
];

export const mortgageEventLabelKey = (type: MortgageEventType) => {
  if (type === 'lumpOverpayment') return 'mortgage.eventLumpOverpayment';
  if (type === 'missedPayment') return 'mortgage.eventMissedPayment';
  if (type === 'paymentHoliday') return 'mortgage.eventPaymentHoliday';
  if (type === 'balanceCheckpoint') return 'mortgage.eventBalanceCheckpoint';
  return 'mortgage.eventNote';
};

interface Props {
  currency: string;
  currentDeal: LoanDeal;
  events: MortgageEvent[];
  initialType?: MortgageEventType;
  initialEvent?: MortgageEvent;
  onSave: (event: MortgageEvent) => void;
  onDelete?: () => void;
}

export const MortgageEventForm = ({
  currency,
  currentDeal,
  events,
  initialType,
  initialEvent,
  onSave,
  onDelete,
}: Props) => {
  const { t } = useTranslation();
  const projectionEvents = useMemo(() => (
    initialEvent ? events.filter(event => event.id !== initialEvent.id) : events
  ), [events, initialEvent]);
  const projected = useMemo(() => projectDeal(currentDeal, projectionEvents), [currentDeal, projectionEvents]);
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';
  const [eventType, setEventType] = useState<MortgageEventType>(
    initialEvent?.type ?? initialType ?? 'missedPayment',
  );
  const [date, setDate] = useState(initialEvent?.date ?? formatIsoDate(new Date()));
  const [amount, setAmount] = useState(initialEvent?.amount !== undefined ? String(initialEvent.amount) : '');
  const [balance, setBalance] = useState(
    initialEvent?.balance !== undefined ? String(initialEvent.balance) : String(projected.balance),
  );
  const [note, setNote] = useState(initialEvent?.note ?? '');

  const needsAmount = eventType === 'lumpOverpayment';
  const needsBalance = eventType === 'balanceCheckpoint';
  const minEventDate = parseDateLabelValue(currentDeal.startDate) ?? undefined;
  const maxEventDate = parseDateLabelValue(currentDeal.endDate) ?? undefined;

  const handleSave = () => {
    const numericAmount = Number(amount) || 0;
    const numericBalance = Number(balance) || 0;

    if (currentDeal.status !== 'active') {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.eventRequiresActiveDeal'));
      return;
    }
    if (!isValidIsoDate(date)) {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventDate'));
      return;
    }
    if (date < currentDeal.startDate || date > currentDeal.endDate) {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.eventOutsideDealDates'));
      return;
    }
    if (needsAmount && numericAmount <= 0) {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventAmount'));
      return;
    }
    if (needsAmount && numericAmount > projected.balance) {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.overpaymentTooLarge'));
      return;
    }
    if (needsBalance && numericBalance <= 0) {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventBalance'));
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: initialEvent?.id ?? createLocalId(),
      createdAt: initialEvent?.createdAt ?? now,
      updatedAt: now,
      dealId: initialEvent?.dealId ?? currentDeal.id,
      type: eventType,
      date,
      amount: needsAmount ? numericAmount : undefined,
      balance: needsBalance ? numericBalance : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <View>
      <View style={styles.field}>
        <FieldLabel>{t('mortgage.eventType')}</FieldLabel>
        <PillSelector
          value={eventType}
          onChange={setEventType}
          options={mortgageEventTypes.map(item => ({ value: item, label: t(mortgageEventLabelKey(item)) }))}
          wrap
        />
      </View>

      <View style={styles.field}>
        <DatePickerField
          label={t('mortgage.eventDate')}
          value={date}
          onChange={setDate}
          hint={t('mortgage.dateFormatHint')}
          minimumDate={minEventDate}
          maximumDate={maxEventDate}
        />
      </View>

      {needsAmount && (
        <View style={styles.field}>
          <FieldLabel>{t('mortgage.amount')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="5000"
            />
          </InputSurface>
        </View>
      )}

      {needsBalance && (
        <View style={styles.field}>
          <FieldLabel>{t('mortgage.bankConfirmedBalance')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
              placeholder="238420"
            />
          </InputSurface>
        </View>
      )}

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

      <Button
        label={initialEvent ? t('mortgage.saveEventChanges') : t('mortgage.saveEvent')}
        onPress={handleSave}
        style={styles.action}
      />

      {onDelete ? (
        <Button
          label={t('mortgage.deleteEvent')}
          onPress={onDelete}
          variant="destructive"
          style={styles.deleteAction}
        />
      ) : null}

      {initialEvent ? (
        <AppText variant="helper" tone="muted" style={styles.helper}>
          {t('mortgage.eventEditHelp')}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { marginTop: spacing.md },
  noteInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  action: { marginTop: spacing.xl },
  deleteAction: { marginTop: spacing.sm },
  helper: {
    marginTop: spacing.sm,
    color: colours.textSecondary,
  },
});
