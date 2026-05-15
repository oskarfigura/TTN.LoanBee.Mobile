import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  AppTextInput,
  FieldError,
  FieldLabel,
  FieldHint,
  FormSection,
  InputAffix,
  InputSurface,
  SegmentedControl,
} from '@/components/ui/FormPrimitives';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { createLocalId } from '@/utils/id';
import { colours, layout, radii, spacing } from '@/theme';
import { useStoreReview } from '@/review';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildInitialDeal,
  buildResultSnapshot,
  normaliseFormSnapshot,
} from '@/loans/loanGroupFactory';
import { calculateDealMonthlyPayment, generateDefaultDealName } from '@/mortgage/tracker';
import { MortgageRepaymentType } from '@/types/SavedLoan';
import { getDraftResultSession } from '@/results/draftResultStore';

type LoanResult = ReturnType<typeof getLoanCalculations>;

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

const splitMonths = (totalMonths: number) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});

const getDefaultDealDuration = (totalMonths: number) => splitMonths(Math.min(Math.max(totalMonths, 1), 60));

const getDealDurationErrorKey = (durationInMonths: number, mortgageTermInMonths: number) => {
  if (durationInMonths <= 0 || durationInMonths > mortgageTermInMonths) {
    return 'save.invalidCurrentDealDuration';
  }

  return undefined;
};

