import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { computeLoanOverpayments, LumpSumEntry } from '@/loans/loanOverpaymentCalc';
import { LoanFormSnapshot } from '@/types/SavedLoan';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import { colours, radii, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldLabel, InputSurface, AppTextInput } from '@/components/ui/FormPrimitives';

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

const formatDuration = (totalMonths: number, yrs: string, mo: string): string => {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} ${mo}`;
  if (months === 0) return `${years} ${yrs}`;
  return `${years} ${yrs} ${months} ${mo}`;
};

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
      setDebouncedAmount(parseFloat(text) || 0);
    }, 400);
  };

  const amount = parseFloat(value) || 0;

  const impact = useMemo(() => {
    if (debouncedAmount <= 0) return null;
    return computeLoanOverpayments(form, debouncedAmount, existingLumpSums);
  }, [form, debouncedAmount, existingLumpSums]);

  const yrs = t('results.years');
  const mo = t('results.months');
  const isUnchanged = amount === current;
  const canSave = amount > 0 && !isUnchanged;
  const canRemove = current > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />
            <AppText variant="title2" style={styles.heading}>
              {t('overpayments.monthlySection')}
            </AppText>

            <View style={styles.field}>
              <FieldLabel>{t('overpayments.monthlyAmountLabel')}</FieldLabel>
              <InputSurface>
                <AppTextInput
                  value={value}
                  onChangeText={handleChange}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  autoFocus={visible}
                />
              </InputSurface>
            </View>

            {impact && impact.interestSaved > 0 ? (
              <Card style={styles.impactCard}>
                <AppText variant="labelSm" tone="muted">
                  {t('overpayments.monthlySavings')}
                </AppText>
                <View style={styles.impactRows}>
                  <ImpactRow
                    label={t('overpayments.interestSaved')}
                    value={formatCurrency(impact.interestSaved, currency)}
                  />
                  {impact.monthsSaved > 0 ? (
                    <ImpactRow
                      label={t('overpayments.timeSaved')}
                      value={formatDuration(impact.monthsSaved, yrs, mo)}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}

            <View style={styles.actions}>
              {canRemove ? (
                <Button
                  label={t('overpayments.monthlyRemove')}
                  onPress={onRemove}
                  variant="ghost"
                  style={styles.actionBtn}
                />
              ) : (
                <Button
                  label={t('overpayments.cancel')}
                  onPress={onClose}
                  variant="ghost"
                  style={styles.actionBtn}
                />
              )}
              <Button
                label={t('overpayments.save')}
                onPress={() => onSave(amount)}
                disabled={!canSave}
                style={styles.actionBtn}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const ImpactRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.impactRow}>
    <AppText variant="bodySm" tone="muted">{label}</AppText>
    <AppText variant="labelMd" tone="success">{value}</AppText>
  </View>
);

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colours.modalScrim,
    justifyContent: 'flex-end',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colours.background,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  heading: {},
  field: {
    gap: spacing.xs,
  },
  impactCard: {
    borderColor: colours.successBorder,
    backgroundColor: colours.successSurface,
    gap: spacing.sm,
  },
  impactRows: {
    gap: spacing.xs,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
