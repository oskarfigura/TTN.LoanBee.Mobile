import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/shared/lib/hooks/useSavedLoans';
import { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { CurrencyPicker } from '@/features/calculator/components/CurrencyPicker';
import { LenderTextInput } from '@/features/tracker/components/editing/LenderTextInput';
import { AppText, ButtonVariant } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import {
  AppTextInput,
  FieldLabel,
  FormSection,
  InputSurface,
  SegmentedControl,
} from '@oskarfigura/ui-native';
import { HeaderCloseAction } from '@/shared/ui/components/HeaderCloseAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { createLocalId } from '@/shared/lib/utils/id';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { useStoreReview } from '@/shared/lib/services/review';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import { getResultForFormValues } from '@/shared/domain/results/loanResultRoute';
import {
  buildInitialDeal,
  buildResultSnapshot,
  normaliseFormSnapshot,
} from '@/shared/domain/loans/loanGroupFactory';
import { getDraftResultSession } from '@/shared/domain/results/draftResultStore';

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
  const [category, setCategory] = useState<LoanCategory>(
    recentCalculation?.category ?? formValues?.category ?? 'mortgage',
  );
  const [currency, setCurrency] = useState<CurrencyCode>((params.currency as CurrencyCode) ?? recentCalculation?.currency ?? 'GBP');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isMortgage = category === 'mortgage';
  const screenTitle = isMortgage ? t('save.trackMortgageTitle') : t('save.trackLoanTitle');
  const screenSubtitle = t('save.trackSubtitle');

  const handleSave = () => {
    if (!result || !formValues) return;

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
    const generatedNickname = nickname.trim() || (
      category === 'mortgage' ? t('track.defaultMortgageName') : t('track.defaultLoanName')
    );
    const loan: SavedLoan = {
      id: createLocalId(),
      createdAt: now,
      updatedAt: now,
      nickname: generatedNickname,
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
        <FormSection title={t('save.trackCalculationTitle')} accent>
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

          <AppText variant="bodySm" tone="muted">
            {t('save.trackCalculationHelp')}
          </AppText>
        </FormSection>

        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={() => setDetailsOpen(open => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          activeOpacity={0.82}
        >
          <View style={styles.detailsCopy}>
            <AppText variant="labelMd">{t('save.optionalDetails')}</AppText>
            <AppText variant="bodySm" tone="muted">{t('save.optionalDetailsHelp')}</AppText>
          </View>
          <AppText variant="title3" tone="accent">{detailsOpen ? '−' : '+'}</AppText>
        </TouchableOpacity>

        {detailsOpen ? (
          <FormSection>
            <View style={styles.fieldGroup}>
              <FieldLabel>{t('save.nickname')}</FieldLabel>
              <InputSurface>
                <AppTextInput
                  placeholder={isMortgage ? t('track.defaultMortgageName') : t('track.defaultLoanName')}
                  value={nickname}
                  onChangeText={setNickname}
                />
              </InputSurface>
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel>{t('save.lender')}</FieldLabel>
              <LenderTextInput value={lender} onChange={setLender} />
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel>{t('save.currency')}</FieldLabel>
              <CurrencyPicker value={currency} onChange={setCurrency} />
            </View>
          </FormSection>
        ) : null}

        <Button
          label={t('track.save')}
          onPress={handleSave}
          leftIcon={<Icon icon={IconName.ArrowTrendingDownIcon} color={colours.white} size={18} />}
          style={styles.saveBtn}
        />
        <Button
          label={t('save.cancel')}
          onPress={() => router.back()}
          variant={ButtonVariant.Ghost}
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
  detailsToggle: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: layout.cardPadding,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceMuted,
  },
  detailsCopy: { flex: 1, gap: spacing.xxs },
  saveBtn: { marginTop: spacing.lg },
  cancelBtn: { marginTop: spacing.xs },
});
