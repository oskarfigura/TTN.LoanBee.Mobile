import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { SavedLoan } from '@/types/SavedLoan';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { CurrencyCode } from '@/currency/currencies';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { Button } from '@/components/ui/Button';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { createLocalId } from '@/utils/id';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { useStoreReview } from '@/review';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildInitialDeal,
  buildResultSnapshot,
  normaliseFormSnapshot,
} from '@/loans/loanGroupFactory';

type LoanResult = ReturnType<typeof getLoanCalculations>;

export default function SaveNewLoanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ result: string; formValues: string; currency: string; returnToResult?: string }>();
  const { add } = useSavedLoans();
  const { recordUsefulAction, requestReview } = useStoreReview();

  const result = JSON.parse(params.result) as LoanResult;
  const formValues = JSON.parse(params.formValues);
  const [nickname, setNickname] = useState('');
  const [lender, setLender] = useState('');
  const [category, setCategory] = useState<'mortgage' | 'loan'>('mortgage');
  const [currency, setCurrency] = useState<CurrencyCode>((params.currency as CurrencyCode) ?? 'GBP');

  const handleSave = () => {
    if (!nickname.trim()) return;

    const baseline = getLoanCalculations(
      formValues.loanAmount,
      formValues.interest,
      formValues.termInYears ?? 0,
      formValues.termInMonths ?? 0,
      formValues.desiredMonthlyPayment ?? 0,
      formValues.calculationType as LoanCalculationType,
      formValues.downPayment,
      formValues.downPaymentType as DownPaymentType,
      0,
      formValues.startDate,
    );

    const now = new Date().toISOString();
    const formSnapshot = normaliseFormSnapshot(formValues, currency);
    const resultSnapshot = buildResultSnapshot(result, baseline.totalInterestPaid);
    const loan: SavedLoan = {
      id: createLocalId(),
      createdAt: now,
      updatedAt: now,
      nickname: nickname.trim(),
      lender: lender || undefined,
      category,
      currency,
      status: 'tracked',
      pinnedToDashboard: false,
      deals: [],
      events: [],
      formSnapshot,
      resultSnapshot,
    };
    loan.deals = [buildInitialDeal(createLocalId(), loan)];

    add(loan);
    recordUsefulAction()
      .then(() => requestReview())
      .catch(() => undefined);

    router.replace({
      pathname: '/saved/[id]' as never,
      params: { id: loan.id, fromSave: '1' },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('save.title')}
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>{t('save.nickname')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('save.nicknamePlaceholder')}
          placeholderTextColor={colours.textSecondary}
          value={nickname}
          onChangeText={setNickname}
        />

        <Text style={styles.label}>{t('save.category')}</Text>
        <View style={styles.toggleRow}>
          {(['mortgage', 'loan'] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.toggleBtn, category === cat && styles.toggleBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.toggleText, category === cat && styles.toggleTextActive]}>
                {cat === 'mortgage' ? t('save.mortgage') : t('save.loan')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('save.lender')}</Text>
        <LenderTextInput value={lender} onChange={setLender} />

        <Text style={styles.label}>{t('save.currency')}</Text>
        <CurrencyPicker value={currency} onChange={setCurrency} />

        <Button
          label={t('save.save')}
          onPress={handleSave}
          disabled={!nickname.trim()}
          style={styles.saveBtn}
        />
        <Button
          label={t('save.cancel')}
          onPress={() => router.back()}
          variant="ghost"
          style={styles.cancelBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 16, paddingBottom: 40 },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    height: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    height: 44,
  },
  toggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colours.primary },
  toggleText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  toggleTextActive: { color: colours.white },
  saveBtn: { marginTop: 24 },
  cancelBtn: { marginTop: 8 },
});
