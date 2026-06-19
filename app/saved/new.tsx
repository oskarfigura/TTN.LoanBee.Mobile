import React, { useMemo, useState } from 'react';
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
import { LoanPurposePicker } from '@/features/tracker/components/editing/LoanPurposePicker';
import { DEFAULT_LOAN_PURPOSE } from '@/shared/domain/loans/loanPurpose';
import type { LoanPurpose } from '@/shared/domain/types/SavedLoan';
import { AppText, ButtonVariant } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import {
  AppTextInput,
  FieldLabel,
  FormSection,
  InputSurface,
} from '@oskarfigura/ui-native';
import { HeaderCloseAction } from '@/shared/ui/components/HeaderCloseAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { createLocalId } from '@/shared/lib/utils/id';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { useStoreReview } from '@/shared/lib/services/review';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import {
  buildEditCalculatorParams,
  getResultForFormValues,
} from '@/shared/domain/results/loanResultRoute';
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
  const category: LoanCategory = formValues?.category ?? recentCalculation?.category ?? 'mortgage';
  const isMortgage = category === 'mortgage';
  const defaultNickname = useMemo(
    () => (isMortgage ? t('track.defaultMortgageName') : t('track.defaultLoanName')),
    [isMortgage, t],
  );
  const [nickname, setNickname] = useState(defaultNickname);
  const [lender, setLender] = useState('');
  const [loanPurpose, setLoanPurpose] = useState<LoanPurpose>(DEFAULT_LOAN_PURPOSE);
  const [currency, setCurrency] = useState<CurrencyCode>((params.currency as CurrencyCode) ?? recentCalculation?.currency ?? 'GBP');
  // Optional details live in the same card, collapsed by default — the title is
  // auto-filled and everything here is optional and changeable later.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const screenTitle = isMortgage ? t('save.trackMortgageTitle') : t('save.trackLoanTitle');
  const screenSubtitle = t('save.trackSubtitle');
  const handleChangeCalculation = () => {
    if (!formValues) return;

    router.push({
      pathname: '/calculate' as never,
      params: buildEditCalculatorParams(
        { ...formValues, category, currency },
        currency,
        {
          draftId: params.draftId,
          result: params.result,
          formValues: params.formValues,
          currency,
          mode: params.recentId ? 'recent' : 'draft',
          recentId: params.recentId,
        },
      ),
    });
  };

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
        <FormSection title={t('save.trackCalculationTitle')} accent>
          <View style={styles.categorySummary}>
            <View style={styles.categoryIcon}>
              <Icon
                icon={isMortgage ? IconName.HomeLineIcon : IconName.CoinsIcon}
                size={21}
                color={colours.primary}
                strokeWidth={1.9}
              />
            </View>
            <View style={styles.categoryCopy}>
              <AppText variant="labelMd">
                {t(isMortgage ? 'save.mortgage' : 'save.loan')}
              </AppText>
              <AppText variant="bodySm" tone="muted">
                {t('save.selectedInCalculation')}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={handleChangeCalculation}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('save.changeCalculation')}
              style={styles.changeCalculation}
            >
              <AppText variant="labelSm" tone="accent">
                {t('save.change')}
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.optionalToggle}
            onPress={() => setDetailsOpen(open => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
            activeOpacity={0.82}
          >
            <View style={styles.optionalToggleCopy}>
              <AppText variant="labelMd">{t('save.optionalDetails')}</AppText>
              <AppText variant="bodySm" tone="muted">{t('save.optionalDetailsHelp')}</AppText>
            </View>
            <View style={styles.optionalToggleChevron}>
              <Icon
                icon={detailsOpen ? IconName.ChevronUpIcon : IconName.ChevronDownIcon}
                size={18}
                color={colours.primary}
                strokeWidth={2}
              />
            </View>
          </TouchableOpacity>

          {detailsOpen ? (
            <View style={styles.optionalFields}>
              <View style={styles.fieldGroup}>
                <FieldLabel>{t('save.nickname')}</FieldLabel>
                <InputSurface>
                  <AppTextInput
                    placeholder={defaultNickname}
                    value={nickname}
                    onChangeText={setNickname}
                  />
                  {nickname.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setNickname('')}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.clear')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.clearButton}
                    >
                      <Icon icon={IconName.XCloseIcon} size={16} color={colours.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                </InputSurface>
              </View>

              {!isMortgage ? (
                <View style={styles.fieldGroup}>
                  <FieldLabel>{t('save.loanPurpose')}</FieldLabel>
                  <LoanPurposePicker value={loanPurpose} onChange={setLoanPurpose} />
                </View>
              ) : null}

              {!isMortgage ? (
                <View style={styles.fieldGroup}>
                  <FieldLabel>{t('save.lender')}</FieldLabel>
                  <LenderTextInput value={lender} onChange={setLender} />
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <FieldLabel>{t('save.currency')}</FieldLabel>
                <CurrencyPicker value={currency} onChange={setCurrency} />
              </View>
            </View>
          ) : null}
        </FormSection>

        {isMortgage ? (
          <View style={styles.mortgageHint}>
            <Icon icon={IconName.InfoCircleIcon} size={16} color={colours.primary} strokeWidth={1.9} />
            <AppText variant="bodySm" tone="muted" style={styles.mortgageHintText}>
              {t('save.mortgageLaterHint')}
            </AppText>
          </View>
        ) : null}

        <Button
          label={t('track.save')}
          onPress={handleSave}
          leftIcon={<Icon icon={IconName.SaveIcon} color={colours.white} size={18} strokeWidth={1.9} />}
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
  categorySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    padding: spacing.sm,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
  },
  categoryCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxxs,
  },
  changeCalculation: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  mortgageHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceMuted,
  },
  mortgageHintText: { flex: 1 },
  divider: {
    height: 1,
    backgroundColor: colours.borderSoft,
    marginVertical: spacing.md,
  },
  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  optionalToggleCopy: { flex: 1, gap: spacing.xxs },
  optionalToggleChevron: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
  },
  optionalFields: { gap: spacing.md, marginTop: spacing.md },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  saveBtn: { marginTop: spacing.lg },
  cancelBtn: { marginTop: spacing.xs },
});
