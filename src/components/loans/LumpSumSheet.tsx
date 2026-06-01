import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MortgageEvent } from '@/types/SavedLoan';
import { formatIsoDate } from '@/utils/date';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Button } from '@/components/ui/Button';
import { DatePickerField, DatePickerFieldHandle } from '@/components/ui/DatePickerField';
import { AppTextInput, FieldError, InputSurface } from '@/components/ui/FormPrimitives';
import {
  ImpactRow,
  OverpaymentFieldGroup,
  OverpaymentImpactCard,
  OverpaymentSheetActions,
  OverpaymentSheetModal,
} from '@/components/loans/OverpaymentSheetPrimitives';
import { validateMoneyText } from '@/utils/formValidation';

interface Props {
  visible: boolean;
  event: MortgageEvent | null;
  minDate: Date;
  maxDate: Date;
  placeholder?: string;
  /** Returns the impact rows for a debounced amount/date, or null to hide the card. */
  computeImpactRows: (amount: number, date: string) => ImpactRow[] | null;
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
  minDate,
  maxDate,
  placeholder = '0.00',
  computeImpactRows,
  onSave,
  onDelete,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const isEditing = event !== null;
  const datePickerRef = useRef<DatePickerFieldHandle>(null);
  const minDateRef = useRef(minDate);
  minDateRef.current = minDate;

  const [date, setDate] = useState(() => event?.date ?? defaultDate(minDate));
  const [amount, setAmount] = useState(event?.amount ? String(event.amount) : '');
  const debouncedDate = useDebouncedValue(date, 200);
  const debouncedText = useDebouncedValue(amount, 400);

  useEffect(() => {
    if (visible) {
      setDate(event?.date ?? defaultDate(minDateRef.current));
      setAmount(event?.amount ? String(event.amount) : '');
    }
  }, [visible, event]);

  const amountValidation = validateMoneyText(amount);
  const canSave = amountValidation.isValid;

  const rows = useMemo(() => {
    const parsed = validateMoneyText(debouncedText, { required: false });
    const debouncedAmount = parsed.isValid ? parsed.numeric : 0;
    if (debouncedAmount <= 0) return null;
    return computeImpactRows(debouncedAmount, debouncedDate);
  }, [debouncedText, debouncedDate, computeImpactRows]);

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
        onChange={setDate}
        hint=""
        minimumDate={minDate}
        maximumDate={maxDate}
      />

      <OverpaymentFieldGroup label={t('overpayments.lumpSumAmount')}>
        <InputSurface error={Boolean(amountValidation.errorKey)}>
          <AppTextInput
            value={amount}
            onChangeText={setAmount}
            placeholder={placeholder}
            keyboardType="decimal-pad"
            onFocus={() => datePickerRef.current?.closePicker()}
          />
        </InputSurface>
        <FieldError message={amountValidation.errorKey ? t(amountValidation.errorKey) : undefined} />
      </OverpaymentFieldGroup>

      {rows && rows.length > 0 ? (
        <OverpaymentImpactCard title={t('overpayments.lumpSumImpact')} rows={rows} />
      ) : null}
    </OverpaymentSheetModal>
  );
};
