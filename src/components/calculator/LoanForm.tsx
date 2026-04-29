import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LoanCalculatorFormValues } from '@/hooks/useLoanCalculatorForm';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { CurrencyCode } from '@/currency/currencies';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { Button } from '@/components/ui/Button';
import { CurrencyPicker } from './CurrencyPicker';
import { DownPaymentToggle } from './DownPaymentToggle';

interface Props {
  form: UseFormReturn<LoanCalculatorFormValues>;
  onSubmit: (values: LoanCalculatorFormValues) => void;
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <Text style={styles.error}>{message}</Text> : null;

const Label = ({ children }: { children: string }) => (
  <Text style={styles.label}>{children}</Text>
);

export const LoanForm = ({ form, onSubmit }: Props) => {
  const { t } = useTranslation();
  const { control, handleSubmit, watch, setValue, formState: { errors } } = form;
  const calculationType = watch('calculationType');
  const downPaymentType = watch('downPaymentType') as DownPaymentType;
  const currency = watch('currency') as CurrencyCode;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const startDateStr = watch('startDate');
  const startDate = startDateStr ? new Date(startDateStr) : new Date();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Currency Picker */}
        <Label>{t('calculator.currency')}</Label>
        <CurrencyPicker
          value={currency}
          onChange={v => setValue('currency', v)}
        />

        {/* Loan Amount */}
        <Label>{t('calculator.loanAmount')}</Label>
        <Controller
          control={control}
          name="loanAmount"
          render={({ field }) => (
            <TextInput
              style={[styles.input, errors.loanAmount && styles.inputError]}
              keyboardType="decimal-pad"
              placeholder={t('calculator.loanAmountPlaceholder')}
              placeholderTextColor={colours.textSecondary}
              value={field.value ? String(field.value) : ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError message={errors.loanAmount?.message} />

        {/* Interest Rate */}
        <Label>{t('calculator.interestRate')}</Label>
        <Controller
          control={control}
          name="interest"
          render={({ field }) => (
            <TextInput
              style={[styles.input, errors.interest && styles.inputError]}
              keyboardType="decimal-pad"
              placeholder={t('calculator.interestPlaceholder')}
              placeholderTextColor={colours.textSecondary}
              value={field.value ? String(field.value) : ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError message={errors.interest?.message} />

        {/* Down Payment */}
        <View style={styles.row}>
          <View style={styles.flex}>
            <Label>{t('calculator.downPayment')}</Label>
          </View>
          <DownPaymentToggle
            value={downPaymentType}
            onChange={v => setValue('downPaymentType', v)}
          />
        </View>
        <Controller
          control={control}
          name="downPayment"
          render={({ field }) => (
            <TextInput
              style={[styles.input, errors.downPayment && styles.inputError]}
              keyboardType="decimal-pad"
              placeholder={t('calculator.downPaymentPlaceholder')}
              placeholderTextColor={colours.textSecondary}
              value={field.value ? String(field.value) : ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError message={errors.downPayment?.message} />

        {/* Start Date */}
        <Label>{t('calculator.startDate')}</Label>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.dateText}>{startDateStr || t('calculator.startDate')}</Text>
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
                      value={field.value ? String(field.value) : ''}
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
                      value={field.value ? String(field.value) : ''}
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
                <TextInput
                  style={[styles.input, errors.additionalMonthlyPayment && styles.inputError]}
                  keyboardType="decimal-pad"
                  placeholder={t('calculator.additionalPaymentPlaceholder')}
                  placeholderTextColor={colours.textSecondary}
                  value={field.value ? String(field.value) : ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
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
                <TextInput
                  style={[styles.input, errors.desiredMonthlyPayment && styles.inputError]}
                  keyboardType="decimal-pad"
                  placeholder={t('calculator.desiredPaymentPlaceholder')}
                  placeholderTextColor={colours.textSecondary}
                  value={field.value ? String(field.value) : ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <FieldError message={errors.desiredMonthlyPayment?.message} />
          </>
        )}

        <Button
          label={t('calculator.generate')}
          onPress={handleSubmit(onSubmit)}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 12,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  flex: { flex: 1 },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    marginTop: 16,
    height: 44,
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
  submitBtn: {
    marginTop: 24,
  },
});
