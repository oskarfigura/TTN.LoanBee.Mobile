import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
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
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { Button } from '@/components/ui/Button';
import { DownPaymentToggle } from './DownPaymentToggle';

interface Props {
  form: UseFormReturn<LoanCalculatorFormInputValues, undefined, LoanCalculatorFormValues>;
  onSubmit: (values: LoanCalculatorFormValues) => void;
  topContent?: React.ReactNode;
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <Text style={styles.error}>{message}</Text> : null;

const Label = ({ children }: { children: string }) => (
  <Text style={styles.label}>{children}</Text>
);

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

        {/* Loan Amount */}
        <Label>{t('calculator.loanAmount')}</Label>
        <Controller
          control={control}
          name="loanAmount"
          render={({ field }) => (
            <View style={[styles.inputShell, errors.loanAmount && styles.inputError]}>
              <Text style={styles.affix}>{currencySymbol}</Text>
              <TextInput
                style={styles.inputField}
                keyboardType="decimal-pad"
                placeholder={t('calculator.loanAmountPlaceholder')}
                placeholderTextColor={colours.textSecondary}
                value={displayNumberValue(field.value, focusedField !== 'loanAmount')}
                onChangeText={value => field.onChange(sanitiseNumberText(value))}
                onFocus={() => setFocusedField('loanAmount')}
                onBlur={() => {
                  setFocusedField(null);
                  field.onBlur();
                }}
              />
            </View>
          )}
        />
        <FieldError message={errors.loanAmount?.message} />

        {/* Interest Rate */}
        <Label>{t('calculator.interestRate')}</Label>
        <Controller
          control={control}
          name="interest"
          render={({ field }) => (
            <View style={[styles.inputShell, errors.interest && styles.inputError]}>
              <TextInput
                style={styles.inputField}
                keyboardType="decimal-pad"
                placeholder={t('calculator.interestPlaceholder')}
                placeholderTextColor={colours.textSecondary}
                value={fieldValue(field.value)}
                onChangeText={field.onChange}
                onFocus={() => setFocusedField('interest')}
                onBlur={() => {
                  setFocusedField(null);
                  field.onBlur();
                }}
              />
              <Text style={[styles.affix, styles.suffixAffix]}>%</Text>
            </View>
          )}
        />
        <FieldError message={errors.interest?.message} />

        {/* Down Payment */}
        <Label>{t('calculator.downPayment')}</Label>
        <View style={styles.downPaymentRow}>
          <View style={styles.downPaymentInput}>
            <Controller
              control={control}
              name="downPayment"
              render={({ field }) => (
                <View style={[styles.inputShell, errors.downPayment && styles.inputError]}>
                  {downPaymentType === DownPaymentType.CASH && <Text style={styles.affix}>{downPaymentAffix}</Text>}
                  <TextInput
                    style={styles.inputField}
                    keyboardType="decimal-pad"
                    placeholder={t('calculator.downPaymentPlaceholder')}
                    placeholderTextColor={colours.textSecondary}
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
                  {downPaymentType === DownPaymentType.PERCENT && (
                    <Text style={[styles.affix, styles.suffixAffix]}>{downPaymentAffix}</Text>
                  )}
                </View>
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

        {/* Start Date */}
        <Label>{t('calculator.startDate')}</Label>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.dateText}>
            {formatDisplayDate(startDateStr, i18n.language) || t('calculator.startDate')}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setValue('startDate', date.toISOString().split('T')[0]);
            }}
          />
        )}

        {/* Calculation Mode Toggle */}
        <View style={styles.modeRow}>
          {([LoanCalculationType.TERM, LoanCalculationType.PAYMENT] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtn, calculationType === mode && styles.modeBtnActive]}
              onPress={() => setValue('calculationType', mode)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, calculationType === mode && styles.modeBtnTextActive]}>
                {mode === LoanCalculationType.TERM ? t('calculator.byTerm') : t('calculator.byPayment')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.modeHelp}>
          {calculationType === LoanCalculationType.TERM
            ? t('calculator.modeTermHelp')
            : t('calculator.modePaymentHelp')}
        </Text>

        {/* Term fields */}
        {calculationType === LoanCalculationType.TERM && (
          <>
            <View style={styles.termRow}>
              <View style={styles.termField}>
                <Label>{t('calculator.termYears')}</Label>
                <Controller
                  control={control}
                  name="termInYears"
                  render={({ field }) => (
                    <TextInput
                      style={[styles.input, errors.termInYears && styles.inputError]}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colours.textSecondary}
                      value={fieldValue(field.value)}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </View>
              <View style={styles.termField}>
                <Label>{t('calculator.termMonths')}</Label>
                <Controller
                  control={control}
                  name="termInMonths"
                  render={({ field }) => (
                    <TextInput
                      style={[styles.input, errors.termInMonths && styles.inputError]}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colours.textSecondary}
                      value={fieldValue(field.value)}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </View>
            </View>
            <FieldError message={errors.termInYears?.message || errors.termInMonths?.message} />

            <Label>{t('calculator.additionalPayment')}</Label>
            <Controller
              control={control}
              name="additionalMonthlyPayment"
              render={({ field }) => (
                <View style={[styles.inputShell, errors.additionalMonthlyPayment && styles.inputError]}>
                  <Text style={styles.affix}>{currencySymbol}</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="decimal-pad"
                    placeholder={t('calculator.additionalPaymentPlaceholder')}
                    placeholderTextColor={colours.textSecondary}
                    value={displayNumberValue(field.value, focusedField !== 'additionalMonthlyPayment')}
                    onChangeText={value => field.onChange(sanitiseNumberText(value))}
                    onFocus={() => setFocusedField('additionalMonthlyPayment')}
                    onBlur={() => {
                      setFocusedField(null);
                      field.onBlur();
                    }}
                  />
                </View>
              )}
            />
            <FieldError message={errors.additionalMonthlyPayment?.message} />
          </>
        )}

        {/* Desired Payment */}
        {calculationType === LoanCalculationType.PAYMENT && (
          <>
            <Label>{t('calculator.desiredPayment')}</Label>
            <Controller
              control={control}
              name="desiredMonthlyPayment"
              render={({ field }) => (
                <View style={[styles.inputShell, errors.desiredMonthlyPayment && styles.inputError]}>
                  <Text style={styles.affix}>{currencySymbol}</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="decimal-pad"
                    placeholder={t('calculator.desiredPaymentPlaceholder')}
                    placeholderTextColor={colours.textSecondary}
                    value={displayNumberValue(field.value, focusedField !== 'desiredMonthlyPayment')}
                    onChangeText={value => field.onChange(sanitiseNumberText(value))}
                    onFocus={() => setFocusedField('desiredMonthlyPayment')}
                    onBlur={() => {
                      setFocusedField(null);
                      field.onBlur();
                    }}
                  />
                </View>
              )}
            />
            <FieldError message={errors.desiredMonthlyPayment?.message} />
          </>
        )}

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
    padding: 16,
    paddingBottom: 124,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    height: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    height: 48,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  affix: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    marginRight: 8,
  },
  suffixAffix: {
    marginRight: 0,
    marginLeft: 8,
  },
  inputError: {
    borderColor: colours.error,
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
    lineHeight: 48,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.error,
    marginTop: 4,
  },
  downPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  downPaymentInput: { flex: 1 },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    marginTop: 14,
    height: 42,
  },
  modeHelp: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: colours.primary,
  },
  modeBtnText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  modeBtnTextActive: {
    color: colours.white,
  },
  termRow: {
    flexDirection: 'row',
    gap: 12,
  },
  termField: { flex: 1 },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    backgroundColor: colours.white,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
});
