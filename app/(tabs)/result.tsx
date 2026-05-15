import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Share,
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
import { SaveIcon, ShareIcon } from '@/components/ui/Icons';
import { BannerAd } from '@/ads/BannerAd';
import { colours, layout } from '@/theme';
import { CurrencyCode } from '@/currency/currencies';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedLoan } from '@/types/SavedLoan';
import {
  LoanResult,
  getResultForSavedLoan,
} from '@/results/loanResultRoute';
import { getDraftResultSession } from '@/results/draftResultStore';
import { savedLoansStorage } from '@/storage/savedLoans';
import { setResultLeaveGuard } from '@/navigation/resultLeaveGuard';
import { useStoreReview } from '@/review';
import { formatCurrency } from '@/currency/format';
import { getCalculationWebShareUrl, ShareableCalculationValues } from '@/share/calculationShareLink';
import { UnsavedResultModal } from '@/components/results/UnsavedResultModal';
import { EditIcon } from '@/components/loans/LoanIcons';

type ResultParams = {
  draftId?: string;
  result?: string;
  formValues?: string;
  currency?: string;
  mode?: string;
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
  const isSavedMode = params.mode === 'saved' && savedLoan !== null;
  const draftSession = useMemo(() => getDraftResultSession(params.draftId), [params.draftId]);

  const result = useMemo(() => {
    if (savedLoan) return getResultForSavedLoan(savedLoan);
    if (draftSession) return draftSession.result;
    return parseJson<LoanResult>(params.result);
  }, [draftSession, params.result, savedLoan]);
  const formValues = useMemo(() => (
    savedLoan?.formSnapshot
    ?? draftSession?.formValues
    ?? parseJson<Record<string, unknown>>(params.formValues)
  ), [draftSession?.formValues, params.formValues, savedLoan]);
  const currency = ((savedLoan?.currency ?? draftSession?.currency ?? params.currency) as CurrencyCode | undefined) ?? 'GBP';
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

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
        currency,
        returnToResult: '1',
      },
    });
  }, [currency, formValues, params.draftId, params.formValues, params.result, result, router]);

  const handleShare = useCallback(async () => {
    if (!result || !formValues) return;

    const shareValues = {
      ...(formValues as Partial<ShareableCalculationValues>),
      currency,
    } as ShareableCalculationValues;
    const shareUrl = getCalculationWebShareUrl(shareValues);
    const monthlyPayment = formatCurrency(result.monthlyPayments, currency);
    const totalInterest = formatCurrency(result.totalInterestPaid, currency);
    const totalCost = formatCurrency(result.totalAmountPaid, currency);

    try {
      await Share.share({
        title: t('share.title'),
        message: [
          t('share.intro'),
          '',
          t('share.monthlyPayment', { amount: monthlyPayment }),
          t('share.totalInterest', { amount: totalInterest }),
          t('share.totalCost', { amount: totalCost }),
          '',
          t('share.viewCalculation'),
          shareUrl,
        ].join('\n'),
        url: shareUrl,
      });
    } catch {
      Alert.alert(t('share.errorTitle'), t('share.errorMessage'));
    }
  }, [currency, formValues, result, t]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

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
      if (isSavedMode) return undefined;
      setResultLeaveGuard(confirmLeave);
      return () => setResultLeaveGuard(null);
    }, [confirmLeave, isSavedMode]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (isSavedMode || allowLeaveRef.current) return;

      event.preventDefault();
      confirmLeave(() => {
        continueWithoutGuard(() => navigation.dispatch(event.data.action));
      });
    });

    return unsubscribe;
  }, [confirmLeave, continueWithoutGuard, isSavedMode, navigation]);

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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('results.title')}
        variant="detail"
        leftAction={<HeaderBackAction onPress={handleBack} variant="circle" />}
        rightAction={!isSavedMode ? (
          <HeaderIconButton
            onPress={openSave}
            accessibilityLabel={t('results.saveThisLoan')}
          >
            <SaveIcon color={colours.primary} />
          </HeaderIconButton>
        ) : savedLoan ? (
          <HeaderIconButton
            onPress={() => router.push(`/saved/${savedLoan.id}/edit`)}
            accessibilityLabel={t('edit.manageShort')}
          >
            <EditIcon color={colours.primary} />
          </HeaderIconButton>
        ) : undefined}
        showBottomBorder={false}
        backgroundColor={colours.background}
      />

      <LoanCalculationView
        result={result}
        startDate={String(formValues.startDate)}
        currency={currency}
        savedLoan={savedLoan ?? undefined}
        onShare={handleShare}
        shareLabel={t('share.short')}
        shareIcon={<ShareIcon color={colours.primary} />}
        tabStyle="underline"
        showFinancialDisclaimer
        ownsScroll
      />

      <View style={styles.adFooter}>
        <BannerAd />
      </View>
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
  adFooter: {
    backgroundColor: colours.white,
    borderTopWidth: 1,
    borderTopColor: colours.surface,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 2,
  },
});