export default function SaveNewLoanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    draftId?: string;
    result?: string;
    formValues?: string;
    currency?: string;
    returnToResult?: string;
  }>();
  const { add } = useSavedLoans();
  const { recordUsefulAction, requestReview } = useStoreReview();
  const draftSession = getDraftResultSession<LoanCalculatorFormValues>(params.draftId);
  const result = draftSession?.result ?? parseJson<LoanResult>(params.result);
  const formValues = draftSession?.formValues ?? parseJson<LoanCalculatorFormValues>(params.formValues);

  if (!result || !formValues) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('save.title')}
          variant="editor"
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
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

  const mortgageTermInMonths = getResultTermInMonths(result, formValues);
  const defaultDealDuration = getDefaultDealDuration(mortgageTermInMonths);
  const [nickname, setNickname] = useState('');
  const [lender, setLender] = useState('');
  const [category, setCategory] = useState<'mortgage' | 'loan'>('mortgage');
  const [currency, setCurrency] = useState<CurrencyCode>((params.currency as CurrencyCode) ?? 'GBP');
  const [currentDealEnabled, setCurrentDealEnabled] = useState(false);
  const [currentDealName, setCurrentDealName] = useState('');
  const [currentDealYears, setCurrentDealYears] = useState(String(defaultDealDuration.years));
  const [currentDealMonths, setCurrentDealMonths] = useState(String(defaultDealDuration.months));
  const [repaymentType, setRepaymentType] = useState<MortgageRepaymentType>('repayment');

  const currentDealDurationInMonths = (Number(currentDealYears) || 0) * 12 + (Number(currentDealMonths) || 0);
  const currentDealDurationErrorKey = category === 'mortgage' && currentDealEnabled
    ? getDealDurationErrorKey(currentDealDurationInMonths, mortgageTermInMonths)
    : undefined;

  const handleSave = () => {
    if (!nickname.trim()) return;
    if (currentDealDurationErrorKey) return;

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
    const hasUserDeal = category === 'mortgage' && currentDealEnabled;
    const initialDealName = currentDealName.trim() || generateDefaultDealName(
      Math.floor(currentDealDurationInMonths / 12),
      currentDealDurationInMonths % 12,
      repaymentType,
    );
    const initialDeal = buildInitialDeal(createLocalId(), {
      category,
      lender: lender || undefined,
      createdAt: now,
      updatedAt: now,
      mortgageTermInMonths,
      formSnapshot,
      resultSnapshot,
    }, hasUserDeal ? {
      name: initialDealName,
      durationInMonths: currentDealDurationInMonths,
      source: 'userDeal',
    } : {
      source: category === 'mortgage' ? 'estimate' : undefined,
    });
    if (hasUserDeal) {
      initialDeal.repaymentType = repaymentType;
      initialDeal.monthlyPayment = calculateDealMonthlyPayment(
        initialDeal.openingBalance,
        initialDeal.interestRate,
        mortgageTermInMonths,
        repaymentType,
      );
    }
    const loan: SavedLoan = {
      id: createLocalId(),
      createdAt: now,
      updatedAt: now,
      nickname: nickname.trim(),
      lender: lender || undefined,
      category,
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('save.title')}
        subtitle={t('save.subtitle')}
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
            {category === 'mortgage' ? t('save.mortgageSnapshotHelp') : t('save.loanSnapshotHelp')}
          </AppText>

          {category === 'mortgage' ? (
            <View style={styles.optionalDeal}>
              <TouchableOpacity
                style={styles.optionalDealToggle}
                onPress={() => setCurrentDealEnabled(value => !value)}
                activeOpacity={0.84}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: currentDealEnabled }}
              >
                <View style={[styles.toggleBox, currentDealEnabled && styles.toggleBoxActive]}>
                  {currentDealEnabled ? <View style={styles.toggleDot} /> : null}
                </View>
                <View style={styles.optionalDealCopy}>
                  <AppText variant="title3">{t('save.currentDealKnown')}</AppText>
                  <AppText variant="bodySm" tone="muted">
                    {t('save.currentDealKnownHelp')}
                  </AppText>
                </View>
              </TouchableOpacity>

              {currentDealEnabled ? (
                <View style={styles.optionalDealFields}>
                  <View style={styles.fieldGroup}>
                    <FieldLabel>{t('save.currentDealName')}</FieldLabel>
                    <InputSurface>
                      <AppTextInput
                        placeholder={t('save.currentDealNamePlaceholder')}
                        value={currentDealName}
                        onChangeText={setCurrentDealName}
                      />
                    </InputSurface>
                    <FieldHint>{t('save.currentDealNameHelp')}</FieldHint>
                  </View>

                  <View style={styles.fieldGroup}>
                    <FieldLabel>{t('save.currentDealLength')}</FieldLabel>
                    <View style={styles.termRow}>
                      <View style={styles.termField}>
                        <InputSurface>
                          <AppTextInput
                            keyboardType="number-pad"
                            value={currentDealYears}
                            onChangeText={setCurrentDealYears}
                            placeholder="5"
                          />
                          <InputAffix trailing>{t('mortgage.totalMortgageTermYears')}</InputAffix>
                        </InputSurface>
                      </View>
                      <View style={styles.termField}>
                        <InputSurface>
                          <AppTextInput
                            keyboardType="number-pad"
                            value={currentDealMonths}
                            onChangeText={setCurrentDealMonths}
                            placeholder="0"
                          />
                          <InputAffix trailing>{t('mortgage.totalMortgageTermMonths')}</InputAffix>
                        </InputSurface>
                      </View>
                    </View>
                    <FieldError message={currentDealDurationErrorKey ? t(currentDealDurationErrorKey) : undefined} />
                    <FieldHint>{t('save.currentDealLengthHelp')}</FieldHint>
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
                </View>
              ) : null}
            </View>
          ) : null}
        </FormSection>

        <Button
          label={t('save.save')}
          onPress={handleSave}
          disabled={!nickname.trim() || Boolean(currentDealDurationErrorKey)}
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
  optionalDeal: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  optionalDealToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  optionalDealCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  toggleBox: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  toggleBoxActive: {
    borderColor: colours.teal,
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
    backgroundColor: colours.teal,
  },
  optionalDealFields: {
    gap: spacing.md,
  },
  termRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  termField: {
    flex: 1,
  },
  saveBtn: { marginTop: spacing.lg },
  cancelBtn: { marginTop: spacing.xs },
});
