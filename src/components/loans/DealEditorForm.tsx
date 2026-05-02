import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
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
import { LoanDeal, MortgageRepaymentType } from '@/types/SavedLoan';
import { colours, layout, spacing } from '@/theme';

interface Props {
  currency: CurrencyCode;
  initialDeal: LoanDeal;
  canPublish: boolean;
  onSave: (deal: LoanDeal) => void;
  onDeleteDraft?: () => void;
}

const termOptions = [
  { label: '2 years', years: 2 },
  { label: '3 years', years: 3 },
  { label: '5 years', years: 5 },
  { label: '10 years', years: 10 },
];

const addYears = (dateString: string, years: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split('T')[0];
};

const numberText = (value: number) => (Number.isFinite(value) ? String(value) : '0');

export const DealEditorForm = ({
  currency,
  initialDeal,
  canPublish,
  onSave,
  onDeleteDraft,
}: Props) => {
  const { t } = useTranslation();
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const [name, setName] = useState(initialDeal.name);
  const [lender, setLender] = useState(initialDeal.lender ?? '');
  const [startDate, setStartDate] = useState(initialDeal.startDate);
  const [endDate, setEndDate] = useState(initialDeal.endDate);
  const [openingBalance, setOpeningBalance] = useState(numberText(initialDeal.openingBalance));
  const [interestRate, setInterestRate] = useState(numberText(initialDeal.interestRate));
  const [repaymentType, setRepaymentType] = useState<MortgageRepaymentType>(initialDeal.repaymentType);
  const [monthlyPayment, setMonthlyPayment] = useState(numberText(initialDeal.monthlyPayment));
  const [regularOverpayment, setRegularOverpayment] = useState(numberText(initialDeal.regularOverpayment));
  const [remainingTermInYears, setRemainingTermInYears] = useState(numberText(initialDeal.remainingTermInYears));
  const [remainingTermInMonths, setRemainingTermInMonths] = useState(numberText(initialDeal.remainingTermInMonths));

  const dealFromState = useMemo<LoanDeal>(() => ({
    ...initialDeal,
    name: name.trim() || initialDeal.name,
    lender: lender || undefined,
    startDate,
    endDate,
    openingBalance: Number(openingBalance) || 0,
    interestRate: Number(interestRate) || 0,
    repaymentType,
    monthlyPayment: Number(monthlyPayment) || 0,
    regularOverpayment: Number(regularOverpayment) || 0,
    remainingTermInYears: Number(remainingTermInYears) || 0,
    remainingTermInMonths: Number(remainingTermInMonths) || 0,
    updatedAt: new Date().toISOString(),
  }), [
    endDate,
    initialDeal,
    interestRate,
    lender,
    monthlyPayment,
    name,
    openingBalance,
    regularOverpayment,
    remainingTermInMonths,
    remainingTermInYears,
    repaymentType,
    startDate,
  ]);

  const validate = () => {
    if (!startDate || !endDate || endDate <= startDate) {
      Alert.alert(t('mortgage.invalidDealTitle'), t('mortgage.invalidDealDates'));
      return false;
    }

    if (dealFromState.openingBalance <= 0 || dealFromState.interestRate <= 0 || dealFromState.monthlyPayment <= 0) {
      Alert.alert(t('mortgage.invalidDealTitle'), t('mortgage.invalidDealAmounts'));
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

  return (
    <View>
      <FormSection title="Core Details" accent style={styles.section}>
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
            <FieldLabel>{t('mortgage.dealStartDate')}</FieldLabel>
            <InputSurface>
              <AppTextInput value={startDate} onChangeText={setStartDate} placeholder="2026-06-01" />
            </InputSurface>
          </View>
          <View style={styles.half}>
            <FieldLabel>{t('mortgage.dealEndDate')}</FieldLabel>
            <InputSurface>
              <AppTextInput value={endDate} onChangeText={setEndDate} placeholder="2031-06-01" />
            </InputSurface>
          </View>
        </View>
      </FormSection>

      <FormSection title="Rate & Term" style={styles.section}>
        <View style={styles.fieldGroup}>
          <FieldLabel>{t('calculator.interestRate')}</FieldLabel>
          <InputSurface>
            <AppTextInput keyboardType="decimal-pad" value={interestRate} onChangeText={setInterestRate} placeholder="4.29" />
            <InputAffix trailing>%</InputAffix>
          </InputSurface>
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>Preset term</FieldLabel>
          <PillSelector
            value={name}
            onChange={nextName => {
              const option = termOptions.find(item => `${item.years}-year Fixed` === nextName);
              if (!option) return;
              setEndDate(addYears(startDate, option.years));
              setName(nextName);
            }}
            options={termOptions.map(option => ({
              label: option.label,
              value: `${option.years}-year Fixed`,
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

      <FormSection title="Payments" accent style={styles.section}>
        <View style={styles.fieldGroup}>
          <FieldLabel>{t('mortgage.openingBankBalance')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput keyboardType="decimal-pad" value={openingBalance} onChangeText={setOpeningBalance} placeholder="238420" />
          </InputSurface>
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('results.monthlyPayment')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput keyboardType="decimal-pad" value={monthlyPayment} onChangeText={setMonthlyPayment} placeholder="1385" />
          </InputSurface>
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('calculator.additionalPayment')}</FieldLabel>
          <InputSurface>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput keyboardType="decimal-pad" value={regularOverpayment} onChangeText={setRegularOverpayment} placeholder="150" />
          </InputSurface>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <FieldLabel>{t('calculator.termYears')}</FieldLabel>
            <InputSurface>
              <AppTextInput keyboardType="number-pad" value={remainingTermInYears} onChangeText={setRemainingTermInYears} placeholder="25" />
            </InputSurface>
          </View>
          <View style={styles.half}>
            <FieldLabel>{t('calculator.termMonths')}</FieldLabel>
            <InputSurface>
              <AppTextInput keyboardType="number-pad" value={remainingTermInMonths} onChangeText={setRemainingTermInMonths} placeholder="0" />
            </InputSurface>
          </View>
        </View>
      </FormSection>

      {initialDeal.status === 'draft' && !canPublish ? (
        <AppText variant="bodySm" tone="muted" style={styles.blockedHelp}>{t('mortgage.draftOnlyUntilCompleted')}</AppText>
      ) : null}

      {initialDeal.status === 'draft' ? (
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
      )}
      {initialDeal.status === 'draft' && onDeleteDraft && (
        <Button label={t('mortgage.deleteDraft')} onPress={onDeleteDraft} variant="ghost" style={styles.deleteAction} />
      )}
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
  blockedHelp: {
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
  },
  action: { flex: 1 },
  singleAction: { marginTop: spacing.lg },
  deleteAction: { marginTop: spacing.xs },
});
