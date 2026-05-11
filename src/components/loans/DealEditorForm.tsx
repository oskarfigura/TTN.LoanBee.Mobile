import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { FormStepper, FormStepperSection } from '@/components/ui/FormStepper';
import {
  AppTextInput,
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
import { calculateDealMonthlyPayment } from '@/mortgage/tracker';
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
}: Props) => {
  const { t } = useTranslation();
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const initialAdditionalBorrowing = initialDeal.additionalBorrowing ?? 0;
  const projectedPreviousBalance = isInitialDeal
    ? 0
    : Math.max(0, initialDeal.openingBalance - initialAdditionalBorrowing);
  const initialTermSplit = splitMonths(Math.max(1, Math.round(mortgageTermInMonths)));
  const initialDealDurationSplit = splitMonths(monthsBetweenDates(fixedStartDate ?? initialDeal.startDate, initialDeal.endDate));

  const [name, setName] = useState(initialDeal.name);
  const [lender, setLender] = useState(initialDeal.lender ?? '');
  const [startDate, setStartDate] = useState(initialDeal.startDate);
  const [endDate, setEndDate] = useState(initialDeal.endDate);
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
  const dealDurationInMonths = Math.max(
    1,
    (Math.max(0, Number(dealDurationYears) || 0) * 12) + Math.max(0, Number(dealDurationMonths) || 0),
  );

  // Keep endDate in sync when duration inputs change
  useEffect(() => {
    const next = addMonthsIso(effectiveStartDate, dealDurationInMonths);
    if (next !== endDate) setEndDate(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealDurationInMonths, effectiveStartDate]);

  const additionalBorrowingValue = Math.max(0, Number(additionalBorrowing) || 0);
  const derivedOpeningBalance = isInitialDeal
    ? Math.max(0, Number(openingBalance) || 0)
    : Math.max(0, projectedPreviousBalance + additionalBorrowingValue);
  const effectiveTotalMortgageTermInMonths = canEditMortgageTerm
    ? Math.max(1, (Math.max(0, Number(totalTermYears) || 0) * 12) + Math.max(0, Number(totalTermMonths) || 0))
    : mortgageTermInMonths;
  const remainingTermInMonths = Math.max(
    effectiveTotalMortgageTermInMonths - monthsBetweenDates(mortgageStartDate, effectiveStartDate),
    1,
  );
  const remainingTerm = splitMonths(remainingTermInMonths);
  const calculatedMonthlyPayment = calculateDealMonthlyPayment(
    derivedOpeningBalance,
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
    openingBalance: derivedOpeningBalance,
    interestRate: Number(interestRate) || 0,
    repaymentType,
    monthlyPayment: calculatedMonthlyPayment,
    regularOverpayment: Number(regularOverpayment) || 0,
    additionalBorrowing: isInitialDeal ? undefined : additionalBorrowingValue,
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
    additionalBorrowingValue,
    closingBalance,
    completedAt,
    completionNotes,
    derivedOpeningBalance,
    endDate,
    effectiveStartDate,
    feesAdded,
    initialDeal,
    interestRate,
    isInitialDeal,
    lender,
    name,
    calculatedMonthlyPayment,
    regularOverpayment,
    remainingTerm.months,
    remainingTerm.years,
    repaymentType,
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
    if (status === 'active' && !canPublish) {
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
            onChangeText={setName}
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
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              keyboardType="decimal-pad"
              value={additionalBorrowing}
              onChangeText={setAdditionalBorrowing}
              placeholder="0"
            />
          </InputSurface>
          <FieldHint>{t('mortgage.additionalBorrowingHint')}</FieldHint>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.openingBankBalance')}</FieldLabel>
        {isInitialDeal ? (
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              keyboardType="decimal-pad"
              value={openingBalance}
              onChangeText={setOpeningBalance}
              placeholder="238420"
            />
          </InputSurface>
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
        <InputSurface>
          <AppTextInput
            keyboardType="decimal-pad"
            value={interestRate}
            onChangeText={setInterestRate}
            placeholder="4.29"
          />
          <InputAffix trailing>%</InputAffix>
        </InputSurface>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.dealDuration')}</FieldLabel>
        <View style={styles.row}>
          <View style={styles.half}>
            <InputSurface>
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
            <InputSurface>
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
              <InputSurface>
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
              <InputSurface>
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
        <InputSurface>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            keyboardType="decimal-pad"
            value={regularOverpayment}
            onChangeText={setRegularOverpayment}
            placeholder="150"
          />
        </InputSurface>
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
        <InputSurface>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            keyboardType="decimal-pad"
            value={closingBalance}
            onChangeText={setClosingBalance}
            placeholder="210000"
          />
        </InputSurface>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel>{t('mortgage.feesAdded')}</FieldLabel>
        <InputSurface>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            keyboardType="decimal-pad"
            value={feesAdded}
            onChangeText={setFeesAdded}
            placeholder="0"
          />
        </InputSurface>
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
          />
        ) : null}
        <Button label={primaryLabel} onPress={handlePrimary} style={styles.action} />
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
