import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computeLoanOverpayments, LumpSumEntry } from '@/loans/loanOverpaymentCalc';
import { LoanFormSnapshot } from '@/types/SavedLoan';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import { Button } from '@/components/ui/Button';
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
  current: number;
  form: LoanFormSnapshot;
  existingLumpSums: LumpSumEntry[];
  currency: CurrencyCode;
  onSave: (amount: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const MonthlyOverpaymentSheet = ({
  visible,
  current,
  form,
  existingLumpSums,
  currency,
  onSave,
  onRemove,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(current > 0 ? String(current) : '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedAmount, setDebouncedAmount] = useState(current);

  useEffect(() => {
    if (visible) {
      setValue(current > 0 ? String(current) : '');
      setDebouncedAmount(current);
    }
  }, [visible, current]);

  const handleChange = (text: string) => {
    setValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const parsed = validateMoneyText(text, { required: false });
      setDebouncedAmount(parsed.isValid ? parsed.numeric : 0);
    }, 400);
  };

  const amountValidation = validateMoneyText(value);
  const amount = amountValidation.numeric;

  const impact = useMemo(() => {
    if (debouncedAmount <= 0) return null;
    return computeLoanOverpayments(form, debouncedAmount, existingLumpSums);
  }, [form, debouncedAmount, existingLumpSums]);

  const yrs = t('results.years');
  const mo = t('results.months');
  const isUnchanged = amount === current;
  const canSave = amountValidation.isValid && !isUnchanged;
  const canRemove = current > 0;

  return (
    <OverpaymentSheetModal
      visible={visible}
      title={t('overpayments.monthlySection')}
      onClose={onClose}
      footer={(
        <OverpaymentSheetActions
          leadingAction={canRemove ? (
            <Button
              label={t('overpayments.monthlyRemove')}
              onPress={onRemove}
              variant="ghost"
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
              onPress={() => onSave(amount)}
              disabled={!canSave}
            />
          )}
        />
      )}
    >
      <OverpaymentFieldGroup label={t('overpayments.monthlyAmountLabel')}>
        <InputSurface error={Boolean(amountValidation.errorKey)}>
          <AppTextInput
            value={value}
            onChangeText={handleChange}
            placeholder="0.00"
            keyboardType="decimal-pad"
            autoFocus={visible}
          />
        </InputSurface>
        <FieldError message={amountValidation.errorKey ? t(amountValidation.errorKey) : undefined} />
      </OverpaymentFieldGroup>

      {impact && impact.interestSaved > 0 ? (
        <OverpaymentImpactCard
          title={t('overpayments.monthlySavings')}
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
