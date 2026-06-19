import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getDefaultCurrency,
  useLoanCalculatorForm,
  LoanCalculatorFormValues,
} from '@/shared/lib/hooks/useLoanCalculatorForm';
import { useSavedLoans } from '@/shared/lib/hooks/useSavedLoans';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { LoanCategory } from '@/shared/domain/types/SavedLoan';
import { LoanForm } from '@/features/calculator/components/LoanForm';
import { MortgageDashboard } from '@/features/tracker/components/dashboard/MortgageDashboard';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { AppText } from '@oskarfigura/ui-native';
import { colours, elevation, layout, radii, spacing } from '@/shared/ui/theme';
import { beginDraftResult } from '@/shared/domain/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasSeenGuide } from '@/shared/lib/services/onboarding/guideState';

type JourneyStep = 'intent' | 'trackChoice' | 'form';

interface JourneyOptionProps {
  title: string;
  body: string;
  meta?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  // The primary path (e.g. "Calculate repayments") gets a filled icon tile and a
  // stronger border so the most common action reads as the default, instead of
  // two equal-weight cards.
  primary?: boolean;
}

const JourneyOption = ({ title, body, meta, icon, onPress, primary }: JourneyOptionProps) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.84}
    onPress={onPress}
    style={styles.optionPressable}
  >
    <View style={[styles.optionCard, primary && styles.optionCardPrimary]}>
      {icon ? <View style={[styles.optionIcon, primary && styles.optionIconPrimary]}>{icon}</View> : null}
      <View style={styles.optionText}>
        {meta ? (
          <AppText variant="labelSm" tone="accent" style={styles.optionMeta}>
            {meta}
          </AppText>
        ) : null}
        <AppText variant="title2" style={styles.optionTitle}>
          {title}
        </AppText>
        <AppText variant="bodySm" tone="muted" style={styles.optionBody}>
          {body}
        </AppText>
      </View>
      <Icon icon={IconName.ChevronRightIcon} color={colours.textSecondary} size={20} strokeWidth={2} />
    </View>
  </TouchableOpacity>
);

interface JourneyStepScreenProps {
  headerTitle: string;
  backAction?: React.ReactNode;
  title: string;
  help: string;
  children: React.ReactNode;
  footerHint?: string;
}

// Shared chrome for each journey step (header, intro, option list) so the
// intent and track-choice steps stay in sync.
const JourneyStepScreen = ({ headerTitle, backAction, title, help, children, footerHint }: JourneyStepScreenProps) => (
  <SafeAreaView style={styles.safe} edges={[]}>
    <ScreenHeader title={headerTitle} variant="top-level" leftAction={backAction} />
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.journeyIntro}>
        <AppText variant="title1" style={styles.journeyTitle}>
          {title}
        </AppText>
        <AppText variant="bodyLg" tone="muted" style={styles.journeyBody}>
          {help}
        </AppText>
      </View>

      <View style={styles.optionList}>{children}</View>
    </ScrollView>
    {footerHint ? (
      <View style={styles.footerHintWrap}>
        <View style={styles.footerHint}>
          <Icon icon={IconName.LightBulbIcon} color={colours.warning} size={16} strokeWidth={2} />
          <AppText variant="bodySm" style={styles.footerHintText}>
            {footerHint}
          </AppText>
        </View>
      </View>
    ) : null}
  </SafeAreaView>
);

interface BorrowingJourneyScreenProps {
  mode?: 'home' | 'calculate';
}

