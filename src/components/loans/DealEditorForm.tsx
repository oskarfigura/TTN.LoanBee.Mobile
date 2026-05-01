import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { LoanDeal, MortgageRepaymentType } from '@/types/SavedLoan';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

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
      <Text style={styles.helper}>{t('mortgage.bankBalanceTruth')}</Text>

      <Text style={styles.label}>{t('mortgage.dealName')}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t('mortgage.dealNamePlaceholder')}
        placeholderTextColor={colours.textSecondary}
      />

      <Text style={styles.label}>{t('save.lender')}</Text>
      <LenderTextInput value={lender} onChange={setLender} />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>{t('mortgage.dealStartDate')}</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-06-01" placeholderTextColor={colours.textSecondary} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>{t('mortgage.dealEndDate')}</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2031-06-01" placeholderTextColor={colours.textSecondary} />
        </View>
      </View>

      <View style={styles.termRow}>
        {termOptions.map(option => (
          <TouchableOpacity
            key={option.years}
            style={styles.termChip}
            onPress={() => {
              setEndDate(addYears(startDate, option.years));
              setName(`${option.years}-year Fixed`);
            }}
          >
            <Text style={styles.termChipText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('mortgage.openingBankBalance')}</Text>
      <View style={styles.inputShell}>
        <Text style={styles.affix}>{currencySymbol}</Text>
        <TextInput style={styles.inputField} keyboardType="decimal-pad" value={openingBalance} onChangeText={setOpeningBalance} placeholder="238420" placeholderTextColor={colours.textSecondary} />
      </View>

      <Text style={styles.label}>{t('calculator.interestRate')}</Text>
      <View style={styles.inputShell}>
        <TextInput style={styles.inputField} keyboardType="decimal-pad" value={interestRate} onChangeText={setInterestRate} placeholder="4.29" placeholderTextColor={colours.textSecondary} />
        <Text style={styles.affix}>%</Text>
      </View>

      <Text style={styles.label}>{t('mortgage.repaymentType')}</Text>
      <View style={styles.segmented}>
        {(['repayment', 'interestOnly'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.segment, repaymentType === type && styles.segmentActive]}
            onPress={() => setRepaymentType(type)}
          >
            <Text style={[styles.segmentText, repaymentType === type && styles.segmentTextActive]}>
              {type === 'repayment' ? t('mortgage.repayment') : t('mortgage.interestOnly')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('results.monthlyPayment')}</Text>
      <View style={styles.inputShell}>
        <Text style={styles.affix}>{currencySymbol}</Text>
        <TextInput style={styles.inputField} keyboardType="decimal-pad" value={monthlyPayment} onChangeText={setMonthlyPayment} placeholder="1385" placeholderTextColor={colours.textSecondary} />
      </View>

      <Text style={styles.label}>{t('calculator.additionalPayment')}</Text>
      <View style={styles.inputShell}>
        <Text style={styles.affix}>{currencySymbol}</Text>
        <TextInput style={styles.inputField} keyboardType="decimal-pad" value={regularOverpayment} onChangeText={setRegularOverpayment} placeholder="150" placeholderTextColor={colours.textSecondary} />
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>{t('calculator.termYears')}</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={remainingTermInYears} onChangeText={setRemainingTermInYears} placeholder="25" placeholderTextColor={colours.textSecondary} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>{t('calculator.termMonths')}</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={remainingTermInMonths} onChangeText={setRemainingTermInMonths} placeholder="0" placeholderTextColor={colours.textSecondary} />
        </View>
      </View>

      {initialDeal.status === 'draft' && !canPublish && (
        <Text style={styles.blockedHelp}>{t('mortgage.draftOnlyUntilCompleted')}</Text>
      )}

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
  helper: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    minHeight: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  termRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  termChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  termChipText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
    paddingVertical: 10,
  },
  affix: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 46,
    backgroundColor: colours.surface,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colours.primary },
  segmentText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  segmentTextActive: { color: colours.white },
  blockedHelp: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  action: { flex: 1 },
  singleAction: { marginTop: 24 },
  deleteAction: { marginTop: 8 },
});
