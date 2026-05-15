import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { FormStepper, FormStepperSection } from '@/components/ui/FormStepper';
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
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { calculateDealMonthlyPayment, generateDefaultDealName } from '@/mortgage/tracker';
import { LoanDeal, MortgageRepaymentType } from '@/types/SavedLoan';
import { colours, elevation, radii, spacing } from '@/theme';
import { formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';

interface Props {
  currency: CurrencyCode;
  initialDeal: LoanDeal;
  canPublish: boolean;
  onSave: (deal: LoanDeal, mortgageTermInMonths?: number) => void;
  onCancel?: () => void;
  onDeleteDraft?: () => void;
  fixedStartDate?: string;
  mortgageStartDate: string;
  mortgageTermInMonths: number;
  isInitialDeal: boolean;
  canEditMortgageTerm: boolean;
  banner?: React.ReactNode;
  showSectionTabs?: boolean;
}

const numberText = (value: number) => (Number.isFinite(value) ? String(value) : '0');

type AmountValidation = { numeric: number; errorKey?: string; isEmpty: boolean };

const validateAmount = (
  raw: string,
  options: { allowZero?: boolean; required?: boolean; integer?: boolean } = {},
): AmountValidation => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return {
      numeric: 0,
      isEmpty: true,
      errorKey: options.required ? 'forms.required' : undefined,
    };
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return { numeric: 0, isEmpty: false, errorKey: 'forms.invalidNumber' };
  }
  if (options.integer && !Number.isInteger(numeric)) {
    return { numeric, isEmpty: false, errorKey: 'forms.invalidNumber' };
  }
  if (numeric < 0) {
    return { numeric, isEmpty: false, errorKey: 'forms.requiredPositive' };
  }
  if (!options.allowZero && numeric <= 0) {
    return { numeric, isEmpty: false, errorKey: 'forms.requiredPositive' };
  }
  return { numeric, isEmpty: false };
};

const monthsBetweenDates = (startDate: string, endDate: string): number => {
  const start = parseDateLabelValue(startDate);
  const end = parseDateLabelValue(endDate);
  if (!start || !end) return 0;

  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
};

const splitMonths = (totalMonths: number) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});

const addMonthsIso = (dateString: string, totalMonths: number): string => {
  const date = parseDateLabelValue(dateString);
  if (!date) return dateString;
  date.setMonth(date.getMonth() + totalMonths);
  return formatIsoDate(date);
};

