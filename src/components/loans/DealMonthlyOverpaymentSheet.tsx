import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { AppTextInput, FieldError, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { getDealOverpaymentImpact } from '@/mortgage/tracker';
import { LoanDeal, MortgageEvent } from '@/types/SavedLoan';
import {
  OverpaymentFieldGroup,
  OverpaymentImpactCard,
  OverpaymentSheetActions,
  OverpaymentSheetModal,
} from '@/components/loans/OverpaymentSheetPrimitives';
import { validateMoneyText } from '@/utils/formValidation';

interface Props {
  visible: boolean;
  current: number;
  currency: CurrencyCode;
  deal: LoanDeal;
  loanEvents: MortgageEvent[];
  onSave: (amount: number) => void;
  onClose: () => void;
}

export const DealMonthlyOverpaymentSheet = ({
  visible,
  current,
  currency,
  deal,
  loanEvents,
  onSave,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const currencySymbol = CURRENCIES.find(item => item.code === currency)?.symbol ?? '£';
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
    const tempDeal: LoanDeal = { ...deal, regularOverpayment: debouncedAmount };
    const result = getDealOverpaymentImpact(tempDeal, loanEvents);
    return result.hasOverpayments ? result : null;
  }, [deal, loanEvents, debouncedAmount]);

  const isUnchanged = amount === current;
  const canSave = amountValidation.isValid && !isUnchanged;
  const canRemove = current > 0;

  return (
    <OverpaymentSheetModal
      visible={visible}
      title={t('mortgage.dealMonthlyOverpayment')}
      onClose={onClose}
      footer={(
        <OverpaymentSheetActions
          leadingAction={canRemove ? (
            <Button
              label={t('overpayments.monthlyRemove')}
              onPress={() => onSave(0)}
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
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            value={value}
            onChangeText={handleChange}
            placeholder="150"
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
