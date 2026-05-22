import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import {
  AppTextInput,
  FieldError,
  FieldLabel,
  InputAffix,
  InputSurface,
  PillSelector,
} from '@/components/ui/FormPrimitives';
import { CURRENCIES } from '@/currency/currencies';
import { projectDeal } from '@/mortgage/tracker';
import { LoanDeal, MortgageEvent, MortgageEventType } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { validateMoneyText } from '@/utils/formValidation';
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
  const baseAmountValidation = validateMoneyText(amount);
  const amountValidation = needsAmount && baseAmountValidation.isValid && baseAmountValidation.numeric > projected.balance
    ? { ...baseAmountValidation, errorKey: 'mortgage.overpaymentTooLarge', isValid: false }
    : baseAmountValidation;
  const balanceValidation = validateMoneyText(balance);
  const dateErrorKey = !isValidIsoDate(date)
    ? 'mortgage.invalidEventDate'
    : date < currentDeal.startDate || date > currentDeal.endDate
      ? 'mortgage.eventOutsideDealDates'
      : undefined;
  const amountError = needsAmount && amountValidation.errorKey ? t(amountValidation.errorKey) : undefined;
  const balanceError = needsBalance && balanceValidation.errorKey ? t(balanceValidation.errorKey) : undefined;
  const canSave = (
    !dateErrorKey
    && (!needsAmount || amountValidation.isValid)
    && (!needsBalance || balanceValidation.isValid)
  );

  const handleSave = () => {
    if (currentDeal.status !== 'active') {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.eventRequiresActiveDeal'));
      return;
    }
    if (dateErrorKey === 'mortgage.invalidEventDate') {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventDate'));
      return;
    }
    if (dateErrorKey === 'mortgage.eventOutsideDealDates') {
      Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.eventOutsideDealDates'));
      return;
    }
    if (needsAmount && !amountValidation.isValid) {
      Alert.alert(
        t('mortgage.invalidEventTitle'),
        t(amountValidation.errorKey === 'mortgage.overpaymentTooLarge'
          ? 'mortgage.overpaymentTooLarge'
          : 'mortgage.invalidEventAmount'),
      );
      return;
    }
    if (needsBalance && !balanceValidation.isValid) {
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
      amount: needsAmount ? amountValidation.numeric : undefined,
      balance: needsBalance ? balanceValidation.numeric : undefined,
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
        <FieldError message={dateErrorKey ? t(dateErrorKey) : undefined} />
      </View>

      {needsAmount && (
        <View style={styles.field}>
          <FieldLabel>{t('mortgage.amount')}</FieldLabel>
          <InputSurface error={Boolean(amountError)}>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="5000"
            />
          </InputSurface>
          <FieldError message={amountError} />
        </View>
      )}

      {needsBalance && (
        <View style={styles.field}>
          <FieldLabel>{t('mortgage.bankConfirmedBalance')}</FieldLabel>
          <InputSurface error={Boolean(balanceError)}>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
              placeholder="238420"
            />
          </InputSurface>
          <FieldError message={balanceError} />
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
        disabled={!canSave}
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
