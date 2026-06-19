import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LoanCalculatorFormInputValues,
  LoanCalculatorFormValues,
} from '@/shared/lib/hooks/useLoanCalculatorForm';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { CURRENCIES } from '@/shared/domain/currency/currencies';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { Button } from '@oskarfigura/ui-native';
import {
  AppText,
  AppTextInput,
  FieldError,
  FieldHint,
  FieldLabel,
  FormSection,
  InputAffix,
  InputSurface,
} from '@oskarfigura/ui-native';
import { DatePickerField } from '@/shared/ui/components/DatePickerField';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { ChoiceTabs } from '@/shared/ui/components/ChoiceTabs';
import { DownPaymentToggle } from './DownPaymentToggle';
import { CurrencyPicker } from './CurrencyPicker';

interface Props {
  form: UseFormReturn<LoanCalculatorFormInputValues, undefined, LoanCalculatorFormValues>;
  onSubmit: (values: LoanCalculatorFormValues) => void;
  topContent?: React.ReactNode;
  submitLabel?: string;
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

export const LoanForm = ({ form, onSubmit, topContent, submitLabel }: Props) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { control, handleSubmit, watch, setValue, formState: { errors } } = form;
  const calculationType = watch('calculationType');
  const category = watch('category') ?? 'mortgage';
  const downPaymentType = watch('downPaymentType') as DownPaymentType;
  const currency = watch('currency');
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const startDateStr = watch('startDate');
  const downPaymentAffix = downPaymentType === DownPaymentType.CASH ? currencySymbol : '%';
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const fieldRefs = useRef<Partial<Record<string, View | null>>>({});

  // The calculator lives on a persistent tab, so arriving here (e.g. Edit on a recent
  // calculation) would otherwise keep whatever scroll position was left behind. Reset
  // to the top of the form on every focus so editing always starts from the first field.
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const errorMessage = useCallback((message?: string) => {
    if (!message) return undefined;
    const [key, amount] = message.split('|');
    if (key === 'errors.desiredPaymentMinimum') {
      return t(key, { amount });
    }

    return t(key, { defaultValue: message });
  }, [t]);

  const registerFieldRef = useCallback((name: string) => (node: View | null) => {
    fieldRefs.current[name] = node;
  }, []);

