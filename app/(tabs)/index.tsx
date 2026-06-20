import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getDefaultCurrency,
  useLoanCalculatorForm,
  LoanCalculatorFormValues,
} from '@/shared/lib/hooks/useLoanCalculatorForm';
import { normaliseCalculatorFormValues } from '@/shared/lib/hooks/normaliseCalculatorFormValues';
import { useSavedLoans } from '@/shared/lib/hooks/useSavedLoans';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { LoanForm } from '@/features/calculator/components/LoanForm';
import { MortgageDashboard } from '@/features/tracker/components/dashboard/MortgageDashboard';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { AppText } from '@oskarfigura/ui-native';
import { colours, spacing } from '@/shared/ui/theme';
import { beginDraftResult } from '@/shared/domain/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasSeenGuide } from '@/shared/lib/services/onboarding/guideState';

interface BorrowingScreenProps {
  mode?: 'home' | 'calculate';
}

// Home and the Calculate tab share this single calculator surface. Home additionally
// renders the dashboard when the user has pinned loans; with none it falls straight
// through to the form (same single calculation as the Calculate tab). The Calculate
// tab also carries the edit/return-to-result flows via params.
export function BorrowingScreen({ mode = 'home' }: BorrowingScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    editValues?: string;
    fromTracked?: string;
    fromResult?: string;
    returnResultParams?: string;
    returnTo?: string;
  }>();
  const isCalculateTab = mode === 'calculate';
  const resultReturnTo = useMemo(() => {
    if (!isCalculateTab) return '/';
    if (params.fromResult !== '1' || !params.returnResultParams) return undefined;

    try {
      const returnParams = JSON.parse(params.returnResultParams) as { returnTo?: string };
      return returnParams.returnTo;
    } catch {
      return undefined;
    }
  }, [isCalculateTab, params.fromResult, params.returnResultParams]);
  const initialEditValues = useMemo(() => {
    if (!params.editValues) return undefined;
    try {
      return normaliseCalculatorFormValues(JSON.parse(params.editValues));
    } catch {
      return undefined;
    }
  }, [params.editValues]);
  const form = useLoanCalculatorForm({ initialValues: initialEditValues });
  const consumedEditRef = useRef<string | null>(null);
  // True while the form holds an edited calc that hasn't been recalculated yet.
  // Hydrating an edit clears the editValues param (to dedupe), so the focus
  // effect's `if (params.editValues) return` guard stops protecting the currency
  // — both on the param-clear re-fire and on any later tab re-focus, where the
  // param is gone entirely. Without this, the device-default currency would
  // overwrite the edited calc's currency. handleSubmit clears it once the edit
  // is recalculated, restoring normal default-currency behaviour.
  const preserveEditedCurrencyRef = useRef(false);
  const { loans, refresh } = useSavedLoans();
  const firstRunChecked = useRef(false);

  // Only the Home instance renders the dashboard. The Calculate tab mounts this same
  // screen too (always alive in the tab navigator), so short-circuit the filter/sort
  // there rather than recomputing it for a list it never shows.
  const pinnedLoans = useMemo(
    () => (isCalculateTab
      ? []
      : loans
        .filter(loan => loan.pinnedToDashboard)
        .sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0))),
    [loans, isCalculateTab],
  );

  useEffect(() => {
    if (firstRunChecked.current) return;
    firstRunChecked.current = true;
    if (hasSeenGuide()) return;

    // Value-first onboarding: show the guide immediately on first launch. Its
    // final card carries the tracking rationale, and dismissing it releases the
    // ATT/consent flow (gated in AdProvider) — so the system dialogs no longer
    // collide with the guide and appear afterwards, over the calculator.
    router.push('/guide?firstRun=1');
  }, [router]);

  // Reopen for editing: hydrate the form from the calc's inputs. Clear the param once
  // consumed so a later plain visit to the tab starts fresh. Runs after the focus
  // effect below, so the parsed currency wins.
  useEffect(() => {
    const editValues = params.editValues;
    if (!editValues || consumedEditRef.current === editValues) return;
    consumedEditRef.current = editValues;
    try {
      const parsed = normaliseCalculatorFormValues(JSON.parse(editValues));
      form.reset(parsed);
      preserveEditedCurrencyRef.current = true;
    } catch {
      // Ignore a malformed edit payload — fall back to a normal calculator visit.
    }
    router.setParams({ editValues: '' });
  }, [params.editValues, form, router]);

  useFocusEffect(
    useCallback(() => {
      // The Calculate tab never lists saved loans, so skip the MMKV read there.
      if (!isCalculateTab) refresh();
      // Don't clobber an edited calc's currency while we're hydrating it.
      if (params.editValues) return;
      // Keep preserving it after hydration clears the param — on the re-fire and
      // on every later tab re-focus — until the edit is recalculated (handleSubmit
      // clears the flag). Otherwise returning to the tab mid-edit would reset the
      // currency to the device default.
      if (preserveEditedCurrencyRef.current) return;
      // This effect runs on every focus (including returning from any pushed screen),
      // so only write the currency when the default actually differs — a same-value
      // setValue would still re-render the controlled currency field for nothing.
      const nextCurrency = getDefaultCurrency();
      if (form.getValues('currency') !== nextCurrency) {
        form.setValue('currency', nextCurrency, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
      }
    }, [form, refresh, params.editValues, isCalculateTab])
  );

  const openCalculator = useCallback(() => {
    router.push({
      pathname: '/calculate' as never,
      params: {
        fromTracked: '1',
        returnTo: '/',
      },
    });
  }, [router]);

  const handleBack = useCallback(() => {
    if (isCalculateTab && params.fromResult === '1') {
      try {
        const returnParams = params.returnResultParams
          ? JSON.parse(params.returnResultParams) as Record<string, string>
          : {};
        router.replace({
          pathname: '/calculate/result' as never,
          params: returnParams,
        });
      } catch {
        router.replace('/calculate/result' as never);
      }
      return;
    }

    if (isCalculateTab && params.fromTracked === '1' && params.returnTo) {
      router.replace(params.returnTo as never);
    }
  }, [
    isCalculateTab,
    params.fromResult,
    params.fromTracked,
    params.returnResultParams,
    params.returnTo,
    router,
  ]);

  const handleSubmit = (values: LoanCalculatorFormValues) => {
    // Recalculating consumes the edit, so the tab no longer needs to preserve the
    // edited currency — fresh focuses can default it again.
    preserveEditedCurrencyRef.current = false;
    const result = getLoanCalculations(
      values.loanAmount,
      values.interest,
      values.termInYears ?? 0,
      values.termInMonths ?? 0,
      values.desiredMonthlyPayment ?? 0,
      values.calculationType as LoanCalculationType,
      values.downPayment,
      values.downPaymentType as DownPaymentType,
      values.additionalMonthlyPayment,
      values.startDate,
    );

    router.push({
      pathname: '/calculate/result' as never,
      params: {
        ...beginDraftResult(result, values, values.currency as CurrencyCode),
        ...(resultReturnTo ? { returnTo: resultReturnTo } : {}),
      },
    });
  };

  const canReturnToResult = isCalculateTab && params.fromResult === '1';
  const canReturnToTracked = isCalculateTab
    && params.fromTracked === '1'
    && Boolean(params.returnTo);
  const isEditingCalculation = canReturnToResult;
  const backAction = canReturnToResult || canReturnToTracked ? (
    <HeaderBackAction onPress={handleBack} />
  ) : undefined;

  if (!isCalculateTab && pinnedLoans.length > 0) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <MortgageDashboard loans={pinnedLoans} onNewCalculation={openCalculator} />
      </SafeAreaView>
    );
  }

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t(isEditingCalculation ? 'calculator.editTitle' : 'tabs.calculator')}
        variant="top-level"
        leftAction={backAction}
      />
      <LoanForm
        form={form}
        onSubmit={handleSubmit}
        submitLabel={isEditingCalculation ? t('calculator.updateResult') : undefined}
        topContent={(
          <View style={styles.pageIntro}>
            <AppText variant="bodyLg" tone="muted" style={styles.pageSubtitle}>
              {t(isEditingCalculation ? 'calculator.editSubtitle' : 'calculator.subtitle')}
            </AppText>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return <BorrowingScreen mode="home" />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  pageIntro: {
    marginBottom: spacing.lg,
  },
  pageSubtitle: {
    maxWidth: '96%',
  },
});
