import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { computeLoanOverpayments } from '@/loans/loanOverpaymentCalc';
import { LoanFormSnapshot, MortgageEvent } from '@/types/SavedLoan';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import { formatIsoDate } from '@/utils/date';
import { colours, radii, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { FieldLabel, InputSurface, AppTextInput } from '@/components/ui/FormPrimitives';

interface Props {
  visible: boolean;
  event: MortgageEvent | null;
  form: LoanFormSnapshot;
  monthlyOverpayment: number;
  minDate: Date;
  maxDate: Date;
  currency: CurrencyCode;
  onSave: (date: string, amount: number, note: string) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

const formatDuration = (totalMonths: number, yrs: string, mo: string): string => {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} ${mo}`;
  if (months === 0) return `${years} ${yrs}`;
  return `${years} ${yrs} ${months} ${mo}`;
};

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

  const [date, setDate] = useState(() => event?.date ?? defaultDate(minDate));
  const [amount, setAmount] = useState(event?.amount ? String(event.amount) : '');
  const [note, setNote] = useState(event?.note ?? '');

  const amountDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedAmount, setDebouncedAmount] = useState(parseFloat(amount) || 0);
  const [debouncedDate, setDebouncedDate] = useState(date);

  useEffect(() => {
    if (visible) {
      setDate(event?.date ?? defaultDate(minDate));
      setAmount(event?.amount ? String(event.amount) : '');
      setNote(event?.note ?? '');
      const initAmount = event?.amount ?? 0;
      setDebouncedAmount(initAmount);
      setDebouncedDate(event?.date ?? defaultDate(minDate));
    }
  }, [visible, event, minDate]);

  const handleAmountChange = (text: string) => {
    setAmount(text);
    if (amountDebounceRef.current) clearTimeout(amountDebounceRef.current);
    amountDebounceRef.current = setTimeout(() => {
      setDebouncedAmount(parseFloat(text) || 0);
    }, 400);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current);
    dateDebounceRef.current = setTimeout(() => {
      setDebouncedDate(value);
    }, 200);
  };

  const parsedAmount = parseFloat(amount) || 0;

  const impact = useMemo(() => {
    if (debouncedAmount <= 0) return null;
    // Show marginal impact of this single lump sum only
    return computeLoanOverpayments(form, monthlyOverpayment, [
      { date: debouncedDate, amount: debouncedAmount },
    ]);
  }, [form, monthlyOverpayment, debouncedAmount, debouncedDate]);

  const yrs = t('results.years');
  const mo = t('results.months');
  const canSave = parsedAmount > 0;

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />
            <AppText variant="title2" style={styles.heading}>
              {isEditing
                ? t('overpayments.lumpSumSection')
                : t('overpayments.lumpSumAdd')}
            </AppText>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.field}>
                <DatePickerField
                  label={t('overpayments.lumpSumDate')}
                  value={date}
                  onChange={handleDateChange}
                  hint=""
                  minimumDate={minDate}
                  maximumDate={maxDate}
                />
              </View>

              <View style={styles.field}>
                <FieldLabel>{t('overpayments.lumpSumAmount')}</FieldLabel>
                <InputSurface>
                  <AppTextInput
                    value={amount}
                    onChangeText={handleAmountChange}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </InputSurface>
              </View>

              <View style={styles.field}>
                <FieldLabel>{t('overpayments.lumpSumNote')}</FieldLabel>
                <InputSurface>
                  <AppTextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={t('overpayments.lumpSumNote')}
                  />
                </InputSurface>
              </View>

              {impact && impact.interestSaved > 0 ? (
                <Card style={styles.impactCard}>
                  <AppText variant="labelSm" tone="muted">
                    {t('overpayments.lumpSumImpact')}
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
            </ScrollView>

            <View style={styles.actions}>
              {isEditing ? (
                <Button
                  label={t('overpayments.delete')}
                  onPress={handleDelete}
                  variant="destructive"
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
                onPress={() => onSave(date, parsedAmount, note.trim())}
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
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  heading: {
    marginBottom: spacing.sm,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
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
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
});
