import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getDefaultCurrency,
  useLoanCalculatorForm,
  LoanCalculatorFormValues,
} from '@/hooks/useLoanCalculatorForm';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { CurrencyCode } from '@/currency/currencies';
import { LoanCategory } from '@/types/SavedLoan';
import { LoanForm } from '@/components/calculator/LoanForm';
import { MortgageDashboard } from '@/components/loans/MortgageDashboard';
import { Icon, IconName } from '@/components/ui/Icon';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { colours, elevation, layout, radii, spacing } from '@/theme';
import { beginDraftResult } from '@/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasSeenGuide } from '@/onboarding/guideState';
import { whenConsentFlowComplete } from '@/onboarding/firstRunGate';

type JourneyStep = 'intent' | 'trackChoice' | 'form';

interface JourneyOptionProps {
  title: string;
  body: string;
  meta?: string;
  icon?: React.ReactNode;
  onPress: () => void;
}

const JourneyOption = ({ title, body, meta, icon, onPress }: JourneyOptionProps) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.84}
    onPress={onPress}
    style={styles.optionCard}
  >
    {icon ? <View style={styles.optionIcon}>{icon}</View> : null}
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
  </TouchableOpacity>
);

interface JourneyStepScreenProps {
  headerTitle: string;
  backAction?: React.ReactNode;
  kicker: string;
  title: string;
  help: string;
  children: React.ReactNode;
}

// Shared chrome for each journey step (header, intro, option list) so the
// intent and track-choice steps stay in sync.
const JourneyStepScreen = ({ headerTitle, backAction, kicker, title, help, children }: JourneyStepScreenProps) => (
  <SafeAreaView style={styles.safe} edges={[]}>
    <ScreenHeader title={headerTitle} variant="top-level" leftAction={backAction} />
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.journeyIntro}>
        <AppText variant="labelSm" tone="accent" style={styles.kicker}>
          {kicker}
        </AppText>
        <AppText variant="title1" style={styles.journeyTitle}>
          {title}
        </AppText>
        <AppText variant="bodyLg" tone="muted" style={styles.journeyBody}>
          {help}
        </AppText>
      </View>

      <View style={styles.optionList}>{children}</View>
    </ScrollView>
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
  }>();
  const isCalculateTab = mode === 'calculate';
  const form = useLoanCalculatorForm();
  const consumedEditRef = useRef<string | null>(null);
  const { loans, refresh } = useSavedLoans();
  const [journeyStep, setJourneyStep] = useState<JourneyStep>('intent');
  const [showCalculator, setShowCalculator] = useState(isCalculateTab);
  const firstRunChecked = useRef(false);

  const pinnedLoans = useMemo(
    () => loans
      .filter(loan => loan.pinnedToDashboard)
      .sort((a, b) => (a.dashboardOrder ?? 0) - (b.dashboardOrder ?? 0)),
    [loans],
  );

  useEffect(() => {
    if (firstRunChecked.current) return;
    firstRunChecked.current = true;
    if (hasSeenGuide()) return;

    let cancelled = false;

    whenConsentFlowComplete().then(() => {
      if (!cancelled && !hasSeenGuide()) {
        router.push('/guide?firstRun=1');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (isCalculateTab || params.calculator) {
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
      refresh();
      // Returning from the pushed track form should land back on the top intent,
      // not the track sub-step the user drilled into. Only resets that sub-step.
      setJourneyStep(step => (step === 'trackChoice' ? 'intent' : step));
      // Don't clobber an edited calc's currency while we're hydrating it.
      if (params.editValues) return;
      form.setValue('currency', getDefaultCurrency(), {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }, [form, refresh, params.editValues])
  );

  const openCalculator = useCallback(() => {
    router.push('/calculate' as never);
  }, [router]);

  const returnToDashboard = useCallback(() => {
    if (isCalculateTab) {
      setJourneyStep('intent');
      return;
    }

    setShowCalculator(false);
  }, [isCalculateTab]);

  const handleJourneyBack = useCallback(() => {
    if (journeyStep === 'intent') {
      returnToDashboard();
      return;
    }

    setJourneyStep('intent');
  }, [journeyStep, returnToDashboard]);

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

  const canGoBackInJourney = journeyStep !== 'intent' || (!isCalculateTab && pinnedLoans.length > 0);
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
        kicker={t('journey.stepIntent')}
        title={t('journey.intentTitle')}
        help={t('journey.intentHelp')}
      >
        <JourneyOption
          title={t('journey.calculateTitle')}
          body={t('journey.calculateHelp')}
          icon={<Icon icon={IconName.CalculatorIcon} color={colours.primary} size={24} strokeWidth={1.8} />}
          onPress={openPlanForm}
        />
        <JourneyOption
          title={t('journey.trackTitle')}
          body={t('journey.trackIntentHelp')}
          icon={<Icon icon={IconName.TimelineIcon} color={colours.primary} size={24} strokeWidth={1.8} />}
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
        kicker={t('journey.stepTrack')}
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
        title={t('tabs.calculator')}
        variant="top-level"
        leftAction={journeyBackAction}
      />
      <LoanForm
        form={form}
        onSubmit={handleSubmit}
        topContent={(
          <View style={styles.pageIntro}>
            <AppText variant="bodyLg" tone="muted" style={styles.pageSubtitle}>
              {t('calculator.subtitle')}
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
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.borderSoft,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: layout.cardPadding,
    ...elevation.level1,
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
  pageIntro: {
    marginBottom: spacing.lg,
  },
  pageSubtitle: {
    maxWidth: '96%',
  },
});