  const scrollFieldIntoView = useCallback((name: string) => {
    const field = fieldRefs.current[name];
    if (!field || !scrollRef.current) return;

    field.measureInWindow((_x, y, _width, height) => {
      const keyboardTop = Dimensions.get('window').height - keyboardHeightRef.current - spacing.lg;
      const fieldBottom = y + height;
      if (fieldBottom <= keyboardTop) return;

      const delta = fieldBottom - keyboardTop;
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollOffsetRef.current + delta),
        animated: true,
      });
    });
  }, []);

  const handleFieldFocus = useCallback((name: string) => {
    setFocusedField(name);
    requestAnimationFrame(() => {
      scrollFieldIntoView(name);
    });
  }, [scrollFieldIntoView]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, event => {
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardInset(event.endCoordinates.height);
      if (focusedField) {
        requestAnimationFrame(() => {
          scrollFieldIntoView(focusedField);
        });
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [focusedField, scrollFieldIntoView]);

  useEffect(() => {
    if (category !== 'loan') return;
    setValue('downPayment', 0, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [category, setValue]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + spacing.lg : 0}
      style={styles.keyboardView}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        onScroll={event => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: spacing.xl + keyboardInset + insets.bottom },
        ]}
      >
        {topContent}
        <FormSection style={styles.section}>
          <View style={styles.choiceGroup}>
            <FieldLabel>{t('calculator.borrowingType')}</FieldLabel>
            <ChoiceTabs
              value={category}
              onChange={value => setValue('category', value, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })}
              options={[
                { label: t('save.mortgage'), value: 'mortgage' },
                { label: t('save.loan'), value: 'loan' },
              ]}
            />
          </View>

          <View ref={registerFieldRef('loanAmount')} style={styles.fieldGroup}>
            <FieldLabel>
              {t(category === 'mortgage' ? 'calculator.propertyPrice' : 'calculator.amountBorrowed')}
            </FieldLabel>
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
                    onFocus={() => handleFieldFocus('loanAmount')}
                    onBlur={() => {
                      setFocusedField(null);
                      field.onBlur();
                    }}
                  />
                </InputSurface>
              )}
            />
            <FieldError message={errorMessage(errors.loanAmount?.message)} />
          </View>

          {category === 'mortgage' ? (
            <View ref={registerFieldRef('downPayment')} style={styles.fieldGroup}>
              <FieldLabel>{t('calculator.deposit')}</FieldLabel>
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
                          onFocus={() => handleFieldFocus('downPayment')}
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
              <FieldError message={errorMessage(errors.downPayment?.message)} />
            </View>
          ) : null}

          <View ref={registerFieldRef('interest')} style={styles.fieldGroup}>
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
                    onFocus={() => handleFieldFocus('interest')}
                    onBlur={() => {
                      setFocusedField(null);
                      field.onBlur();
                    }}
                  />
                  <InputAffix trailing>%</InputAffix>
                </InputSurface>
              )}
            />
            <FieldError message={errorMessage(errors.interest?.message)} />
          </View>

          <View ref={registerFieldRef('calculationType')} style={styles.choiceGroup}>
            <FieldLabel>{t('calculator.goal')}</FieldLabel>
            <ChoiceTabs
              value={calculationType}
              onChange={mode => setValue('calculationType', mode)}
              options={[
                { label: t('calculator.findMonthlyPayment'), value: LoanCalculationType.TERM },
                { label: t('calculator.findPayoffTime'), value: LoanCalculationType.PAYMENT },
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
              <View ref={registerFieldRef('term')} style={styles.termRow}>
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
                          onFocus={() => handleFieldFocus('term')}
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
                          onFocus={() => handleFieldFocus('term')}
                          onBlur={field.onBlur}
                        />
                      </InputSurface>
                    )}
                  />
                </View>
              </View>
              <FieldError message={errorMessage(errors.termInYears?.message || errors.termInMonths?.message)} />

            </>
          ) : (
            <View ref={registerFieldRef('desiredMonthlyPayment')} style={styles.fieldGroup}>
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
                      onFocus={() => handleFieldFocus('desiredMonthlyPayment')}
                      onBlur={() => {
                        setFocusedField(null);
                        field.onBlur();
                      }}
                    />
                  </InputSurface>
                )}
              />
              <FieldError message={errorMessage(errors.desiredMonthlyPayment?.message)} />
            </View>
          )}

          <View style={styles.advancedSection}>
            <TouchableOpacity
              style={[
                styles.advancedToggle,
                advancedOpen && styles.advancedToggleOpen,
              ]}
              onPress={() => setAdvancedOpen(open => !open)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityState={{ expanded: advancedOpen }}
            >
              <View style={styles.advancedCopy}>
                <FieldLabel>{t('calculator.moreOptions')}</FieldLabel>
                <AppText variant="bodySm" tone="muted">
                  {t('calculator.moreOptionsHelp')}
                </AppText>
              </View>
              <View style={styles.advancedChevron}>
                <Icon
                  icon={advancedOpen ? IconName.ChevronUpIcon : IconName.ChevronDownIcon}
                  size={18}
                  color={colours.primary}
                  strokeWidth={2}
                />
              </View>
            </TouchableOpacity>

            {advancedOpen ? (
              <View style={styles.advancedBody}>
                {calculationType === LoanCalculationType.TERM ? (
                  <View ref={registerFieldRef('additionalMonthlyPayment')} style={styles.fieldGroup}>
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
                            onFocus={() => handleFieldFocus('additionalMonthlyPayment')}
                            onBlur={() => {
                              setFocusedField(null);
                              field.onBlur();
                            }}
                          />
                        </InputSurface>
                      )}
                    />
                    <FieldHint>{t('calculator.additionalPaymentHelp')}</FieldHint>
                    <FieldError message={errorMessage(errors.additionalMonthlyPayment?.message)} />
                  </View>
                ) : null}

                <View ref={registerFieldRef('startDate')} style={styles.fieldGroup}>
                  <DatePickerField
                    label={t('calculator.startDate')}
                    value={startDateStr}
                    onChange={value => setValue('startDate', value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })}
                    hint={t('calculator.startDateHelp')}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FieldLabel>{t('calculator.currency')}</FieldLabel>
                  <CurrencyPicker
                    value={currency as (typeof CURRENCIES)[number]['code']}
                    onChange={value => setValue('currency', value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <Button
            label={submitLabel ?? t('calculator.generate')}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
          />
        </FormSection>

      </ScrollView>
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
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
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
  choiceGroup: {
    gap: spacing.xxs,
  },
  termRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  termField: { flex: 1 },
  advancedSection: {
    marginTop: spacing.xs,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  advancedToggleOpen: {
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  advancedCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  advancedChevron: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
  },
  advancedBody: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
