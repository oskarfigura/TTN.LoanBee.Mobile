import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoanCalculationView } from '@/components/calculator/LoanCalculationView';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { BannerAd } from '@/ads/BannerAd';
import { colours } from '@/theme';
import { CurrencyCode } from '@/currency/currencies';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedLoan } from '@/types/SavedLoan';
import {
  LoanResult,
  getResultForSavedLoan,
  getResultForFormValues,
  getBaselineResultForSavedLoan,
  getBaselineResultForFormValues,
  buildEditCalculatorParams,
} from '@/results/loanResultRoute';
import { LoanCalculatorFormValues } from '@/hooks/useLoanCalculatorForm';
import { getDraftResultSession } from '@/results/draftResultStore';
import { savedLoansStorage } from '@/storage/savedLoans';
import { recentCalculationsStorage } from '@/storage/recentCalculations';
import { setResultLeaveGuard } from '@/navigation/resultLeaveGuard';
import { useStoreReview } from '@/review';
import { shareCalculation } from '@/share/shareCalculation';
import { UnsavedResultModal } from '@/components/results/UnsavedResultModal';
import { EditIcon } from '@/components/loans/LoanIcons';
import { LoanSummaryPanel } from '@/components/calculator/LoanSummaryPanel';
import { buildDraftLoanPreview, RawFormValues } from '@/loans/loanGroupFactory';
import { SaveIcon } from '@/components/ui/Icons/SaveIcon/SaveIcon';
import { ShareIcon } from '@/components/ui/Icons/ShareIcon/ShareIcon';

type ResultParams = {
  draftId?: string;
  result?: string;
  formValues?: string;
  currency?: string;
  mode?: string;
  recentId?: string;
  savedLoan?: string;
  savedLoanId?: string;
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
  const allowLeaveRef = useRef(false);
  const pendingLeaveRef = useRef<(() => void) | null>(null);
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
  const isRecentMode = params.mode === 'recent' && recentCalculation !== null;
  const shouldGuardUnsavedResult = !isSavedMode && !isRecentMode;
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
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const shareIcon = useMemo(() => <ShareIcon color={colours.primary} />, []);

  useEffect(() => {
    if (isSavedMode || !result || recordedReviewActionRef.current) return;

    recordedReviewActionRef.current = true;
    recordUsefulAction()
      .then(() => requestReview())
      .catch(() => undefined);
  }, [isSavedMode, recordUsefulAction, requestReview, result]);

  const continueWithoutGuard = useCallback((continueNavigation: () => void) => {
    allowLeaveRef.current = true;
    setResultLeaveGuard(null);
    continueNavigation();
    setTimeout(() => {
      allowLeaveRef.current = false;
    }, 0);
  }, []);

  const openSave = useCallback(() => {
    if (!result || !formValues) return;

    router.push({
      pathname: '/saved/new',
      params: {
        result: params.result ?? JSON.stringify(result),
        formValues: params.formValues ?? JSON.stringify(formValues),
        draftId: params.draftId,
        recentId: params.recentId,
        currency,
        returnToResult: '1',
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
    router.back();
  }, [router]);

  const handleEdit = useCallback(() => {
    if (!formValues) return;
    // Editing means reopening the calculator with these inputs pre-filled. Bypass the
    // unsaved-result guard (the user is deliberately leaving the result), and replace
    // the result in the stack so editing supersedes it. Works whether this result came
    // from the calculator (draft) or the Recent list — both carry the form values.
    continueWithoutGuard(() => router.replace({
      pathname: '/calculate' as never,
      params: buildEditCalculatorParams(formValues as unknown as LoanCalculatorFormValues, currency),
    }));
  }, [continueWithoutGuard, currency, formValues, router]);

  const confirmLeave = useCallback((continueNavigation: () => void) => {
    pendingLeaveRef.current = continueNavigation;
    setShowUnsavedModal(true);
  }, []);

  const keepEditing = useCallback(() => {
    pendingLeaveRef.current = null;
    setShowUnsavedModal(false);
  }, []);

  const saveBeforeLeaving = useCallback(() => {
    pendingLeaveRef.current = null;
    setShowUnsavedModal(false);
    openSave();
  }, [openSave]);

  const discardAndLeave = useCallback(() => {
    const pending = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setShowUnsavedModal(false);
    if (pending) {
      continueWithoutGuard(pending);
    }
  }, [continueWithoutGuard]);

  useFocusEffect(
    useCallback(() => {
      if (!shouldGuardUnsavedResult) return undefined;
      setResultLeaveGuard(confirmLeave);
      return () => setResultLeaveGuard(null);
    }, [confirmLeave, shouldGuardUnsavedResult]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (!shouldGuardUnsavedResult || allowLeaveRef.current) return;

      event.preventDefault();
      confirmLeave(() => {
        continueWithoutGuard(() => navigation.dispatch(event.data.action));
      });
    });

    return unsubscribe;
  }, [confirmLeave, continueWithoutGuard, navigation, shouldGuardUnsavedResult]);

  if (!result || !formValues) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.notFound}>
          <AppText variant="bodyLg" style={styles.notFoundText}>{t('results.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
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
            <EditIcon color={colours.primary} />
          </HeaderIconButton>
        ) : (
          <HeaderIconButton
            onPress={openSave}
            accessibilityLabel={t('common.save')}
          >
            <SaveIcon color={colours.primary} size={20} />
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
        summaryContent={!isSavedMode && draftLoan ? (
          <LoanSummaryPanel
            loan={draftLoan}
            result={result}
            mode="draft"
            onSave={openSave}
            onShare={handleShare}
            onEdit={handleEdit}
          />
        ) : undefined}
      />

      <BannerAd />
      <UnsavedResultModal
        visible={showUnsavedModal}
        onKeepEditing={keepEditing}
        onSave={saveBeforeLeaving}
        onDiscard={discardAndLeave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: 16 },
});
