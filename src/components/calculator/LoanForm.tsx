import React, { useState } from 'react';
import {
  View, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  LoanCalculatorFormInputValues,
  LoanCalculatorFormValues,
} from '@/hooks/useLoanCalculatorForm';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { CURRENCIES } from '@/currency/currencies';
import { colours, layout, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  AppTextInput,
  FieldError,
  FieldHint,
  FieldLabel,
  FormSection,
  InputAffix,
  InputSurface,
  SegmentedControl,
} from '@/components/ui/FormPrimitives';
import { DownPaymentToggle } from './DownPaymentToggle';

interface Props {
  form: UseFormReturn<LoanCalculatorFormInputValues, undefined, LoanCalculatorFormValues>;
  onSubmit: (values: LoanCalculatorFormValues) => void;
  topContent?: React.ReactNode;
}

const fieldValue = (value: unknown) => (
  value === undefined || value === null ? '' : String(value)
);

const sanitiseNumberText = (value: string) => value.replace(/,/g, '');

const displayNumberValue = (value: unknown, formatted: boolean) => {
  const raw = fieldValue(value);
  if (!formatted || raw === '') return raw;

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return raw;

  return numeric.toLocaleString('en-GB', {
    maximumFractionDigits: 2,
  });
};

const formatDisplayDate = (value: string | undefined, language: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const LoanForm = ({ form, onSubmit, topContent }: Props) => {
  const { t, i18n } = useTranslation();
  const { control, handleSubmit, watch, setValue, formState: { errors } } = form;
  const calculationType = watch('calculationType');
  const downPaymentType = watch('downPaymentType') as DownPaymentType;
  const currency = watch('currency');
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const startDateStr = watch('startDate');
  const startDate = startDateStr ? new Date(`${startDateStr}T00:00:00`) : new Date();
  const downPaymentAffix = downPaymentType === DownPaymentType.CASH ? currencySymbol : '%';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        {topContent}
        <FormSection style={styles.section} accent>
          <View style={styles.fieldGroup}>
            <FieldLabel>{t('calculator.loanAmount')}</FieldLabel>
            <Controller
              control={control}
              name="loanAmount"
              render={({ field }) => (
                <InputSurface error={Boolean(errors.loanAmount)}>
                  <InputAffix>{currencySymbol}</InputAffix>
                  <AppTextInput
                    keyboardType="decimal-pad"
                    placeholder={t('calculator.loanAmountPlaceholder')}
                    value={displayNumberValue(field.value, focusedField !== 'loanAmount')}
                    onChangeText={value => field.onChange(sanitiseNumberText(value))}
                    onFocus={() => setFocusedField('loanAmount')}
                    onBlur={() => {
                      setFocusedField(null);
                      field.onBlur();
                    }}
                  />
                </InputSurface>
              )}
            />
            <FieldError message={errors.loanAmount?.message} />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('calculator.interestRate')}</FieldLabel>
            <Controller
              control={control}
              name="interest"
              render={({ field }) => (
                <InputSurface error={Boolean(errors.interest)}>
                  <AppTextInput
                    keyboardType="decimal-pad"
                    placeholder={t('calculator.interestPlaceholder')}
                    value={fieldValue(field.value)}
                    onChangeText={field.onChange}
                    onFocus={() => setFocusedField('interest')}
                    onBlur={() => {
                      setFocusedField(null);
                      field.onBlur();
                    }}
                  />
                  <InputAffix trailing>%</InputAffix>
                </InputSurface>
              )}
            />
            <FieldError message={errors.interest?.message} />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('calculator.downPayment')}</FieldLabel>
            <View style={styles.downPaymentRow}>
              <View style={styles.downPaymentInput}>
                <Controller
                  control={control}
                  name="downPayment"
                  render={({ field }) => (
                    <InputSurface error={Boolean(errors.downPayment)}>
                      {downPaymentType === DownPaymentType.CASH ? <InputAffix>{downPaymentAffix}</InputAffix> : null}
                      <AppTextInput
                        keyboardType="decimal-pad"
                        placeholder={t('calculator.downPaymentPlaceholder')}
                        value={displayNumberValue(
                          field.value,
                          downPaymentType === DownPaymentType.CASH && focusedField !== 'downPayment',
                        )}
                        onChangeText={value => field.onChange(sanitiseNumberText(value))}
                        onFocus={() => setFocusedField('downPayment')}
                        onBlur={() => {
                          setFocusedField(null);
                          field.onBlur();
                        }}
                      />
                      {downPaymentType === DownPaymentType.PERCENT ? <InputAffix trailing>{downPaymentAffix}</InputAffix> : null}
                    </InputSurface>
                  )}
                />
              </View>
              <DownPaymentToggle
                value={downPaymentType}
                currencySymbol={currencySymbol}
                onChange={v => setValue('downPaymentType', v, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })}
              />
            </View>
            <FieldError message={errors.downPayment?.message} />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('calculator.startDate')}</FieldLabel>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.82}>
              <InputSurface>
                <AppText variant="bodyMd" style={styles.dateText}>
                  {formatDisplayDate(startDateStr, i18n.language) || t('calculator.startDate')}
                </AppText>
              </InputSurface>
            </TouchableOpacity>
            {showDatePicker ? (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setValue('startDate', date.toISOString().split('T')[0]);
                }}
              />
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('calculator.calculationType')}</FieldLabel>
            <SegmentedControl
              value={calculationType}
              onChange={mode => setValue('calculationType', mode)}
              options={[
                { label: t('calculator.byTerm'), value: LoanCalculationType.TERM },
                { label: t('calculator.byPayment'), value: LoanCalculationType.PAYMENT },
              ]}
            />
            <FieldHint>
              {calculationType === LoanCalculationType.TERM
                ? t('calculator.modeTermHelp')
                : t('calculator.modePaymentHelp')}
            </FieldHint>
          </View>

          {calculationType === LoanCalculationType.TERM ? (
            <>
              <View style={styles.termRow}>
                <View style={styles.termField}>
                  <FieldLabel>{t('calculator.termYears')}</FieldLabel>
                  <Controller
                    control={control}
                    name="termInYears"
                    render={({ field }) => (
                      <InputSurface error={Boolean(errors.termInYears)}>
                        <AppTextInput
                          keyboardType="number-pad"
                          placeholder="0"
                          value={fieldValue(field.value)}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </InputSurface>
                    )}
                  />
                </View>
                <View style={styles.termField}>
                  <FieldLabel>{t('calculator.termMonths')}</FieldLabel>
                  <Controller
                    control={control}
                    name="termInMonths"
                    render={({ field }) => (
                      <InputSurface error={Boolean(errors.termInMonths)}>
                        <AppTextInput
                          keyboardType="number-pad"
                          placeholder="0"
                          value={fieldValue(field.value)}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                        />
                      </InputSurface>
                    )}
                  />
                </View>
              </View>
              <FieldError message={errors.termInYears?.message || errors.termInMonths?.message} />

              <View style={styles.fieldGroup}>
                <FieldLabel>{t('calculator.additionalPayment')}</FieldLabel>
                <Controller
                  control={control}
                  name="additionalMonthlyPayment"
                  render={({ field }) => (
                    <InputSurface error={Boolean(errors.additionalMonthlyPayment)}>
                      <InputAffix>{currencySymbol}</InputAffix>
                      <AppTextInput
                        keyboardType="decimal-pad"
                        placeholder={t('calculator.additionalPaymentPlaceholder')}
                        value={displayNumberValue(field.value, focusedField !== 'additionalMonthlyPayment')}
                        onChangeText={value => field.onChange(sanitiseNumberText(value))}
                        onFocus={() => setFocusedField('additionalMonthlyPayment')}
                        onBlur={() => {
                          setFocusedField(null);
                          field.onBlur();
                        }}
                      />
                    </InputSurface>
                  )}
                />
                <FieldError message={errors.additionalMonthlyPayment?.message} />
              </View>
            </>
          ) : (
            <View style={styles.fieldGroup}>
              <FieldLabel>{t('calculator.desiredPayment')}</FieldLabel>
              <Controller
                control={control}
                name="desiredMonthlyPayment"
                render={({ field }) => (
                  <InputSurface error={Boolean(errors.desiredMonthlyPayment)}>
                    <InputAffix>{currencySymbol}</InputAffix>
                    <AppTextInput
                      keyboardType="decimal-pad"
                      placeholder={t('calculator.desiredPaymentPlaceholder')}
                      value={displayNumberValue(field.value, focusedField !== 'desiredMonthlyPayment')}
                      onChangeText={value => field.onChange(sanitiseNumberText(value))}
                      onFocus={() => setFocusedField('desiredMonthlyPayment')}
                      onBlur={() => {
                        setFocusedField(null);
                        field.onBlur();
                      }}
                    />
                  </InputSurface>
                )}
              />
              <FieldError message={errors.desiredMonthlyPayment?.message} />
            </View>
          )}
        </FormSection>

      </ScrollView>
      <View style={styles.stickyFooter}>
        <Button
          label={t('calculator.generate')}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: layout.screenPadding,
    paddingBottom: 124,
  },
  section: {
    gap: spacing.md,
  },
  dateText: {
    flex: 1,
  },
  downPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  downPaymentInput: { flex: 1 },
  fieldGroup: {
    gap: spacing.xs,
  },
  termRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  termField: { flex: 1 },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colours.borderSoft,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
});
