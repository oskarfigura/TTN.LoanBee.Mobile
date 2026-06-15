import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, ButtonVariant } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { DatePickerField } from '@/components/ui/DatePickerField';
import {
  AppTextInput,
  FieldError,
  FieldHint,
  FieldLabel,
  InputAffix,
  InputSurface,
  PillSelector,
} from '@oskarfigura/ui-native';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import {
  buildBalanceCheckpointReconciliation,
  getReconciliationMessage,
} from '@/mortgage/reconciliation';
import { projectDeal } from '@/mortgage/tracker';
import { LoanDeal, MortgageEvent, MortgageEventType, MortgageVarianceReason } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { validateMoneyText } from '@/utils/formValidation';
import { colours, radii, spacing } from '@/theme';

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

const varianceReasons: MortgageVarianceReason[] = [
  'missedPayment',
  'paymentHoliday',
  'unloggedOverpayment',
  'feeAdded',
  'rateOrPaymentChanged',
  'lenderTiming',
  'unknown',
];

const varianceReasonLabelKey = (reason: MortgageVarianceReason) => {
  if (reason === 'missedPayment') return 'mortgage.varianceReasonMissedPayment';
  if (reason === 'paymentHoliday') return 'mortgage.varianceReasonPaymentHoliday';
  if (reason === 'unloggedOverpayment') return 'mortgage.varianceReasonUnloggedOverpayment';
  if (reason === 'feeAdded') return 'mortgage.varianceReasonFeeAdded';
  if (reason === 'rateOrPaymentChanged') return 'mortgage.varianceReasonRateOrPaymentChanged';
  if (reason === 'lenderTiming') return 'mortgage.varianceReasonLenderTiming';
  return 'mortgage.varianceReasonUnknown';
};

interface Props {
  currency: CurrencyCode;
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
  const todayIso = formatIsoDate(new Date());
  const [eventType, setEventType] = useState<MortgageEventType>(
    initialEvent?.type ?? initialType ?? 'missedPayment',
  );
  const [date, setDate] = useState(initialEvent?.date ?? formatIsoDate(new Date()));
  const [amount, setAmount] = useState(initialEvent?.amount !== undefined ? String(initialEvent.amount) : '');
  const [balance, setBalance] = useState(
    initialEvent?.balance !== undefined ? String(initialEvent.balance) : String(projected.balance),
  );
  const [varianceReason, setVarianceReason] = useState<MortgageVarianceReason>(
    initialEvent?.varianceReason ?? 'unknown',
  );
  const [note, setNote] = useState(initialEvent?.note ?? '');

  const needsAmount = eventType === 'lumpOverpayment';
  const needsBalance = eventType === 'balanceCheckpoint';
  const minEventDate = parseDateLabelValue(currentDeal.startDate) ?? undefined;
  const maximumDateString = needsBalance && todayIso < currentDeal.endDate ? todayIso : currentDeal.endDate;
  const maxEventDate = parseDateLabelValue(maximumDateString) ?? undefined;
  const baseAmountValidation = validateMoneyText(amount);
  const amountValidation = needsAmount && baseAmountValidation.isValid && baseAmountValidation.numeric > projected.balance
    ? { ...baseAmountValidation, errorKey: 'mortgage.overpaymentTooLarge', isValid: false }
    : baseAmountValidation;
  const balanceValidation = validateMoneyText(balance);
  const dateErrorKey = !isValidIsoDate(date)
    ? 'mortgage.invalidEventDate'
    : date < currentDeal.startDate || date > maximumDateString
      ? 'mortgage.eventOutsideDealDates'
      : undefined;
  const checkpointReconciliation = needsBalance && balanceValidation.isValid && !dateErrorKey
    ? buildBalanceCheckpointReconciliation({
      deal: currentDeal,
      events,
      checkpointDate: date,
      bankBalance: balanceValidation.numeric,
      editingEventId: initialEvent?.id,
    })
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
      projectedBalanceAtCheckpoint: needsBalance ? checkpointReconciliation?.projectedBalanceAtCheckpoint : undefined,
      reconciliationVariance: needsBalance ? checkpointReconciliation?.reconciliationVariance : undefined,
      varianceReason: needsBalance && Math.abs(checkpointReconciliation?.reconciliationVariance ?? 0) >= 1
        ? varianceReason
        : undefined,
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
          {checkpointReconciliation ? (
            <View style={styles.reconciliationPreview}>
              <AppText variant="labelMd">
                {t('mortgage.appEstimateOnDate', {
                  amount: formatCurrency(checkpointReconciliation.projectedBalanceAtCheckpoint, currency),
                })}
              </AppText>
              <AppText variant="bodySm" tone="muted" style={styles.reconciliationPreviewText}>
                {getReconciliationMessage(checkpointReconciliation.reconciliationVariance, currency, t)}
              </AppText>
            </View>
          ) : null}
          {checkpointReconciliation && Math.abs(checkpointReconciliation.reconciliationVariance) >= 1 ? (
            <View style={styles.field}>
              <FieldLabel>{t('mortgage.varianceReasonPrompt')}</FieldLabel>
              <PillSelector
                value={varianceReason}
                onChange={setVarianceReason}
                options={varianceReasons.map(reason => ({ value: reason, label: t(varianceReasonLabelKey(reason)) }))}
                wrap
              />
              <FieldHint>{t('mortgage.varianceReasonHelp')}</FieldHint>
            </View>
          ) : null}
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
          variant={ButtonVariant.Destructive}
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
  reconciliationPreview: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surface,
    padding: spacing.sm,
  },
  reconciliationPreviewText: {
    marginTop: spacing.xxxs,
  },
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
