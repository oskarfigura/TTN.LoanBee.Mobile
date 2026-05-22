import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { computeLoanOverpayments } from '@/loans/loanOverpaymentCalc';
import { LoanFormSnapshot, MortgageEvent } from '@/types/SavedLoan';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import { formatIsoDate } from '@/utils/date';
import { Button } from '@/components/ui/Button';
import { DatePickerField, DatePickerFieldHandle } from '@/components/ui/DatePickerField';
import { AppTextInput, FieldError, InputSurface } from '@/components/ui/FormPrimitives';
import {
  OverpaymentFieldGroup,
  OverpaymentImpactCard,
  OverpaymentSheetActions,
  OverpaymentSheetModal,
  formatOverpaymentDuration,
} from '@/components/loans/OverpaymentSheetPrimitives';
import { validateMoneyText } from '@/utils/formValidation';

interface Props {
  visible: boolean;
  event: MortgageEvent | null;
  form: LoanFormSnapshot;
  monthlyOverpayment: number;
  minDate: Date;
  maxDate: Date;
  currency: CurrencyCode;
  onSave: (date: string, amount: number) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

const defaultDate = (minDate: Date): string => {
  const d = minDate > new Date() ? minDate : new Date();
  return formatIsoDate(d);
};

export const LumpSumSheet = ({
  visible,
  event,
  form,
  monthlyOverpayment,
  minDate,
  maxDate,
  currency,
  onSave,
  onDelete,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const isEditing = event !== null;
  const datePickerRef = useRef<DatePickerFieldHandle>(null);

  const [date, setDate] = useState(() => event?.date ?? defaultDate(minDate));
  const [amount, setAmount] = useState(event?.amount ? String(event.amount) : '');

  const amountDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedAmount, setDebouncedAmount] = useState(event?.amount ?? 0);
  const [debouncedDate, setDebouncedDate] = useState(date);

  useEffect(() => {
    if (visible) {
      setDate(event?.date ?? defaultDate(minDate));
      setAmount(event?.amount ? String(event.amount) : '');
      const initAmount = event?.amount ?? 0;
      setDebouncedAmount(initAmount);
      setDebouncedDate(event?.date ?? defaultDate(minDate));
    }
  }, [visible, event, minDate]);

  const handleAmountChange = (text: string) => {
    setAmount(text);
    if (amountDebounceRef.current) clearTimeout(amountDebounceRef.current);
    amountDebounceRef.current = setTimeout(() => {
      const parsed = validateMoneyText(text, { required: false });
      setDebouncedAmount(parsed.isValid ? parsed.numeric : 0);
    }, 400);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current);
    dateDebounceRef.current = setTimeout(() => {
      setDebouncedDate(value);
    }, 200);
  };

  const amountValidation = validateMoneyText(amount);

  const impact = useMemo(() => {
    if (debouncedAmount <= 0) return null;
    return computeLoanOverpayments(form, monthlyOverpayment, [
      { date: debouncedDate, amount: debouncedAmount },
    ]);
  }, [form, monthlyOverpayment, debouncedAmount, debouncedDate]);

  const yrs = t('results.years');
  const mo = t('results.months');
  const canSave = amountValidation.isValid;

  const handleDelete = () => {
    if (!event) return;
    Alert.alert(
      t('overpayments.deleteConfirmTitle'),
      t('overpayments.deleteConfirmMessage'),
      [
        { text: t('overpayments.cancel'), style: 'cancel' },
        {
          text: t('overpayments.deleteConfirm'),
          style: 'destructive',
          onPress: () => onDelete(event.id),
        },
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
            placeholder="0.00"
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
              label: t('overpayments.interestSaved'),
              value: formatCurrency(impact.interestSaved, currency),
            },
            ...(impact.monthsSaved > 0 ? [{
              label: t('overpayments.timeSaved'),
              value: formatOverpaymentDuration(impact.monthsSaved, yrs, mo),
            }] : []),
          ]}
        />
      ) : null}
    </OverpaymentSheetModal>
  );
};
