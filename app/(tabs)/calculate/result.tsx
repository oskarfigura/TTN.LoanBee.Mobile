import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoanCalculationView } from '@/features/calculator/components/LoanCalculationView';
import { AppText } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { HeaderIconButton } from '@oskarfigura/ui-native';
import { BannerAd } from '@/ads/BannerAd';
import { colours } from '@/shared/ui/theme';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';
import {
  LoanResult,
  getResultForSavedLoan,
  getResultForFormValues,
  getBaselineResultForSavedLoan,
  getBaselineResultForFormValues,
  buildEditCalculatorParams,
} from '@/shared/domain/results/loanResultRoute';
import { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';
import { getDraftResultSession } from '@/shared/domain/results/draftResultStore';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import { useStoreReview } from '@/shared/lib/services/review';
import { shareCalculation } from '@/features/sharing/shareCalculation';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { LoanSummaryPanel } from '@/features/calculator/components/LoanSummaryPanel';
import { ScenarioComparison } from '@/features/calculator/components/ScenarioComparison';
import { buildDraftLoanPreview, RawFormValues } from '@/shared/domain/loans/loanGroupFactory';
import { createLoanOverpaymentScope } from '@/shared/domain/loans/overpaymentScope';
import { OverpaymentsView } from '@/features/tracker/components/overpayments/OverpaymentsView';

type ResultParams = {
  draftId?: string;
  result?: string;
  formValues?: string;
  currency?: string;
  mode?: string;
  recentId?: string;
  savedLoan?: string;
  savedLoanId?: string;
  returnTo?: string;
};

const parseJson = <T,>(value?: string): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export default function ResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<ResultParams>();
  const allowBackRef = useRef(false);
  const recordedReviewActionRef = useRef(false);
  const { recordUsefulAction, requestReview } = useStoreReview();

  const savedLoan = useMemo(() => {
    const fromParams = parseJson<SavedLoan>(params.savedLoan);
    if (fromParams) return fromParams;
    return params.savedLoanId ? savedLoansStorage.getById(params.savedLoanId) ?? null : null;
  }, [params.savedLoan, params.savedLoanId]);
  const recentCalculation = useMemo(() => (
    params.recentId ? recentCalculationsStorage.getById(params.recentId) ?? null : null
  ), [params.recentId]);
  const isSavedMode = params.mode === 'saved' && savedLoan !== null;
  const draftSession = useMemo(() => getDraftResultSession(params.draftId), [params.draftId]);

  const result = useMemo(() => {
    if (savedLoan) return getResultForSavedLoan(savedLoan);
    if (draftSession) return draftSession.result;
    if (recentCalculation) return getResultForFormValues(recentCalculation.formValues);
    return parseJson<LoanResult>(params.result);
  }, [draftSession, params.result, recentCalculation, savedLoan]);
  const formValues = useMemo(() => (
    savedLoan?.formSnapshot
    ?? draftSession?.formValues
    ?? recentCalculation?.formValues
    ?? parseJson<Record<string, unknown>>(params.formValues)
  ), [draftSession?.formValues, params.formValues, recentCalculation?.formValues, savedLoan]);
  const currency = ((savedLoan?.currency ?? draftSession?.currency ?? recentCalculation?.currency ?? params.currency) as CurrencyCode | undefined) ?? 'GBP';
  // Baseline remaining-balance series for the with/without overpayment comparison chart —
  // only when a recurring overpayment exists. Mirrors the `result` source precedence; the
  // raw-param fallback has no inputs to re-run, so the card is simply omitted there.
  const baselineRemainingArray = useMemo(() => {
    if (savedLoan) {
      return (savedLoan.formSnapshot.additionalMonthlyPayment ?? 0) > 0
        ? getBaselineResultForSavedLoan(savedLoan).loanChartRemainingArray
        : undefined;
    }
    const form = (draftSession?.formValues ?? recentCalculation?.formValues) as
      LoanCalculatorFormValues | undefined;
    if (form) {
      return (form.additionalMonthlyPayment ?? 0) > 0
        ? getBaselineResultForFormValues(form).loanChartRemainingArray
        : undefined;
    }
    return undefined;
  }, [draftSession?.formValues, recentCalculation?.formValues, savedLoan]);
  // Preview an unsaved calculation through the same summary surface the saved-loan
  // detail uses, by building a transient draft loan from the calculation inputs.
  const draftLoan = useMemo(
    () => (!isSavedMode && result && formValues
      ? buildDraftLoanPreview(formValues as unknown as RawFormValues, result, currency)
      : null),
    [currency, formValues, isSavedMode, result],
  );
  const [showComparison, setShowComparison] = useState(false);
  const [showOverpayments, setShowOverpayments] = useState(false);
  const [draftOverpaymentLoan, setDraftOverpaymentLoan] = useState<SavedLoan | null>(null);
  const activeDraftLoan = draftOverpaymentLoan ?? draftLoan;
  const draftOverpaymentScope = useMemo(
    () => (activeDraftLoan ? createLoanOverpaymentScope(activeDraftLoan) : null),
    [activeDraftLoan],
  );
  const createPreviewOverpaymentScope = useCallback(
    (loan: SavedLoan) => createLoanOverpaymentScope(loan),
    [],
  );
  const shareIcon = useMemo(() => <Icon icon={IconName.ShareIcon} color={colours.primary} />, []);

  useEffect(() => {
    setDraftOverpaymentLoan(null);
  }, [params.draftId, params.formValues, params.recentId, params.result]);

  useEffect(() => {
    if (isSavedMode || !result || recordedReviewActionRef.current) return;

    recordedReviewActionRef.current = true;
    recordUsefulAction()
      .then(() => requestReview())
      .catch(() => undefined);
  }, [isSavedMode, recordUsefulAction, requestReview, result]);

  const openTrack = useCallback(() => {
    if (!result || !formValues) return;

    router.push({
      pathname: '/saved/new',
      params: {
        result: params.result ?? JSON.stringify(result),
        formValues: params.formValues ?? JSON.stringify(formValues),
        draftId: params.draftId,
        recentId: params.recentId,
        currency,
      },
    });
  }, [currency, formValues, params.draftId, params.formValues, params.recentId, params.result, result, router]);

  const handleShare = useCallback(async () => {
    if (!result || !formValues) return;

    await shareCalculation({
      result,
      formValues,
      currency,
      category: savedLoan?.category ?? recentCalculation?.category,
      t,
    });
  }, [currency, formValues, recentCalculation?.category, result, savedLoan?.category, t]);

  const handleBack = useCallback(() => {
    if (params.returnTo) {
      allowBackRef.current = true;
      router.replace(params.returnTo as never);
      setTimeout(() => {
        allowBackRef.current = false;
      }, 0);
      return;
    }

    router.back();
  }, [params.returnTo, router]);

  useEffect(() => {
    if (!params.returnTo) return undefined;

    return navigation.addListener('beforeRemove', event => {
      if (allowBackRef.current) return;
      event.preventDefault();
      handleBack();
    });
  }, [handleBack, navigation, params.returnTo]);

  const handleEdit = useCallback(() => {
    if (!formValues) return;
    // The result screen rehydrates from a draft session, a recent entry, or a saved
    // loan when any of those ids are present. Only carry the heavy raw result/formValues
    // (the full amortisation table) as a last resort when there is nothing else to
    // rebuild from — otherwise it would be serialised twice into navigation state.
    const canRehydrate = Boolean(
      params.draftId || params.recentId || params.savedLoanId || params.savedLoan,
    );
    router.push({
      pathname: '/calculate' as never,
      params: buildEditCalculatorParams(
        formValues as unknown as LoanCalculatorFormValues,
        currency,
        {
          draftId: params.draftId,
          currency,
          mode: params.mode,
          recentId: params.recentId,
          returnTo: params.returnTo,
          savedLoan: params.savedLoan,
          savedLoanId: params.savedLoanId,
          ...(canRehydrate ? {} : {
            result: params.result,
            formValues: params.formValues,
          }),
        },
      ),
    });
  }, [currency, formValues, params, router]);

  if (!result || !formValues) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.notFound}>
          <AppText variant="bodyLg" style={styles.notFoundText}>{t('results.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={handleBack} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which already clears
    // the device bottom inset. Adding it here pushes a gap between the ad and the bar.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t('results.title')}
        variant="detail"
        leftAction={<HeaderBackAction onPress={handleBack} variant="circle" />}
        rightAction={isSavedMode && savedLoan ? (
          <HeaderIconButton
            onPress={() => router.push(`/saved/${savedLoan.id}/edit`)}
            accessibilityLabel={t('edit.manageShort')}
          >
            <Icon icon={IconName.EditIcon} color={colours.primary} size={18} strokeWidth={1.8} />
          </HeaderIconButton>
        ) : (
          <HeaderIconButton
            onPress={handleEdit}
            accessibilityLabel={t('saved.edit')}
          >
            <Icon icon={IconName.EditIcon} color={colours.primary} size={18} strokeWidth={1.8} />
          </HeaderIconButton>
        )}
        showBottomBorder={false}
        backgroundColor={colours.background}
      />

      <LoanCalculationView
        result={result}
        startDate={String(formValues.startDate)}
        currency={currency}
        savedLoan={savedLoan ?? undefined}
        baselineRemainingArray={baselineRemainingArray}
        onShare={handleShare}
        shareLabel={t('share.short')}
        shareIcon={shareIcon}
        tabStyle="underline"
        showFinancialDisclaimer
        ownsScroll
        summaryContent={!isSavedMode && activeDraftLoan ? (
          <LoanSummaryPanel
            loan={activeDraftLoan}
            result={result}
            mode="draft"
            onCompare={() => setShowComparison(true)}
            onTryOverpayments={() => setShowOverpayments(true)}
            onTrack={openTrack}
            onShare={handleShare}
            overpaymentImpact={draftOverpaymentScope?.bannerImpact ?? undefined}
          />
        ) : undefined}
      />

      {!isSavedMode ? (
        <ScenarioComparison
          visible={showComparison}
          baseline={result}
          formValues={formValues as unknown as LoanCalculatorFormValues}
          currency={currency}
          onClose={() => setShowComparison(false)}
        />
      ) : null}

      {!isSavedMode && activeDraftLoan ? (
        <Modal
          visible={showOverpayments}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowOverpayments(false)}
        >
          <OverpaymentsView
            id={activeDraftLoan.id}
            notFoundTitleKey="overpayments.title"
            createScope={createPreviewOverpaymentScope}
            controlledLoan={activeDraftLoan}
            onLoanChange={setDraftOverpaymentLoan}
            onClose={() => setShowOverpayments(false)}
          />
        </Modal>
      ) : null}

      <BannerAd />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: 16 },
});