export function BorrowingJourneyScreen({ mode = 'home' }: BorrowingJourneyScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    calculator?: string;
    dashboard?: string;
    editValues?: string;
    fromTracked?: string;
    fromResult?: string;
    returnResultParams?: string;
    returnTo?: string;
  }>();
  const isCalculateTab = mode === 'calculate';
  const initialEditValues = useMemo(() => {
    if (!params.editValues) return undefined;
    try {
      return JSON.parse(params.editValues) as Partial<LoanCalculatorFormValues>;
    } catch {
      return undefined;
    }
  }, [params.editValues]);
  const form = useLoanCalculatorForm({ initialValues: initialEditValues });
  const consumedEditRef = useRef<string | null>(null);
  const { loans, refresh } = useSavedLoans();
  const [journeyStep, setJourneyStep] = useState<JourneyStep>(isCalculateTab ? 'form' : 'intent');
  const [showCalculator, setShowCalculator] = useState(isCalculateTab);
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

  useEffect(() => {
    if (isCalculateTab) {
      setShowCalculator(true);
      setJourneyStep('form');
      return;
    }
    if (params.calculator) {
      setShowCalculator(true);
      setJourneyStep('intent');
    }
  }, [isCalculateTab, params.calculator]);

  useEffect(() => {
    if (!isCalculateTab && params.dashboard) {
      setShowCalculator(false);
    }
  }, [isCalculateTab, params.dashboard]);

  // Reopen for editing: hydrate the form from the calc's inputs and jump straight to
  // the form step. Clear the param once consumed so a later plain visit to the tab
  // starts fresh. Runs after the focus effect below, so the parsed currency wins.
  useEffect(() => {
    const editValues = params.editValues;
    if (!editValues || consumedEditRef.current === editValues) return;
    consumedEditRef.current = editValues;
    try {
      const parsed = JSON.parse(editValues) as Partial<LoanCalculatorFormValues>;
      form.reset(parsed);
      setShowCalculator(true);
      setJourneyStep('form');
    } catch {
      // Ignore a malformed edit payload — fall back to a normal calculator visit.
    }
    router.setParams({ editValues: '' });
  }, [params.editValues, form, router]);

  useFocusEffect(
    useCallback(() => {
      // The Calculate tab never lists saved loans, so skip the MMKV read there.
      if (!isCalculateTab) refresh();
      // Returning from the pushed track form should land back on the top intent,
      // not the track sub-step the user drilled into. Only resets that sub-step.
      setJourneyStep(step => (step === 'trackChoice' ? 'intent' : step));
      // Don't clobber an edited calc's currency while we're hydrating it.
      if (params.editValues) return;
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

  const returnToDashboard = useCallback(() => {
    if (isCalculateTab) {
      setJourneyStep('intent');
      return;
    }

    setShowCalculator(false);
  }, [isCalculateTab]);

  const handleJourneyBack = useCallback(() => {
    if (isCalculateTab && params.fromResult === '1') {
      try {
        const returnParams = params.returnResultParams
          ? JSON.parse(params.returnResultParams) as Record<string, string>
          : {};
        router.replace({
          pathname: '/result' as never,
          params: returnParams,
        });
      } catch {
        router.replace('/result' as never);
      }
      return;
    }

    if (isCalculateTab && params.fromTracked === '1' && params.returnTo) {
      router.replace(params.returnTo as never);
      return;
    }

    if (journeyStep === 'intent') {
      returnToDashboard();
      return;
    }

    setJourneyStep('intent');
  }, [
    isCalculateTab,
    journeyStep,
    params.fromResult,
    params.fromTracked,
    params.returnResultParams,
    params.returnTo,
    returnToDashboard,
    router,
  ]);

  const openPlanForm = useCallback(() => {
    setJourneyStep('form');
  }, []);

  // Track is a two-step branch: pick "track" here, then choose the category on
  // the next step. Keeps the first decision a clean Calculate-vs-Track fork.
  const openTrackBorrowing = useCallback(() => {
    setJourneyStep('trackChoice');
  }, []);

  // Category is chosen on the track step, so the track form is single-purpose
  // (no in-form Loan/Mortgage toggle).
  const openTrackForm = useCallback((category: LoanCategory) => {
    router.push(`/saved/track?category=${category}` as never);
  }, [router]);

  const handleSubmit = (values: LoanCalculatorFormValues) => {
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
      pathname: '/result' as never,
      params: beginDraftResult(result, values, values.currency as CurrencyCode),
    });
  };

  const canReturnToTracked = isCalculateTab
    && params.fromTracked === '1'
    && Boolean(params.returnTo);
  const canReturnToResult = isCalculateTab && params.fromResult === '1';
  const isEditingCalculation = canReturnToResult;
  const canGoBackInJourney = canReturnToResult || canReturnToTracked || (
    !isCalculateTab && (journeyStep !== 'intent' || pinnedLoans.length > 0)
  );
  const journeyBackAction = canGoBackInJourney ? (
    <HeaderBackAction onPress={handleJourneyBack} />
  ) : undefined;

  if (!isCalculateTab && pinnedLoans.length > 0 && !showCalculator) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <MortgageDashboard loans={pinnedLoans} onNewCalculation={openCalculator} />
      </SafeAreaView>
    );
  }

  if (journeyStep === 'intent') {
    return (
      <JourneyStepScreen
        headerTitle={t('journey.title')}
        backAction={journeyBackAction}
        title={t('journey.intentTitle')}
        help={t('journey.intentHelp')}
        footerHint={t('journey.intentHint')}
      >
        <JourneyOption
          meta={t('journey.calculateTag')}
          title={t('journey.calculateTitle')}
          body={t('journey.calculateHelp')}
          icon={<Icon icon={IconName.CalculatorIcon} color={colours.white} size={24} strokeWidth={1.8} />}
          onPress={openPlanForm}
          primary
        />
        <JourneyOption
          meta={t('journey.trackTag')}
          title={t('journey.trackTitle')}
          body={t('journey.trackIntentHelp')}
          icon={<Icon icon={IconName.SaveIcon} color={colours.primary} size={24} strokeWidth={1.8} />}
          onPress={openTrackBorrowing}
        />
      </JourneyStepScreen>
    );
  }

  if (journeyStep === 'trackChoice') {
    return (
      <JourneyStepScreen
        headerTitle={t('journey.title')}
        backAction={journeyBackAction}
        title={t('journey.trackChoiceTitle')}
        help={t('journey.trackChoiceHelp')}
      >
        <JourneyOption
          title={t('save.mortgage')}
          body={t('journey.trackMortgageHelp')}
          icon={<Icon icon={IconName.MortgageIcon} color={colours.primary} size={24} strokeWidth={1.8} />}
          onPress={() => openTrackForm('mortgage')}
        />
        <JourneyOption
          title={t('save.loan')}
          body={t('journey.trackLoanHelp')}
          icon={<Icon icon={IconName.LoanCategoryIcon} color={colours.primary} size={24} strokeWidth={1.8} />}
          onPress={() => openTrackForm('loan')}
        />
      </JourneyStepScreen>
    );
  }

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t(isEditingCalculation ? 'calculator.editTitle' : 'tabs.calculator')}
        variant="top-level"
        leftAction={journeyBackAction}
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
  return <BorrowingJourneyScreen mode="home" />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: {
    padding: layout.screenPadding,
    paddingBottom: spacing['3xl'],
  },
  kicker: {
    textTransform: 'uppercase',
  },
  journeyIntro: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  journeyTitle: {
    color: colours.textPrimary,
  },
  journeyBody: {
    maxWidth: '96%',
  },
  optionList: {
    gap: spacing.md,
  },
  optionPressable: {
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    ...elevation.level1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.borderSoft,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: layout.cardPadding,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
  },
  optionText: {
    flex: 1,
    gap: spacing.xxs,
  },
  optionMeta: {
    textTransform: 'uppercase',
  },
  optionTitle: {
    color: colours.textPrimary,
  },
  optionBody: {
    maxWidth: '96%',
  },
  optionCardPrimary: {
    borderColor: colours.primary,
    borderWidth: 1.5,
  },
  optionIconPrimary: {
    backgroundColor: colours.primary,
  },
  footerHintWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colours.warningSurface,
    borderWidth: 1,
    borderColor: colours.honeySoft,
  },
  footerHintText: {
    flexShrink: 1,
    color: colours.warning,
  },
  pageIntro: {
    marginBottom: spacing.lg,
  },
  pageSubtitle: {
    maxWidth: '96%',
  },
});
