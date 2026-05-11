import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  AppTextInput,
  FieldLabel,
  FormSection,
  InputSurface,
  SegmentedControl,
} from '@/components/ui/FormPrimitives';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { createLocalId } from '@/utils/id';
import { colours, layout, spacing } from '@/theme';
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
      mortgageTermInMonths: resultSnapshot.totalTermInMonths,
      status: 'tracked',
      pinnedToDashboard: false,
      deals: [],
      events: [],
      formSnapshot,
      resultSnapshot,
    };
    loan.deals = [buildInitialDeal(createLocalId(), loan)];
    if (category === 'mortgage') {
      loan.lender = undefined;
    }

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
        subtitle="Save the current result as a reusable tracked item for your dashboard and mortgage workflows."
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <FormSection title={t('save.title')} accent>
          <View style={styles.fieldGroup}>
            <FieldLabel>{t('save.nickname')}</FieldLabel>
            <InputSurface>
              <AppTextInput
                placeholder={t('save.nicknamePlaceholder')}
                value={nickname}
                onChangeText={setNickname}
              />
            </InputSurface>
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('save.category')}</FieldLabel>
            <SegmentedControl
              value={category}
              onChange={setCategory}
              options={[
                { label: t('save.mortgage'), value: 'mortgage' },
                { label: t('save.loan'), value: 'loan' },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('save.lender')}</FieldLabel>
            <LenderTextInput value={lender} onChange={setLender} />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('save.currency')}</FieldLabel>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </View>

          <AppText variant="bodySm" tone="muted">
            Saving preserves this calculation snapshot and unlocks dashboard pinning plus mortgage-specific timeline management.
          </AppText>
        </FormSection>

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
  container: { padding: layout.screenPadding, paddingBottom: 40 },
  fieldGroup: { gap: spacing.xs },
  saveBtn: { marginTop: spacing.lg },
  cancelBtn: { marginTop: spacing.xs },
});
