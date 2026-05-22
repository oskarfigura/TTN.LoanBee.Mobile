import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DatePickerField, DatePickerFieldHandle } from '@/components/ui/DatePickerField';
import { Button } from '@/components/ui/Button';
import { AppTextInput, FieldError, InputSurface } from '@/components/ui/FormPrimitives';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import { getDealOverpaymentImpact } from '@/mortgage/tracker';
import { LoanDeal, MortgageEvent } from '@/types/SavedLoan';
import { formatIsoDate } from '@/utils/date';
import {
  OverpaymentFieldGroup,
  OverpaymentImpactCard,
  OverpaymentSheetActions,
  OverpaymentSheetModal,
} from '@/components/loans/OverpaymentSheetPrimitives';
import { validateMoneyText } from '@/utils/formValidation';

interface Props {
  visible: boolean;
  event: MortgageEvent | null;
  currency: CurrencyCode;
  minDate: Date;
  maxDate: Date;
  deal: LoanDeal;
  loanEvents: MortgageEvent[];
  onSave: (date: string, amount: number) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

const getDefaultDate = (minDate: Date) => {
  const fallback = minDate > new Date() ? minDate : new Date();
  return formatIsoDate(fallback);
};

export const DealLumpSumSheet = ({
  visible,
  event,
  currency,
  minDate,
  maxDate,
  deal,
  loanEvents,
  onSave,
  onDelete,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const isEditing = event !== null;
  const datePickerRef = useRef<DatePickerFieldHandle>(null);
  const minDateRef = useRef(minDate);
  minDateRef.current = minDate;
  const amountDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [date, setDate] = useState(() => event?.date ?? getDefaultDate(minDate));
  const [amount, setAmount] = useState(event?.amount ? String(event.amount) : '');
  const [debouncedAmount, setDebouncedAmount] = useState(event?.amount ?? 0);
  const [debouncedDate, setDebouncedDate] = useState(() => event?.date ?? getDefaultDate(minDate));

  useEffect(() => {
    if (visible) {
      const nextDate = event?.date ?? getDefaultDate(minDateRef.current);
      setDate(nextDate);
      setDebouncedDate(nextDate);
      setAmount(event?.amount ? String(event.amount) : '');
      setDebouncedAmount(event?.amount ?? 0);
    }
  }, [visible, event]);

  const handleAmountChange = (text: string) => {
    setAmount(text);
    if (amountDebounceRef.current) clearTimeout(amountDebounceRef.current);
    amountDebounceRef.current = setTimeout(() => {
      const parsed = validateMoneyText(text, { required: false });
      setDebouncedAmount(parsed.isValid ? parsed.numeric : 0);
    }, 400);
  };

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current);
    dateDebounceRef.current = setTimeout(() => setDebouncedDate(nextDate), 200);
  };

  const impact = useMemo(() => {
    if (debouncedAmount <= 0) return null;
    const tempEvent: MortgageEvent = {
      id: event?.id ?? 'preview',
      createdAt: '',
      updatedAt: '',
      dealId: deal.id,
      type: 'lumpOverpayment',
      date: debouncedDate,
      amount: debouncedAmount,
    };
    const tempEvents = [...loanEvents.filter(item => item.id !== event?.id), tempEvent];
    const result = getDealOverpaymentImpact(deal, tempEvents);
    return result.hasOverpayments ? result : null;
  }, [deal, loanEvents, event, debouncedAmount, debouncedDate]);

  const amountValidation = validateMoneyText(amount);
  const canSave = amountValidation.isValid;

  const handleDelete = () => {
    if (!event) return;
    Alert.alert(
      t('overpayments.deleteConfirmTitle'),
      t('overpayments.deleteConfirmMessage'),
      [
        { text: t('overpayments.cancel'), style: 'cancel' },
        { text: t('overpayments.deleteConfirm'), style: 'destructive', onPress: () => onDelete(event.id) },
      ],
    );
  };

  return (
    <OverpaymentSheetModal
      visible={visible}
      title={isEditing ? t('overpayments.lumpSumSection') : t('overpayments.lumpSumAdd')}
      onClose={onClose}
      maxHeightRatio={0.92}
      footer={(
        <OverpaymentSheetActions
          leadingAction={isEditing ? (
            <Button
              label={t('overpayments.delete')}
              onPress={handleDelete}
              variant="destructive"
            />
          ) : (
            <Button
              label={t('overpayments.cancel')}
              onPress={onClose}
              variant="ghost"
            />
          )}
          primaryAction={(
            <Button
              label={t('overpayments.save')}
              onPress={() => onSave(date, amountValidation.numeric)}
              disabled={!canSave}
            />
          )}
        />
      )}
    >
      <DatePickerField
        ref={datePickerRef}
        label={t('overpayments.lumpSumDate')}
        value={date}
        onChange={handleDateChange}
        hint=""
        minimumDate={minDate}
        maximumDate={maxDate}
      />

      <OverpaymentFieldGroup label={t('overpayments.lumpSumAmount')}>
        <InputSurface error={Boolean(amountValidation.errorKey)}>
          <AppTextInput
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="5000"
            keyboardType="decimal-pad"
            onFocus={() => datePickerRef.current?.closePicker()}
          />
        </InputSurface>
        <FieldError message={amountValidation.errorKey ? t(amountValidation.errorKey) : undefined} />
      </OverpaymentFieldGroup>

      {impact && impact.interestSaved > 0 ? (
        <OverpaymentImpactCard
          title={t('overpayments.lumpSumImpact')}
          rows={[
            {
              label: t('mortgage.dealInterestSavedLabel'),
              value: formatCurrency(impact.interestSaved, currency),
            },
            ...(impact.extraPrincipalRepaid > 0 ? [{
              label: t('mortgage.dealExtraRepaidLabel'),
              value: formatCurrency(impact.extraPrincipalRepaid, currency),
            }] : []),
          ]}
        />
      ) : null}
    </OverpaymentSheetModal>
  );
};
