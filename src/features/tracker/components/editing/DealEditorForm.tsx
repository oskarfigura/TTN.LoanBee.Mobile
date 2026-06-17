import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, ButtonVariant } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { DatePickerField } from '@/shared/ui/components/DatePickerField';
import { FormStepper, FormStepperSection } from '@/shared/ui/components/FormStepper';
import {
  AppTextInput,
  FieldError,
  FieldHint,
  FieldLabel,
  FormSection,
  InputAffix,
  InputSurface,
  SegmentedControl,
} from '@oskarfigura/ui-native';
import { LenderTextInput } from '@/features/tracker/components/editing/LenderTextInput';
import { CURRENCIES, CurrencyCode } from '@/shared/domain/currency/currencies';
import { formatCurrency } from '@/shared/domain/currency/format';
import { calculateDealMonthlyPayment, generateDefaultDealName } from '@/shared/domain/mortgage/tracker';
import { LoanDeal, MortgageRepaymentType } from '@/shared/domain/types/SavedLoan';
import { colours, elevation, radii, spacing } from '@/shared/ui/theme';
import { advanceMonthsClamped, formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/shared/lib/utils/date';
import {
  NumericValidation,
  validateDurationText,
  validateMoneyText,
} from '@/shared/lib/utils/formValidation';

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
  advanceMonthsClamped(date, totalMonths);
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
  const fieldError = (field: NumericValidation) =>
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
  const [totalTermYears, setTotalTermYears] = useState(numberText(initialTermSplit.years));
  const [totalTermMonths, setTotalTermMonths] = useState(numberText(initialTermSplit.months));
  const [completedAt, setCompletedAt] = useState(initialDeal.completion?.completedAt ?? initialDeal.endDate);
  const [closingBalance, setClosingBalance] = useState(numberText(initialDeal.completion?.closingBalance ?? 0));
  const [feesAdded, setFeesAdded] = useState(numberText(initialDeal.completion?.feesAdded ?? 0));
  const [completionNotes, setCompletionNotes] = useState(initialDeal.completion?.notes ?? '');

  const effectiveStartDate = fixedStartDate ?? startDate;

  const validation = useMemo(() => {
    const openingBalanceField = validateMoneyText(openingBalance, { required: isInitialDeal });
    const additionalBorrowingField = validateMoneyText(additionalBorrowing, { allowZero: true });
    const interestRateField = validateMoneyText(interestRate);
    const dealDuration = validateDurationText(dealDurationYears, dealDurationMonths);
    const totalTerm = validateDurationText(totalTermYears, totalTermMonths);
    const closingBalanceField = validateMoneyText(closingBalance, { allowZero: true });
    const feesAddedField = validateMoneyText(feesAdded, { allowZero: true });

    return {
      openingBalanceField,
      additionalBorrowingField,
      interestRateField,
      dealDurationYearsField: dealDuration.years,
      dealDurationMonthsField: dealDuration.months,
      totalTermYearsField: totalTerm.years,
      totalTermMonthsField: totalTerm.months,
      closingBalanceField,
      feesAddedField,
      dealDurationMonthsTotal: dealDuration.totalMonths,
      totalTermMonthsTotal: totalTerm.totalMonths,
      dealDurationCombinedError: dealDuration.errorKey,
      totalTermCombinedError: canEditMortgageTerm ? totalTerm.errorKey : undefined,
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
    totalTermMonths,
    totalTermYears,
  ]);

  const dealDurationInMonths = Math.max(
    1,
    validation.dealDurationMonthsTotal,
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
    ? Math.max(1, validation.totalTermMonthsTotal)
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
    regularOverpayment: initialDeal.regularOverpayment,
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
        <FieldError
          message={
            fieldError(validation.dealDurationYearsField)
            || fieldError(validation.dealDurationMonthsField)
            || (validation.dealDurationCombinedError ? t(validation.dealDurationCombinedError) : undefined)
          }
        />
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
          <FieldError
            message={
              fieldError(validation.totalTermYearsField)
              || fieldError(validation.totalTermMonthsField)
              || (validation.totalTermCombinedError ? t(validation.totalTermCombinedError) : undefined)
            }
          />
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
        {isDraft && canPublish ? (
          <Button
            label={t('mortgage.saveAsDraft')}
            onPress={() => saveWithStatus('draft')}
            variant={ButtonVariant.Secondary}
            style={styles.action}
            disabled={formHasErrors}
          />
        ) : null}
        <Button label={primaryLabel} onPress={handlePrimary} style={styles.action} disabled={formHasErrors} />
      </View>
      {onCancel ? (
        <Button label={t('save.cancel')} onPress={onCancel} variant={ButtonVariant.Ghost} style={styles.cancelAction} />
      ) : null}
      {onDeleteDraft ? (
        <Button label={t('mortgage.deleteDraft')} onPress={onDeleteDraft} variant="destructiveGhost" style={styles.deleteAction} />
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
  cancelAction: { marginTop: spacing.xxs },
  deleteAction: { marginTop: spacing.xxs },
});
