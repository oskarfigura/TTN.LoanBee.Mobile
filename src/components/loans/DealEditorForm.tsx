import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import {
  AppTextInput,
  FieldHint,
  FieldLabel,
  FormSection,
  InputAffix,
  InputSurface,
  PillSelector,
  SegmentedControl,
} from '@/components/ui/FormPrimitives';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { calculateDealMonthlyPayment, formatDealDuration } from '@/mortgage/tracker';
import { LoanDeal, MortgageRepaymentType } from '@/types/SavedLoan';
import { colours, radii, spacing } from '@/theme';
import { formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';

interface Props {
  currency: CurrencyCode;
  initialDeal: LoanDeal;
  canPublish: boolean;
  onSave: (deal: LoanDeal) => void;
  onDeleteDraft?: () => void;
  fixedStartDate?: string;
  mortgageStartDate: string;
  mortgageTermInMonths: number;
}

const termOptions = [
  { labelKey: 'mortgage.termPreset2', value: '2', years: 2 },
  { labelKey: 'mortgage.termPreset3', value: '3', years: 3 },
  { labelKey: 'mortgage.termPreset5', value: '5', years: 5 },
  { labelKey: 'mortgage.termPreset10', value: '10', years: 10 },
];

const addYears = (dateString: string, years: number): string => {
  const date = parseDateLabelValue(dateString);
  if (!date) return dateString;
  date.setFullYear(date.getFullYear() + years);
  return formatIsoDate(date);
};

const numberText = (value: number) => (Number.isFinite(value) ? String(value) : '0');

const getTermPresetForDates = (startDate: string, endDate: string): string => (
  termOptions.find(option => addYears(startDate, option.years) === endDate)?.value ?? ''
);

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

export const DealEditorForm = ({
  currency,
  initialDeal,
  canPublish,
  onSave,
  onDeleteDraft,
  fixedStartDate,
  mortgageStartDate,
  mortgageTermInMonths,
}: Props) => {
  const { t, i18n } = useTranslation();
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const [name, setName] = useState(initialDeal.name);
  const [lender, setLender] = useState(initialDeal.lender ?? '');
  const [startDate, setStartDate] = useState(initialDeal.startDate);
  const [endDate, setEndDate] = useState(initialDeal.endDate);
  const [selectedTerm, setSelectedTerm] = useState(getTermPresetForDates(fixedStartDate ?? initialDeal.startDate, initialDeal.endDate));
  const [openingBalance, setOpeningBalance] = useState(numberText(initialDeal.openingBalance));
  const [interestRate, setInterestRate] = useState(numberText(initialDeal.interestRate));
  const [repaymentType, setRepaymentType] = useState<MortgageRepaymentType>(initialDeal.repaymentType);
  const [regularOverpayment, setRegularOverpayment] = useState(numberText(initialDeal.regularOverpayment));
  const [activeStep, setActiveStep] = useState(0);
  const [completedAt, setCompletedAt] = useState(initialDeal.completion?.completedAt ?? initialDeal.endDate);
  const [closingBalance, setClosingBalance] = useState(numberText(initialDeal.completion?.closingBalance ?? 0));
  const [feesAdded, setFeesAdded] = useState(numberText(initialDeal.completion?.feesAdded ?? 0));
  const [completionNotes, setCompletionNotes] = useState(initialDeal.completion?.notes ?? '');

  const effectiveStartDate = fixedStartDate ?? startDate;
  const remainingTermInMonths = Math.max(
    mortgageTermInMonths - monthsBetweenDates(mortgageStartDate, effectiveStartDate),
    1,
  );
  const remainingTerm = splitMonths(remainingTermInMonths);
  const calculatedMonthlyPayment = calculateDealMonthlyPayment(
    Number(openingBalance) || 0,
    Number(interestRate) || 0,
    remainingTermInMonths,
    repaymentType,
  );

  const dealFromState = useMemo<LoanDeal>(() => ({
    ...initialDeal,
    name: name.trim() || initialDeal.name,
    lender: lender || undefined,
    startDate: effectiveStartDate,
    endDate,
    openingBalance: Number(openingBalance) || 0,
    interestRate: Number(interestRate) || 0,
    repaymentType,
    monthlyPayment: calculatedMonthlyPayment,
    regularOverpayment: Number(regularOverpayment) || 0,
    remainingTermInYears: remainingTerm.years,
    remainingTermInMonths: remainingTerm.months,
    completion: initialDeal.status === 'completed'
      ? {
        completedAt,
        closingBalance: Number(closingBalance) || 0,
        feesAdded: Number(feesAdded) || 0,
        notes: completionNotes.trim() || undefined,
      }
      : initialDeal.completion,
    updatedAt: new Date().toISOString(),
  }), [
    closingBalance,
    completedAt,
    completionNotes,
    endDate,
    effectiveStartDate,
    feesAdded,
    fixedStartDate,
    initialDeal,
    interestRate,
    lender,
    name,
    openingBalance,
    calculatedMonthlyPayment,
    regularOverpayment,
    remainingTermInMonths,
    repaymentType,
  ]);

  const updateStartDate = (nextStartDate: string) => {
    if (fixedStartDate) return;

    setStartDate(nextStartDate);
    const option = termOptions.find(item => item.value === selectedTerm);
    if (option) {
      setEndDate(addYears(nextStartDate, option.years));
    }
  };

  const updateEndDate = (nextEndDate: string) => {
    setEndDate(nextEndDate);
    setSelectedTerm(getTermPresetForDates(effectiveStartDate, nextEndDate));
  };

  const applyPresetTerm = (nextTerm: string) => {
    setSelectedTerm(nextTerm);
    const option = termOptions.find(item => item.value === nextTerm);
    if (option) {
      setEndDate(addYears(effectiveStartDate, option.years));
    }
  };

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
    if (status === 'active' && !canPublish) {
      Alert.alert(t('mortgage.cannotPublishTitle'), t('mortgage.cannotPublishMessage'));
      return;
    }

    onSave({
      ...dealFromState,
      status,
      completion: status === 'completed' ? dealFromState.completion : undefined,
    });
  };

  const coreDetailsSection = (
    <FormSection title={t('mortgage.coreDetails')} accent style={styles.section}>
      <FieldHint>{t('mortgage.bankBalanceTruth')}</FieldHint>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.dealName')}</FieldLabel>
        <InputSurface>
          <AppTextInput
            value={name}
            onChangeText={setName}
            placeholder={t('mortgage.dealNamePlaceholder')}
          />
        </InputSurface>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('save.lender')}</FieldLabel>
        <LenderTextInput value={lender} onChange={setLender} />
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <DatePickerField
            label={t('mortgage.dealStartDate')}
            value={effectiveStartDate}
            onChange={updateStartDate}
            hint={fixedStartDate ? t('mortgage.dealStartLockedHint') : t('mortgage.dateFormatHint')}
            disabled={Boolean(fixedStartDate)}
          />
        </View>
        <View style={styles.half}>
          <DatePickerField
            label={t('mortgage.dealEndDate')}
            value={endDate}
            onChange={updateEndDate}
            hint={t('mortgage.dateFormatHint')}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.openingBankBalance')}</FieldLabel>
        <InputSurface>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput keyboardType="decimal-pad" value={openingBalance} onChangeText={setOpeningBalance} placeholder="238420" />
        </InputSurface>
      </View>
    </FormSection>
  );

  const completionSection = initialDeal.status === 'completed' ? (
    <FormSection title={t('mortgage.completionDetails')} accent style={styles.section}>
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
        <InputSurface>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput keyboardType="decimal-pad" value={closingBalance} onChangeText={setClosingBalance} placeholder="210000" />
        </InputSurface>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.feesAdded')}</FieldLabel>
        <InputSurface>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput keyboardType="decimal-pad" value={feesAdded} onChangeText={setFeesAdded} placeholder="0" />
        </InputSurface>
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
  ) : null;

  const rateAndTermSection = (
    <FormSection title={t('mortgage.rateAndTerm')} style={styles.section}>
      <View style={styles.fieldGroup}>
        <FieldLabel>{t('calculator.interestRate')}</FieldLabel>
        <InputSurface>
          <AppTextInput keyboardType="decimal-pad" value={interestRate} onChangeText={setInterestRate} placeholder="4.29" />
          <InputAffix trailing>%</InputAffix>
        </InputSurface>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.presetTerm')}</FieldLabel>
        <PillSelector
          value={selectedTerm}
          onChange={applyPresetTerm}
          options={termOptions.map(option => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
        />
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
    </FormSection>
  );

  const paymentsSection = (
    <FormSection title={t('mortgage.payments')} accent style={styles.section}>
      <View style={styles.fieldGroup}>
        <FieldLabel>{t('results.monthlyPayment')}</FieldLabel>
        <View style={styles.calculatedPayment}>
          <AppText variant="title2" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(calculatedMonthlyPayment, currency)}
          </AppText>
          <AppText variant="helper" tone="muted" style={styles.calculatedPaymentHelp}>
            {t('mortgage.monthlyPaymentAutoHelp')}
          </AppText>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('calculator.additionalPayment')}</FieldLabel>
        <InputSurface>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput keyboardType="decimal-pad" value={regularOverpayment} onChangeText={setRegularOverpayment} placeholder="150" />
        </InputSurface>
      </View>

      <View style={styles.termSummary}>
        <AppText variant="labelMd" tone="muted">{t('mortgage.remainingMortgageTerm')}</AppText>
        <AppText variant="title3" tone="accent">{formatDealDuration(remainingTermInMonths, i18n.language)}</AppText>
      </View>
    </FormSection>
  );

  const saveActions = initialDeal.status === 'draft' ? (
    canPublish ? (
      <View style={styles.actions}>
        <Button label={t('mortgage.saveAsDraft')} onPress={() => saveWithStatus('draft')} variant="secondary" style={styles.action} />
        <Button label={t('mortgage.publishDeal')} onPress={() => saveWithStatus('active')} style={styles.action} />
      </View>
    ) : (
      <Button
        label={t('mortgage.saveAsDraft')}
        onPress={() => saveWithStatus('draft')}
        style={styles.singleAction}
      />
    )
  ) : (
    <Button
      label={t('edit.save')}
      onPress={() => saveWithStatus(initialDeal.status)}
      style={styles.singleAction}
    />
  );

  if (initialDeal.status === 'draft') {
    const steps = [
      { label: t('mortgage.coreDetails'), content: coreDetailsSection },
      { label: t('mortgage.rateAndTerm'), content: rateAndTermSection },
      { label: t('mortgage.payments'), content: paymentsSection },
    ];
    const lastStep = activeStep === steps.length - 1;

    return (
      <View>
        <View style={styles.stepper}>
          {steps.map((step, index) => (
            <View key={step.label} style={[styles.stepPill, index === activeStep && styles.stepPillActive]}>
              <AppText variant="labelSm" tone={index === activeStep ? 'inverse' : 'muted'}>
                {index + 1}. {step.label}
              </AppText>
            </View>
          ))}
        </View>

        {steps[activeStep].content}

        {initialDeal.status === 'draft' && !canPublish && lastStep ? (
          <AppText variant="bodySm" tone="muted" style={styles.blockedHelp}>{t('mortgage.draftOnlyUntilCompleted')}</AppText>
        ) : null}

        <View style={styles.wizardActions}>
          {activeStep > 0 ? (
            <Button label={t('results.previous')} onPress={() => setActiveStep(step => Math.max(step - 1, 0))} variant="secondary" style={styles.action} />
          ) : null}
          {lastStep ? saveActions : (
            <Button label={t('results.next')} onPress={() => setActiveStep(step => Math.min(step + 1, steps.length - 1))} style={styles.action} />
          )}
        </View>

        {onDeleteDraft && (
          <Button label={t('mortgage.deleteDraft')} onPress={onDeleteDraft} variant="ghost" style={styles.deleteAction} />
        )}
      </View>
    );
  }

  return (
    <View>
      {coreDetailsSection}
      {completionSection}
      {rateAndTermSection}
      {paymentsSection}
      {saveActions}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  stepPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  stepPillActive: {
    borderColor: colours.primary,
    backgroundColor: colours.primary,
  },
  blockedHelp: {
    marginTop: spacing.md,
  },
  wizardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
  },
  action: { flex: 1 },
  singleAction: { marginTop: spacing.lg },
  deleteAction: { marginTop: spacing.xs },
  noteInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  calculatedPayment: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceRaised,
    padding: spacing.md,
  },
  calculatedPaymentHelp: {
    marginTop: spacing.xs,
  },
  termSummary: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
