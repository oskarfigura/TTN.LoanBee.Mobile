import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue';
import { Button, ButtonVariant } from '@oskarfigura/ui-native';
import { AppTextInput, FieldError, InputAffix, InputSurface } from '@oskarfigura/ui-native';
import {
  ImpactRow,
  OverpaymentFieldGroup,
  OverpaymentImpactCard,
  OverpaymentSheetActions,
  OverpaymentSheetModal,
} from '@/features/tracker/components/overpayments/OverpaymentSheetPrimitives';
import { validateMoneyText } from '@/shared/lib/utils/formValidation';

interface Props {
  visible: boolean;
  current: number;
  title: string;
  /** Optional currency symbol rendered as a leading affix on the input. */
  currencySymbol?: string;
  placeholder?: string;
  /** Returns the impact rows for a debounced amount, or null to hide the card. */
  computeImpactRows: (amount: number) => ImpactRow[] | null;
  onSave: (amount: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const MonthlyOverpaymentSheet = ({
  visible,
  current,
  title,
  currencySymbol,
  placeholder = '0.00',
  computeImpactRows,
  onSave,
  onRemove,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(current > 0 ? String(current) : '');
  const debouncedText = useDebouncedValue(value, 400);

  useEffect(() => {
    if (visible) {
      setValue(current > 0 ? String(current) : '');
    }
  }, [visible, current]);

  const amountValidation = validateMoneyText(value);
  const amount = amountValidation.numeric;
  const liveAmount = amountValidation.isValid ? amount : 0;

  const rows = useMemo(() => {
    // Gate visibility on the live amount so the card hides instantly when the
    // field is cleared (or the sheet is reopened), but run the expensive
    // amortisation only off the debounced value.
    if (liveAmount <= 0) return null;
    const parsed = validateMoneyText(debouncedText, { required: false });
    const debouncedAmount = parsed.isValid ? parsed.numeric : 0;
    if (debouncedAmount <= 0) return null;
    return computeImpactRows(debouncedAmount);
  }, [liveAmount, debouncedText, computeImpactRows]);

  const isUnchanged = amount === current;
  const canSave = amountValidation.isValid && !isUnchanged;
  const canRemove = current > 0;

  return (
    <OverpaymentSheetModal
      visible={visible}
      title={title}
      onClose={onClose}
      footer={(
        <OverpaymentSheetActions
          leadingAction={canRemove ? (
            <Button
              label={t('overpayments.monthlyRemove')}
              onPress={onRemove}
              variant={ButtonVariant.Ghost}
            />
          ) : (
            <Button
              label={t('overpayments.cancel')}
              onPress={onClose}
              variant={ButtonVariant.Ghost}
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
          {currencySymbol ? <InputAffix>{currencySymbol}</InputAffix> : null}
          <AppTextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            keyboardType="decimal-pad"
            autoFocus={visible}
          />
        </InputSurface>
        <FieldError message={amountValidation.errorKey ? t(amountValidation.errorKey) : undefined} />
      </OverpaymentFieldGroup>

      {rows && rows.length > 0 ? (
        <OverpaymentImpactCard title={t('overpayments.monthlySavings')} rows={rows} />
      ) : null}
    </OverpaymentSheetModal>
  );
};
