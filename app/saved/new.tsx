import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { LoanCalculatorFormValues } from '@/hooks/useLoanCalculatorForm';
import { savedLoansStorage } from '@/storage/savedLoans';
import { SavedLoan } from '@/types/SavedLoan';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { CurrencyCode } from '@/currency/currencies';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { LoanPurposePicker } from '@/components/loans/LoanPurposePicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  AppTextInput,
  FieldLabel,
  FormSection,
  InputSurface,
  SegmentedControl,
} from '@/components/ui/FormPrimitives';
import { HeaderCloseAction } from '@/components/ui/HeaderCloseAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SaveIcon } from '@/components/ui/Icons/SaveIcon/SaveIcon';
import { createLocalId } from '@/utils/id';
import { colours, layout, spacing } from '@/theme';
import { useStoreReview } from '@/review';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recentCalculationsStorage } from '@/storage/recentCalculations';
import { getResultForFormValues } from '@/results/loanResultRoute';
import {
  buildInitialDeal,
  buildResultSnapshot,
  normaliseFormSnapshot,
} from '@/loans/loanGroupFactory';
import { DEFAULT_LOAN_PURPOSE } from '@/loans/loanPurpose';
import { getDraftResultSession } from '@/results/draftResultStore';

type LoanResult = ReturnType<typeof getLoanCalculations>;
type LoanCategory = 'mortgage' | 'loan';

const parseJson = <T,>(value?: string): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const getResultTermInMonths = (
  result: LoanResult,
  formValues: Pick<LoanCalculatorFormValues, 'termInYears' | 'termInMonths'>,
) => {
  const formYears = Number(formValues.termInYears) || 0;
  const formMonths = Number(formValues.termInMonths) || 0;

  return (
    result.tableItems.length
    || (result.termInYears * 12) + result.termInMonths
    || (formYears * 12) + formMonths
    || 12
  );
};

export default function SaveNewLoanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    draftId?: string;
    recentId?: string;
    result?: string;
    formValues?: string;
    currency?: string;
    returnToResult?: string;
  }>();
  const { add } = useSavedLoans();
  const { recordUsefulAction, requestReview } = useStoreReview();
  const draftSession = getDraftResultSession<LoanCalculatorFormValues>(params.draftId);
  const recentCalculation = params.recentId ? recentCalculationsStorage.getById(params.recentId) : undefined;
  const formValues = draftSession?.formValues ?? recentCalculation?.formValues ?? parseJson<LoanCalculatorFormValues>(params.formValues);
  const result = draftSession?.result ?? (recentCalculation ? getResultForFormValues(recentCalculation.formValues) : undefined) ?? parseJson<LoanResult>(params.result);

  const mortgageTermInMonths = result && formValues
    ? getResultTermInMonths(result, formValues)
    : 12;
  const [nickname, setNickname] = useState('');
  const [lender, setLender] = useState('');
  const [category, setCategory] = useState<LoanCategory>(recentCalculation?.category ?? 'loan');
  const [loanPurpose, setLoanPurpose] = useState(DEFAULT_LOAN_PURPOSE);
  const [currency, setCurrency] = useState<CurrencyCode>((params.currency as CurrencyCode) ?? recentCalculation?.currency ?? 'GBP');

  const isMortgage = category === 'mortgage';
  const screenTitle = isMortgage ? t('save.titleMortgage') : t('save.titleLoan');
  const screenSubtitle = isMortgage ? t('save.subtitleMortgage') : t('save.subtitleLoan');

  const handleSave = () => {
    if (!result || !formValues) return;
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
    // The current deal is captured later from the saved-loan detail screen, not at save time.
    const initialDeal = buildInitialDeal(createLocalId(), {
      category,
      lender: lender || undefined,
      createdAt: now,
      updatedAt: now,
      mortgageTermInMonths,
      formSnapshot,
      resultSnapshot,
    }, {
      name: category === 'loan' ? t('mortgage.defaultFixedLoan') : t('mortgage.savedMortgageEstimate'),
      source: isMortgage ? 'estimate' : undefined,
    });
    const loan: SavedLoan = {
      id: createLocalId(),
      createdAt: now,
      updatedAt: now,
      nickname: nickname.trim(),
      lender: lender || undefined,
      category,
      loanPurpose: category === 'loan' ? loanPurpose : undefined,
      currency,
      mortgageTermInMonths,
      status: 'tracked',
      pinnedToDashboard: true,
      dashboardOrder: savedLoansStorage.getMaxDashboardOrder() + 1,
      deals: [initialDeal],
      events: [],
      formSnapshot,
      resultSnapshot,
    };

    add(loan);
    recordUsefulAction()
      .then(() => requestReview())
      .catch(() => undefined);

    router.replace({
      pathname: '/saved/[id]' as never,
      params: { id: loan.id, fromSave: '1' },
    });
  };

  if (!result || !formValues) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('save.title')}
          variant="editor"
          leftAction={<HeaderCloseAction onPress={() => router.back()} />}
        />
        <View style={styles.emptyState}>
          <AppText variant="bodyLg" style={styles.emptyStateText}>
            {t('results.notFound')}
          </AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={screenTitle}
        subtitle={screenSubtitle}
        variant="editor"
        leftAction={<HeaderCloseAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <FormSection title={screenTitle} accent>
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
                { label: t('save.loan'), value: 'loan' },
                { label: t('save.mortgage'), value: 'mortgage' },
              ]}
            />
          </View>

          {category === 'loan' ? (
            <View style={styles.fieldGroup}>
              <FieldLabel>{t('save.loanPurpose')}</FieldLabel>
              <LoanPurposePicker value={loanPurpose} onChange={setLoanPurpose} />
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('save.lender')}</FieldLabel>
            <LenderTextInput value={lender} onChange={setLender} />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>{t('save.currency')}</FieldLabel>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </View>

          <AppText variant="bodySm" tone="muted">
            {isMortgage ? t('save.mortgageSnapshotHelp') : t('save.loanSnapshotHelp')}
          </AppText>
        </FormSection>

        <Button
          label={t('save.save')}
          onPress={handleSave}
          disabled={!nickname.trim()}
          leftIcon={<SaveIcon color={colours.white} size={18} />}
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  emptyStateText: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  container: { padding: layout.screenPadding, paddingBottom: 40 },
  fieldGroup: { gap: spacing.xs },
  saveBtn: { marginTop: spacing.lg },
  cancelBtn: { marginTop: spacing.xs },
});