export const DealEditorForm = ({
  currency,
  initialDeal,
  canPublish,
  onSave,
  onCancel,
  onDeleteDraft,
  fixedStartDate,
  mortgageStartDate,
  mortgageTermInMonths,
  isInitialDeal,
  canEditMortgageTerm,
  banner,
  showSectionTabs = true,
}: Props) => {
  const { t } = useTranslation();
  const fieldError = (field: AmountValidation) =>
    !field.isEmpty && field.errorKey ? t(field.errorKey) : undefined;
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const initialAdditionalBorrowing = initialDeal.additionalBorrowing ?? 0;
  const projectedPreviousBalance = isInitialDeal
    ? 0
    : Math.max(0, initialDeal.openingBalance - initialAdditionalBorrowing);
  const initialTermSplit = splitMonths(Math.max(1, Math.round(mortgageTermInMonths)));
  const isEstimateInitialDeal = isInitialDeal && initialDeal.source === 'estimate';
  const initialDealDurationInMonths = isEstimateInitialDeal
    ? Math.min(Math.max(1, mortgageTermInMonths), 60)
    : monthsBetweenDates(fixedStartDate ?? initialDeal.startDate, initialDeal.endDate);
  const initialDealDurationSplit = splitMonths(initialDealDurationInMonths);
  const initialAutoName = generateDefaultDealName(
    initialDealDurationSplit.years,
    initialDealDurationSplit.months,
    initialDeal.repaymentType,
  );

  const [name, setName] = useState(isEstimateInitialDeal ? initialAutoName : initialDeal.name);
  const [isNameCustomized, setIsNameCustomized] = useState(() => (
    isEstimateInitialDeal ? false : initialDeal.name !== initialAutoName
  ));
  const [lender, setLender] = useState(initialDeal.lender ?? '');
  const [startDate, setStartDate] = useState(initialDeal.startDate);
  const [endDate, setEndDate] = useState(addMonthsIso(fixedStartDate ?? initialDeal.startDate, initialDealDurationInMonths));
  const [dealDurationYears, setDealDurationYears] = useState(numberText(initialDealDurationSplit.years));
  const [dealDurationMonths, setDealDurationMonths] = useState(numberText(initialDealDurationSplit.months));
  const [openingBalance, setOpeningBalance] = useState(numberText(initialDeal.openingBalance));
  const [additionalBorrowing, setAdditionalBorrowing] = useState(numberText(initialAdditionalBorrowing));
  const [interestRate, setInterestRate] = useState(numberText(initialDeal.interestRate));
  const [repaymentType, setRepaymentType] = useState<MortgageRepaymentType>(initialDeal.repaymentType);
  const [regularOverpayment, setRegularOverpayment] = useState(numberText(initialDeal.regularOverpayment));
  const [totalTermYears, setTotalTermYears] = useState(numberText(initialTermSplit.years));
  const [totalTermMonths, setTotalTermMonths] = useState(numberText(initialTermSplit.months));
  const [completedAt, setCompletedAt] = useState(initialDeal.completion?.completedAt ?? initialDeal.endDate);
  const [closingBalance, setClosingBalance] = useState(numberText(initialDeal.completion?.closingBalance ?? 0));
  const [feesAdded, setFeesAdded] = useState(numberText(initialDeal.completion?.feesAdded ?? 0));
  const [completionNotes, setCompletionNotes] = useState(initialDeal.completion?.notes ?? '');

  const effectiveStartDate = fixedStartDate ?? startDate;

  const validation = useMemo(() => {
    const openingBalanceField = validateAmount(openingBalance, { required: isInitialDeal });
    const additionalBorrowingField = validateAmount(additionalBorrowing, { allowZero: true });
    const interestRateField = validateAmount(interestRate, { required: true });
    const dealDurationYearsField = validateAmount(dealDurationYears, { allowZero: true, integer: true });
    const dealDurationMonthsField = validateAmount(dealDurationMonths, { allowZero: true, integer: true });
    const totalTermYearsField = validateAmount(totalTermYears, { allowZero: true, integer: true });
    const totalTermMonthsField = validateAmount(totalTermMonths, { allowZero: true, integer: true });
    const regularOverpaymentField = validateAmount(regularOverpayment, { allowZero: true });
    const closingBalanceField = validateAmount(closingBalance, { allowZero: true });
    const feesAddedField = validateAmount(feesAdded, { allowZero: true });

    const dealDurationMonthsTotal = (dealDurationYearsField.numeric * 12) + dealDurationMonthsField.numeric;
    const dealDurationCombinedError = dealDurationMonthsTotal <= 0 ? 'forms.requiredPositive' : undefined;
    const totalTermMonthsTotal = (totalTermYearsField.numeric * 12) + totalTermMonthsField.numeric;
    const totalTermCombinedError = canEditMortgageTerm && totalTermMonthsTotal <= 0
      ? 'forms.requiredPositive'
      : undefined;

    return {
      openingBalanceField,
      additionalBorrowingField,
      interestRateField,
      dealDurationYearsField,
      dealDurationMonthsField,
      totalTermYearsField,
      totalTermMonthsField,
      regularOverpaymentField,
      closingBalanceField,
      feesAddedField,
      dealDurationCombinedError,
      totalTermCombinedError,
    };
  }, [
    additionalBorrowing,
    canEditMortgageTerm,
    closingBalance,
    dealDurationMonths,
    dealDurationYears,
    feesAdded,
    interestRate,
    isInitialDeal,
    openingBalance,
    regularOverpayment,
    totalTermMonths,
    totalTermYears,
  ]);

  const dealDurationInMonths = Math.max(
    1,
    (validation.dealDurationYearsField.numeric * 12) + validation.dealDurationMonthsField.numeric,
  );

  // Keep endDate in sync when duration inputs change
  useEffect(() => {
    const next = addMonthsIso(effectiveStartDate, dealDurationInMonths);
    if (next !== endDate) setEndDate(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealDurationInMonths, effectiveStartDate]);

  // Auto-update deal name when duration or repayment type changes, unless user customised it
  useEffect(() => {
    if (!isNameCustomized) {
      const { years, months } = splitMonths(dealDurationInMonths);
      setName(generateDefaultDealName(years, months, repaymentType));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealDurationInMonths, repaymentType]);

  const additionalBorrowingValue = validation.additionalBorrowingField.numeric;
  const derivedOpeningBalance = isInitialDeal
    ? Math.max(0, validation.openingBalanceField.numeric)
    : Math.max(0, projectedPreviousBalance + additionalBorrowingValue);
  const effectiveTotalMortgageTermInMonths = canEditMortgageTerm
    ? Math.max(1, (validation.totalTermYearsField.numeric * 12) + validation.totalTermMonthsField.numeric)
    : mortgageTermInMonths;
  const remainingTermInMonths = Math.max(
    effectiveTotalMortgageTermInMonths - monthsBetweenDates(mortgageStartDate, effectiveStartDate),
    1,
  );
  const remainingTerm = splitMonths(remainingTermInMonths);
  const calculatedMonthlyPayment = calculateDealMonthlyPayment(
    derivedOpeningBalance,
    validation.interestRateField.numeric,
    remainingTermInMonths,
    repaymentType,
  );

  const formHasErrors = (
    Boolean(validation.openingBalanceField.errorKey)
    || Boolean(validation.additionalBorrowingField.errorKey)
    || Boolean(validation.interestRateField.errorKey)
    || Boolean(validation.dealDurationYearsField.errorKey)
    || Boolean(validation.dealDurationMonthsField.errorKey)
    || Boolean(validation.totalTermYearsField.errorKey)
    || Boolean(validation.totalTermMonthsField.errorKey)
    || Boolean(validation.regularOverpaymentField.errorKey)
    || Boolean(validation.closingBalanceField.errorKey)
    || Boolean(validation.feesAddedField.errorKey)
    || Boolean(validation.dealDurationCombinedError)
    || Boolean(validation.totalTermCombinedError)
  );

  const dealFromState = useMemo<LoanDeal>(() => ({
    ...initialDeal,
    name: name.trim() || initialDeal.name,
    lender: lender || undefined,
    startDate: effectiveStartDate,
    endDate,
    openingBalance: derivedOpeningBalance,
    interestRate: validation.interestRateField.numeric,
    repaymentType,
    monthlyPayment: calculatedMonthlyPayment,
    regularOverpayment: validation.regularOverpaymentField.numeric,
    additionalBorrowing: isInitialDeal ? undefined : additionalBorrowingValue,
    remainingTermInYears: remainingTerm.years,
    remainingTermInMonths: remainingTerm.months,
    source: 'userDeal',
    completion: initialDeal.status === 'completed'
      ? {
        completedAt,
        closingBalance: validation.closingBalanceField.numeric,
        feesAdded: validation.feesAddedField.numeric,
        notes: completionNotes.trim() || undefined,
      }
      : initialDeal.completion,
    updatedAt: new Date().toISOString(),
  }), [
    additionalBorrowingValue,
    completedAt,
    completionNotes,
    derivedOpeningBalance,
    endDate,
    effectiveStartDate,
    initialDeal,
    isInitialDeal,
    lender,
    name,
    calculatedMonthlyPayment,
    remainingTerm.months,
    remainingTerm.years,
    repaymentType,
    validation.closingBalanceField.numeric,
    validation.feesAddedField.numeric,
    validation.interestRateField.numeric,
    validation.regularOverpaymentField.numeric,
  ]);

  const validate = () => {
    if (!isValidIsoDate(effectiveStartDate) || !isValidIsoDate(endDate) || endDate <= effectiveStartDate) {
      Alert.alert(t('mortgage.invalidDealTitle'), t('mortgage.invalidDealDates'));
      return false;
    }

    if (dealFromState.openingBalance <= 0 || dealFromState.interestRate <= 0 || dealFromState.monthlyPayment <= 0) {
      Alert.alert(t('mortgage.invalidDealTitle'), t('mortgage.invalidDealAmounts'));
      return false;
    }

    if (
      initialDeal.status === 'completed'
      && (
        !dealFromState.completion?.completedAt
        || !isValidIsoDate(dealFromState.completion.completedAt)
        || dealFromState.completion.closingBalance < 0
      )
    ) {
      Alert.alert(t('mortgage.invalidDealTitle'), t('mortgage.invalidCompletionDetails'));
      return false;
    }

    return true;
  };

  const saveWithStatus = (status: LoanDeal['status']) => {
    if (!validate()) return;
    const isPublishingDraft = initialDeal.status === 'draft' && status === 'active';
    if (isPublishingDraft && !canPublish) {
      Alert.alert(t('mortgage.cannotPublishTitle'), t('mortgage.cannotPublishMessage'));
      return;
    }

    const updatedMortgageTerm = canEditMortgageTerm && effectiveTotalMortgageTermInMonths !== mortgageTermInMonths
      ? effectiveTotalMortgageTermInMonths
      : undefined;

    onSave(
      {
        ...dealFromState,
        status,
        completion: status === 'completed' ? dealFromState.completion : undefined,
      },
      updatedMortgageTerm,
    );
  };

  const basicsSection = (
    <FormSection title={t('mortgage.coreDetails')} accent>
      <FieldHint>{t('mortgage.bankBalanceTruth')}</FieldHint>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.dealName')}</FieldLabel>
        <InputSurface>
          <AppTextInput
            value={name}
            onChangeText={value => {
              const { years, months } = splitMonths(dealDurationInMonths);
              const autoName = generateDefaultDealName(years, months, repaymentType);
              setIsNameCustomized(value !== autoName);
              setName(value);
            }}
            placeholder={t('mortgage.dealNamePlaceholder')}
          />
        </InputSurface>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('save.lender')}</FieldLabel>
        <LenderTextInput value={lender} onChange={setLender} />
      </View>

      <View style={styles.fieldGroup}>
        <DatePickerField
          label={t('mortgage.dealStartDate')}
          value={effectiveStartDate}
          onChange={value => {
            if (fixedStartDate) return;
            setStartDate(value);
          }}
          hint={fixedStartDate ? t('mortgage.dealStartLockedHint') : t('mortgage.dateFormatHint')}
          disabled={Boolean(fixedStartDate)}
        />
      </View>

      {!isInitialDeal && (
        <View style={styles.fieldGroup}>
          <FieldLabel>{t('mortgage.additionalBorrowing')}</FieldLabel>
          <InputSurface error={Boolean(validation.additionalBorrowingField.errorKey) && !validation.additionalBorrowingField.isEmpty}>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              keyboardType="decimal-pad"
              value={additionalBorrowing}
              onChangeText={setAdditionalBorrowing}
              placeholder="0"
            />
          </InputSurface>
          <FieldError message={fieldError(validation.additionalBorrowingField)} />
          <FieldHint>{t('mortgage.additionalBorrowingHint')}</FieldHint>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.openingBankBalance')}</FieldLabel>
        {isInitialDeal ? (
          <>
            <InputSurface error={Boolean(validation.openingBalanceField.errorKey) && !validation.openingBalanceField.isEmpty}>
              <InputAffix>{currencySymbol}</InputAffix>
              <AppTextInput
                keyboardType="decimal-pad"
                value={openingBalance}
                onChangeText={setOpeningBalance}
                placeholder="238420"
              />
            </InputSurface>
            <FieldError message={fieldError(validation.openingBalanceField)} />
          </>
        ) : (
          <View style={styles.readonlyPanel}>
            <AppText variant="title2" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(derivedOpeningBalance, currency)}
            </AppText>
            <AppText variant="helper" tone="muted" style={styles.readonlyPanelHelp}>
              {formatCurrency(projectedPreviousBalance, currency)}
              {additionalBorrowingValue > 0
                ? ` + ${formatCurrency(additionalBorrowingValue, currency)}`
                : ''}
            </AppText>
          </View>
        )}
      </View>
    </FormSection>
  );

  const rateAndTermSection = (
    <FormSection title={t('mortgage.rateAndTerm')}>
      <View style={styles.fieldGroup}>
        <FieldLabel>{t('calculator.interestRate')}</FieldLabel>
        <InputSurface error={Boolean(validation.interestRateField.errorKey) && !validation.interestRateField.isEmpty}>
          <AppTextInput
            keyboardType="decimal-pad"
            value={interestRate}
            onChangeText={setInterestRate}
            placeholder="4.29"
          />
          <InputAffix trailing>%</InputAffix>
        </InputSurface>
        <FieldError message={fieldError(validation.interestRateField)} />
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.dealDuration')}</FieldLabel>
        <View style={styles.row}>
          <View style={styles.half}>
            <InputSurface error={Boolean(validation.dealDurationYearsField.errorKey) && !validation.dealDurationYearsField.isEmpty}>
              <AppTextInput
                keyboardType="number-pad"
                value={dealDurationYears}
                onChangeText={setDealDurationYears}
                placeholder="5"
              />
              <InputAffix trailing>{t('mortgage.totalMortgageTermYears')}</InputAffix>
            </InputSurface>
          </View>
          <View style={styles.half}>
            <InputSurface error={Boolean(validation.dealDurationMonthsField.errorKey) && !validation.dealDurationMonthsField.isEmpty}>
              <AppTextInput
                keyboardType="number-pad"
                value={dealDurationMonths}
                onChangeText={setDealDurationMonths}
                placeholder="0"
              />
              <InputAffix trailing>{t('mortgage.totalMortgageTermMonths')}</InputAffix>
            </InputSurface>
          </View>
        </View>
        <FieldError message={validation.dealDurationCombinedError ? t(validation.dealDurationCombinedError) : undefined} />
        <FieldHint>{t('mortgage.dealDurationHint')}</FieldHint>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.repaymentType')}</FieldLabel>
        <SegmentedControl
          value={repaymentType}
          onChange={setRepaymentType}
          options={[
            { label: t('mortgage.repayment'), value: 'repayment' },
            { label: t('mortgage.interestOnly'), value: 'interestOnly' },
          ]}
        />
      </View>

      {canEditMortgageTerm && (
        <View style={styles.fieldGroup}>
          <FieldLabel>{t('mortgage.totalMortgageTerm')}</FieldLabel>
          <View style={styles.row}>
            <View style={styles.half}>
              <InputSurface error={Boolean(validation.totalTermYearsField.errorKey) && !validation.totalTermYearsField.isEmpty}>
                <AppTextInput
                  keyboardType="number-pad"
                  value={totalTermYears}
                  onChangeText={setTotalTermYears}
                  placeholder="35"
                />
                <InputAffix trailing>{t('mortgage.totalMortgageTermYears')}</InputAffix>
              </InputSurface>
            </View>
            <View style={styles.half}>
              <InputSurface error={Boolean(validation.totalTermMonthsField.errorKey) && !validation.totalTermMonthsField.isEmpty}>
                <AppTextInput
                  keyboardType="number-pad"
                  value={totalTermMonths}
                  onChangeText={setTotalTermMonths}
                  placeholder="0"
                />
                <InputAffix trailing>{t('mortgage.totalMortgageTermMonths')}</InputAffix>
              </InputSurface>
            </View>
          </View>
          <FieldError message={validation.totalTermCombinedError ? t(validation.totalTermCombinedError) : undefined} />
          <FieldHint>{t('mortgage.totalMortgageTermHint')}</FieldHint>
        </View>
      )}
    </FormSection>
  );

  const paymentsSection = (
    <FormSection title={t('mortgage.payments')} accent>
      <View style={styles.fieldGroup}>
        <FieldLabel>{t('results.monthlyPayment')}</FieldLabel>
        <View style={styles.readonlyPanel}>
          <AppText variant="title2" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(calculatedMonthlyPayment, currency)}
          </AppText>
          <AppText variant="helper" tone="muted" style={styles.readonlyPanelHelp}>
            {t('mortgage.monthlyPaymentAutoHelp')}
          </AppText>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('calculator.additionalPayment')}</FieldLabel>
        <InputSurface error={Boolean(validation.regularOverpaymentField.errorKey) && !validation.regularOverpaymentField.isEmpty}>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            keyboardType="decimal-pad"
            value={regularOverpayment}
            onChangeText={setRegularOverpayment}
            placeholder="150"
          />
        </InputSurface>
        <FieldError message={fieldError(validation.regularOverpaymentField)} />
      </View>
    </FormSection>
  );

  const completionSection = (
    <FormSection title={t('mortgage.completionDetails')} accent>
      <View style={styles.fieldGroup}>
        <DatePickerField
          label={t('mortgage.completionDate')}
          value={completedAt}
          onChange={setCompletedAt}
          hint={t('mortgage.dateFormatHint')}
        />
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.closingBankBalance')}</FieldLabel>
        <InputSurface error={Boolean(validation.closingBalanceField.errorKey) && !validation.closingBalanceField.isEmpty}>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            keyboardType="decimal-pad"
            value={closingBalance}
            onChangeText={setClosingBalance}
            placeholder="210000"
          />
        </InputSurface>
        <FieldError message={fieldError(validation.closingBalanceField)} />
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.feesAdded')}</FieldLabel>
        <InputSurface error={Boolean(validation.feesAddedField.errorKey) && !validation.feesAddedField.isEmpty}>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            keyboardType="decimal-pad"
            value={feesAdded}
            onChangeText={setFeesAdded}
            placeholder="0"
          />
        </InputSurface>
        <FieldError message={fieldError(validation.feesAddedField)} />
        <FieldHint>{t('mortgage.feesAddedHint')}</FieldHint>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.notes')}</FieldLabel>
        <InputSurface multiline>
          <AppTextInput
            style={styles.noteInput}
            value={completionNotes}
            onChangeText={setCompletionNotes}
            placeholder={t('mortgage.notesPlaceholder')}
            multiline
          />
        </InputSurface>
      </View>
    </FormSection>
  );

  const sections: FormStepperSection[] = [
    { key: 'basics', label: t('mortgage.coreDetails'), content: basicsSection },
    { key: 'rate', label: t('mortgage.rateAndTerm'), content: rateAndTermSection },
    { key: 'payments', label: t('mortgage.payments'), content: paymentsSection },
  ];
  if (initialDeal.status === 'completed') {
    sections.push({ key: 'completion', label: t('mortgage.completionDetails'), content: completionSection });
  }

  const isDraft = initialDeal.status === 'draft';
  const primaryLabel = isDraft && canPublish ? t('mortgage.publishDeal') : t('edit.save');
  const handlePrimary = () => {
    if (isDraft) {
      saveWithStatus(canPublish ? 'active' : 'draft');
      return;
    }
    saveWithStatus(initialDeal.status);
  };

  const footer = (
    <View style={styles.footer}>
      {isDraft && !canPublish ? (
        <AppText variant="bodySm" tone="muted" style={styles.footerHint}>
          {t('mortgage.draftOnlyUntilCompleted')}
        </AppText>
      ) : null}
      <View style={styles.actionsRow}>
        {onCancel ? (
          <Button label={t('save.cancel')} onPress={onCancel} variant="secondary" style={styles.action} />
        ) : null}
        {isDraft && canPublish ? (
          <Button
            label={t('mortgage.saveAsDraft')}
            onPress={() => saveWithStatus('draft')}
            variant="secondary"
            style={styles.action}
            disabled={formHasErrors}
          />
        ) : null}
        <Button label={primaryLabel} onPress={handlePrimary} style={styles.action} disabled={formHasErrors} />
      </View>
      {onDeleteDraft ? (
        <Button label={t('mortgage.deleteDraft')} onPress={onDeleteDraft} variant="ghost" style={styles.deleteAction} />
      ) : null}
    </View>
  );

  return (
    <FormStepper
      sections={sections}
      footer={footer}
      banner={banner}
      showTabs={showSectionTabs}
    />
  );
};

const styles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  noteInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  readonlyPanel: {
    borderWidth: 1,
    borderColor: colours.borderSoft,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceRaised,
    padding: spacing.md,
    ...elevation.level1,
  },
  readonlyPanelHelp: {
    marginTop: spacing.xs,
  },
  footer: {
    gap: spacing.sm,
  },
  footerHint: {
    marginBottom: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: { flex: 1 },
  deleteAction: { marginTop: spacing.xs },
});
