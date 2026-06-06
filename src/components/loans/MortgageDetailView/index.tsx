import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AmortisationTable } from '@/components/calculator/AmortisationTable';
import { ChartHelpButton, ChartHelpDrawer, type ChartHelpContent } from '@/components/charts/ChartHelp';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
import { MortgageBalanceChart } from '@/components/charts/MortgageBalanceChart';
import { RepaymentBarChart } from '@/components/charts/RepaymentBarChart';
import { DashboardProgressGauge } from '@/components/loans/DashboardProgressGauge';
import { DashboardPinButton } from '@/components/loans/DashboardPinButton';
import { MoreIcon, PlusIcon } from '@/components/loans/LoanIcons';
import { MortgageTimelineView, MortgageWarningBanners } from '@/components/loans/MortgageTimelineView';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { SegmentedControl } from '@/components/ui/FormPrimitives';
import { AddDocumentIcon } from '@/components/ui/Icons/AddDocumentIcon/AddDocumentIcon';
import { AlertTriangleIcon } from '@/components/ui/Icons/AlertTriangleIcon/AlertTriangleIcon';
import { CalendarDateIcon } from '@/components/ui/Icons/CalendarDateIcon/CalendarDateIcon';
import { ChevronRightIcon } from '@/components/ui/Icons/ChevronRightIcon/ChevronRightIcon';
import { ClockCheckIcon } from '@/components/ui/Icons/ClockCheckIcon/ClockCheckIcon';
import { CoinsStackedIcon } from '@/components/ui/Icons/CoinsStackedIcon/CoinsStackedIcon';
import { EyeIcon } from '@/components/ui/Icons/EyeIcon/EyeIcon';
import { EditIcon as UiEditIcon } from '@/components/ui/Icons/EditIcon/EditIcon';
import { MessageTextCircleIcon } from '@/components/ui/Icons/MessageTextCircleIcon/MessageTextCircleIcon';
import { ShieldTickIcon } from '@/components/ui/Icons/ShieldTickIcon/ShieldTickIcon';
import { formatCurrency } from '@/currency/format';
import {
  buildSavedLoanDashboardProgress,
  buildSavedLoanDisplayDetails,
  buildSavedLoanSummary,
  LoanDashboardProgress,
  LoanInsightMetric,
  LoanInsightSummary,
} from '@/loans/loanInsightSummary';
import {
  buildMortgageProjection,
  MortgageProjection,
} from '@/mortgage/projection';
import {
  BalanceSourceMetadata,
  getBalanceSourceMetadata,
  getReconciliationMessage,
} from '@/mortgage/reconciliation';
import {
  formatDealDuration,
  getCurrentDeal,
  getDealOverpaymentImpact,
  getMortgageTrackerSummary,
  getPublishedDeals,
  loanHasOverpayments,
} from '@/mortgage/tracker';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { LoanDeal, SavedLoan } from '@/types/SavedLoan';
import { colours } from '@/theme';
import { formatFriendlyDate, formatFriendlyDateRange, formatIsoDate } from '@/utils/date';

type MortgageDetailTab = 'overview' | 'projection' | 'timeline';
type ProjectionPreview = 'balance' | 'repayment' | 'cumulative' | 'schedule';
type ProjectionRenderStage = 0 | 1 | 2 | 3 | 4;
type ChartHelpId = 'mortgageBalanceProjection' | 'repaymentProjection' | 'cumulativePayments';

const PROJECTION_RENDER_STAGES: ProjectionRenderStage[] = [1, 2, 3, 4];

const SUMMARY_METRIC_KEYS = [
  'mortgage.currentBalance',
  'results.monthlyPayment',
  'results.payoffDate',
];

interface Props {
  loan: SavedLoan;
  onTogglePinned: () => void;
  onLoanUpdated?: () => void;
  footerActions?: React.ReactNode;
}

export const MortgageDetailView = ({
  loan,
  onTogglePinned,
  onLoanUpdated,
  footerActions,
}: Props) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<MortgageDetailTab>('overview');
  const [addDrawerVisible, setAddDrawerVisible] = useState(false);
  const [actionDrawerVisible, setActionDrawerVisible] = useState(false);
  const [projectionPreview, setProjectionPreview] = useState<ProjectionPreview | null>(null);
  const [chartHelp, setChartHelp] = useState<ChartHelpId | null>(null);
  const projectionRenderKey = `${loan.id}:${loan.updatedAt}`;
  const [projectionRenderState, setProjectionRenderState] = useState<{
    key: string;
    stage: ProjectionRenderStage;
  }>({ key: projectionRenderKey, stage: 0 });
  const projectionRenderStage = projectionRenderState.key === projectionRenderKey
    ? projectionRenderState.stage
    : 0;
  const isProjectionPreviewOpen = projectionPreview !== null;
  const asOf = useMemo(() => new Date(), [loan]);
  const result = useMemo(() => getResultForSavedLoan(loan), [loan]);
  const projection = useMemo(() => buildMortgageProjection(loan, asOf), [asOf, loan]);
  // Single source of truth for the comparison: the baseline series, but only when the loan
  // actually has overpayments and there are enough points to plot (the chart needs ≥2 yearly
  // samples). Render sites narrow off this one value rather than re-checking.
  const overpaymentBaseline = loanHasOverpayments(loan)
    && projection.baselineRemainingArray
    && projection.baselineRemainingArray.length > 1
    ? projection.baselineRemainingArray
    : undefined;
  const trackerSummary = useMemo(() => getMortgageTrackerSummary(loan, asOf), [asOf, loan]);
  const displayDetails = useMemo(() => buildSavedLoanDisplayDetails(loan, asOf), [asOf, loan]);
  const insightSummary = useMemo(() => (
    buildSavedLoanSummary(loan, result, asOf, i18n.language)
  ), [asOf, i18n.language, loan, result]);
  const dashboardProgress = useMemo(() => (
    buildSavedLoanDashboardProgress(loan, result, asOf)
  ), [asOf, loan, result]);
  const currentDeal = trackerSummary.currentDeal;
  const activeDeal = getCurrentDeal(loan, asOf);
  const publishedDeals = getPublishedDeals(loan);
  const draftDeal = trackerSummary.nextDraftDeal;
  const canPlanNextDeal = !draftDeal;
  const overpaymentDeal = activeDeal ?? publishedDeals[publishedDeals.length - 1];
  const todayIso = formatIsoDate(asOf);
  // Borrowing that hasn't started yet has no real history to record or complete, so
  // the timeline tab and the event/history/completion actions are hidden until it begins.
  const isFutureStart = Boolean(activeDeal && activeDeal.startDate > todayIso);
  const tabs: Array<{ value: MortgageDetailTab; label: string }> = [
    { value: 'overview', label: t('mortgage.overview') },
    { value: 'projection', label: t('mortgage.projection') },
    ...(isFutureStart ? [] : [{ value: 'timeline' as const, label: t('mortgage.timeline') }]),
  ];
  const tabOrder: MortgageDetailTab[] = isFutureStart
    ? ['overview', 'projection']
    : ['overview', 'projection', 'timeline'];
  const switchTab = useCallback((nextTab: MortgageDetailTab) => {
    if (activeTab !== nextTab) {
      setProjectionRenderState({ key: projectionRenderKey, stage: 0 });
    }
    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [activeTab, projectionRenderKey]);

  useEffect(() => {
    if (activeTab !== 'projection') return undefined;

    let cancelled = false;
    setProjectionRenderState({ key: projectionRenderKey, stage: 0 });

    const showStage = (index: number) => {
      const nextStage = PROJECTION_RENDER_STAGES[index];
      if (!nextStage || cancelled) return;

      requestAnimationFrame(() => {
        if (cancelled) return;
        setProjectionRenderState({ key: projectionRenderKey, stage: nextStage });
        showStage(index + 1);
      });
    };

    const interaction = InteractionManager.runAfterInteractions(() => {
      showStage(0);
    });

    return () => {
      cancelled = true;
      interaction.cancel();
    };
  }, [activeTab, projectionRenderKey]);

  // A future-start mortgage can't sit on the (now hidden) timeline tab.
  useEffect(() => {
    if (isFutureStart && activeTab === 'timeline') setActiveTab('overview');
  }, [isFutureStart, activeTab]);

  const stateRef = useRef({ activeTab, switchTab });
  stateRef.current = { activeTab, switchTab };

  const goNext = useCallback(() => {
    const idx = tabOrder.indexOf(stateRef.current.activeTab);
    if (idx < tabOrder.length - 1) stateRef.current.switchTab(tabOrder[idx + 1]);
  }, []);

  const goPrev = useCallback(() => {
    const idx = tabOrder.indexOf(stateRef.current.activeTab);
    if (idx > 0) stateRef.current.switchTab(tabOrder[idx - 1]);
  }, []);

  const swipeGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd(event => {
      'worklet';
      if (event.translationX < -40) runOnJS(goNext)();
      else if (event.translationX > 40) runOnJS(goPrev)();
    }), [goNext, goPrev]);
  // The amortisation table scrolls horizontally; while it is being scrolled the
  // tab-swipe Pan must yield so a sideways drag on the table doesn't change tabs.
  const tableScrollGesture = useMemo(
    () => Gesture.Native().blocksExternalGesture(swipeGesture),
    [swipeGesture],
  );
  const navigateFromActions = (href: string) => {
    setAddDrawerVisible(false);
    setActionDrawerVisible(false);
    router.push(href as Parameters<typeof router.push>[0]);
  };
  const goToNewCalculation = () => {
    setAddDrawerVisible(false);
    setActionDrawerVisible(false);
    router.push('/calculate' as never);
  };
  const openProjectionPreview = useCallback((preview: ProjectionPreview) => {
    setProjectionPreview(preview);
    ScreenOrientation.unlockAsync().catch(() => undefined);
  }, []);
  const closeProjectionPreview = useCallback(() => {
    setProjectionPreview(null);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);
  const openChartHelp = useCallback((helpId: ChartHelpId) => {
    setChartHelp(helpId);
  }, []);
  const closeChartHelp = useCallback(() => {
    setChartHelp(null);
  }, []);
  const getProjectionPreviewTitle = () => {
    if (projectionPreview === 'balance') return t('mortgage.balanceProjection');
    if (projectionPreview === 'repayment') return t('results.repaymentBreakdown');
    if (projectionPreview === 'cumulative') return t('results.cumulativePayments');
    return t('mortgage.trackedSchedule');
  };
  const getChartHelpContent = (helpId: ChartHelpId): ChartHelpContent => {
    if (helpId === 'mortgageBalanceProjection') {
      return {
        title: t('chartHelp.mortgageBalanceProjectionTitle'),
        body: t('chartHelp.mortgageBalanceProjectionBody'),
      };
    }
    if (helpId === 'repaymentProjection') {
      return {
        title: t('chartHelp.repaymentProjectionTitle'),
        body: t('chartHelp.repaymentProjectionBody'),
      };
    }

    return {
      title: t('chartHelp.cumulativePaymentsTitle'),
      body: t('chartHelp.cumulativePaymentsBody'),
    };
  };
  const getProjectionPreviewHelpId = (): ChartHelpId | null => {
    if (projectionPreview === 'balance') return 'mortgageBalanceProjection';
    if (projectionPreview === 'repayment') return 'repaymentProjection';
    if (projectionPreview === 'cumulative') return 'cumulativePayments';
    return null;
  };
  const renderProjectionPreview = () => {
    if (projectionPreview === 'balance') {
      return (
        <MortgageBalanceChart
          baselineRemaining={overpaymentBaseline}
          scenarioRemaining={projection.loanChartRemainingArray}
          currency={loan.currency}
          height={320}
          comparisonLabelKeys={overpaymentBaseline ? {
            baseline: 'overpayments.withoutOverpayments',
            scenario: 'overpayments.withOverpayments',
          } : undefined}
        />
      );
    }

    if (projectionPreview === 'repayment') {
      return (
        <RepaymentBarChart
          monthlyArray={projection.loanChartMonthlyArray}
          interestArray={projection.loanChartInterestArray}
          currency={loan.currency}
          height={320}
        />
      );
    }

    if (projectionPreview === 'cumulative') {
      return (
        <CumulativeAreaChart
          monthlyArray={projection.loanChartMonthlyArray}
          interestArray={projection.loanChartInterestArray}
          remainingArray={projection.loanChartRemainingArray}
          currency={loan.currency}
          height={320}
        />
      );
    }

    if (projectionPreview === 'schedule') {
      return (
        <AmortisationTable
          items={projection.tableItems}
          startDate={publishedDeals[0]?.startDate ?? loan.formSnapshot.startDate}
          currency={loan.currency}
        />
      );
    }

    return null;
  };
  const projectionPreviewHelpId = getProjectionPreviewHelpId();
  const chartHelpContent = chartHelp ? getChartHelpContent(chartHelp) : null;

  useEffect(() => (
    () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    }
  ), []);

  return (
    <GestureDetector gesture={swipeGesture}>
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      stickyHeaderIndices={[0]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stickyTabs}>
        <SegmentedControl
          value={activeTab}
          onChange={switchTab}
          options={tabs}
          variant="underline"
          textVariant="labelMd"
          style={styles.tabControl}
        />
      </View>
      <FinancialDisclaimer dismissible style={styles.financialDisclaimer} />
      <MortgageWarningBanners loan={loan} />

      {activeTab === 'overview' ? (
        <View style={styles.tabPanel}>
          <MortgageSummaryPanel
            loan={loan}
            summary={insightSummary}
            dashboardProgress={dashboardProgress}
            lender={displayDetails.lender}
            currentDeal={activeDeal}
            publishedDeals={publishedDeals}
            projection={projection}
            asOf={asOf}
            isFutureStart={isFutureStart}
            overpaymentDeal={overpaymentDeal}
            onTogglePinned={onTogglePinned}
            onAddDeal={() => router.push(`/saved/${loan.id}/deals/new`)}
            onOpenTimeline={() => switchTab('timeline')}
          />

          <MortgageQuickActionsRow
            hasActiveDeal={!!activeDeal}
            onViewDeal={() => activeDeal && router.push(`/saved/${loan.id}/deals/${activeDeal.id}`)}
            onNewCalculation={goToNewCalculation}
            onAdd={() => setAddDrawerVisible(true)}
            onMore={() => setActionDrawerVisible(true)}
          />
        </View>
      ) : null}

      {activeTab === 'projection' ? (
        <View style={styles.tabPanel}>
          <ProjectionBasisCard
            currentDeal={currentDeal}
          />
          {projectionRenderStage >= 1 ? (
            <ProjectionChartCard
              title={t('mortgage.balanceProjection')}
              accessibilityLabel={`${t('mortgage.balanceProjection')} ${t('results.fullScreen')}`}
              helpAccessibilityLabel={t('chartHelp.open', { title: t('mortgage.balanceProjection') })}
              onPress={() => openProjectionPreview('balance')}
              onHelpPress={() => openChartHelp('mortgageBalanceProjection')}
            >
              <MortgageBalanceChart
                baselineRemaining={overpaymentBaseline}
                scenarioRemaining={projection.loanChartRemainingArray}
                currency={loan.currency}
                comparisonLabelKeys={overpaymentBaseline ? {
                  baseline: 'overpayments.withoutOverpayments',
                  scenario: 'overpayments.withOverpayments',
                } : undefined}
              />
            </ProjectionChartCard>
          ) : (
            <ProjectionSkeletonCard title={t('mortgage.balanceProjection')} />
          )}
          {projectionRenderStage >= 2 ? (
            <ProjectionChartCard
              title={t('results.repaymentBreakdown')}
              accessibilityLabel={`${t('results.repaymentBreakdown')} ${t('results.fullScreen')}`}
              helpAccessibilityLabel={t('chartHelp.open', { title: t('results.repaymentBreakdown') })}
              onPress={() => openProjectionPreview('repayment')}
              onHelpPress={() => openChartHelp('repaymentProjection')}
            >
              <RepaymentBarChart
                monthlyArray={projection.loanChartMonthlyArray}
                interestArray={projection.loanChartInterestArray}
                currency={loan.currency}
                fitToWidth
              />
            </ProjectionChartCard>
          ) : (
            <ProjectionSkeletonCard title={t('results.repaymentBreakdown')} />
          )}
          {projectionRenderStage >= 3 ? (
            <ProjectionChartCard
              title={t('results.cumulativePayments')}
              accessibilityLabel={`${t('results.cumulativePayments')} ${t('results.fullScreen')}`}
              helpAccessibilityLabel={t('chartHelp.open', { title: t('results.cumulativePayments') })}
              onPress={() => openProjectionPreview('cumulative')}
              onHelpPress={() => openChartHelp('cumulativePayments')}
            >
              <CumulativeAreaChart
                monthlyArray={projection.loanChartMonthlyArray}
                interestArray={projection.loanChartInterestArray}
                remainingArray={projection.loanChartRemainingArray}
                currency={loan.currency}
                fitToWidth
              />
            </ProjectionChartCard>
          ) : (
            <ProjectionSkeletonCard title={t('results.cumulativePayments')} />
          )}
          {projectionRenderStage >= 4 ? (
            <Card style={[styles.chartCard, styles.scheduleCard]}>
              <View style={styles.chartHeader}>
                <AppText variant="title3">{t('mortgage.trackedSchedule')}</AppText>
                <TouchableOpacity
                  style={styles.fullscreenButton}
                  onPress={() => openProjectionPreview('schedule')}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <FullscreenIcon />
                </TouchableOpacity>
              </View>
              <AmortisationTable
                items={projection.tableItems}
                startDate={publishedDeals[0]?.startDate ?? loan.formSnapshot.startDate}
                currency={loan.currency}
                scrollGesture={tableScrollGesture}
              />
            </Card>
          ) : (
            <ProjectionSkeletonCard title={t('mortgage.trackedSchedule')} schedule />
          )}
        </View>
      ) : null}

      {activeTab === 'timeline' ? (
        <View style={styles.tabPanel}>
          <View style={styles.timelineSection}>
            <AppText variant="title3" style={styles.timelineSectionTitle}>{t('mortgage.dealTimeline')}</AppText>
            <MortgageTimelineView
              loan={loan}
              showFooterAction
              onLoanUpdated={() => onLoanUpdated?.()}
            />
          </View>
        </View>
      ) : null}

      {footerActions}
      <Modal
        visible={isProjectionPreviewOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={closeProjectionPreview}
      >
        <SafeAreaView style={styles.fullscreenSafe} edges={['top', 'bottom']}>
          <View style={styles.fullscreenHeader}>
            <AppText variant="title3" style={styles.previewTitle}>{getProjectionPreviewTitle()}</AppText>
            {projectionPreviewHelpId ? (
              <ChartHelpButton
                accessibilityLabel={t('chartHelp.open', { title: getProjectionPreviewTitle() })}
                onPress={() => openChartHelp(projectionPreviewHelpId)}
              />
            ) : null}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeProjectionPreview}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <AppText variant="labelSm" tone="accent" style={styles.actionButtonText}>
                {t('common.close')}
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.fullscreenBody}
            contentContainerStyle={styles.fullscreenContent}
            showsVerticalScrollIndicator={false}
          >
            {renderProjectionPreview()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <QuickActionsDrawer
        title={t('mortgage.add')}
        visible={addDrawerVisible}
        loan={loan}
        activeDeal={activeDeal}
        draftDeal={draftDeal}
        canPlanNextDeal={canPlanNextDeal}
        isFutureStart={isFutureStart}
        mode="add"
        onClose={() => setAddDrawerVisible(false)}
        onNavigate={navigateFromActions}
        onNewCalculation={goToNewCalculation}
      />
      <QuickActionsDrawer
        title={t('common.more')}
        visible={actionDrawerVisible}
        loan={loan}
        activeDeal={activeDeal}
        draftDeal={draftDeal}
        canPlanNextDeal={canPlanNextDeal}
        isFutureStart={isFutureStart}
        mode="more"
        onClose={() => setActionDrawerVisible(false)}
        onNavigate={navigateFromActions}
        onNewCalculation={goToNewCalculation}
      />
      <ChartHelpDrawer
        visible={chartHelp !== null}
        content={chartHelpContent}
        closeLabel={t('common.close')}
        onClose={closeChartHelp}
      />
    </ScrollView>
    </GestureDetector>
  );
};

const FullscreenIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 10L21 3M21 3H16.5M21 3V7.5M10 14L3 21M3 21H7.5M3 21L3 16.5"
      stroke={colours.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const getRemainingTermCaptionKey = (monthsRemaining: number) => {
  if (monthsRemaining <= 0) return 'mortgage.remainingTermComplete';
  const years = Math.floor(monthsRemaining / 12);
  const months = monthsRemaining % 12;

  if (years > 0 && months > 0) return 'mortgage.remainingTermYearsMonths';
  if (years > 0) return 'mortgage.remainingTermYears';
  return 'mortgage.remainingTermMonths';
};

const getRemainingTermValues = (monthsRemaining: number) => ({
  years: Math.floor(Math.max(monthsRemaining, 0) / 12),
  months: Math.max(monthsRemaining, 0) % 12,
});

const formatRate = (value: number) => `${Number.isFinite(value) ? value : 0}%`;

const getBalanceSource = (
  metadata: BalanceSourceMetadata,
  locale: string,
  t: ReturnType<typeof useTranslation>['t'],
) => {
  if (metadata.kind === 'estimate') return t('mortgage.sourceCurrentStateProjection');
  if (metadata.kind === 'completed' && metadata.completedAt) {
    return t('mortgage.sourceCompletedDeal', { date: formatFriendlyDate(metadata.completedAt, locale) });
  }
  if (metadata.checkpoint) {
    const date = formatFriendlyDate(metadata.checkpoint.date, locale);
    if (metadata.kind === 'bankToday') return t('mortgage.sourceBankCheckedToday');
    if (metadata.kind === 'bankRecent') return t('mortgage.sourceProjectedFromBankCheckpoint', { date });
    if (metadata.kind === 'bankOlder') return t('mortgage.sourceProjectedFromOlderBankCheckpoint', { date });
    if (metadata.kind === 'bankStale') return t('mortgage.sourceProjectedFromStaleBankCheckpoint', { date });
  }

  return t('mortgage.sourceProjectedFromCurrentDeal');
};

const getSummaryMetrics = (summary: LoanInsightSummary): LoanInsightMetric[] => {
  const candidates = [summary.hero, ...summary.metrics];
  const seenKeys = new Set<string>();

  return SUMMARY_METRIC_KEYS
    .map(key => candidates.find(metric => metric.labelKey === key))
    .filter((metric): metric is LoanInsightMetric => {
      if (!metric || seenKeys.has(metric.labelKey)) return false;
      seenKeys.add(metric.labelKey);
      return true;
    });
};

const MortgageSummaryPanel = ({
  loan,
  summary,
  dashboardProgress,
  lender,
  currentDeal,
  publishedDeals,
  projection,
  asOf,
  isFutureStart,
  overpaymentDeal,
  onTogglePinned,
  onAddDeal,
  onOpenTimeline,
}: {
  loan: SavedLoan;
  summary: LoanInsightSummary;
  dashboardProgress: LoanDashboardProgress[];
  lender?: string;
  currentDeal?: LoanDeal;
  publishedDeals: LoanDeal[];
  projection: MortgageProjection;
  asOf: Date;
  isFutureStart: boolean;
  overpaymentDeal?: LoanDeal;
  onTogglePinned: () => void;
  onAddDeal: () => void;
  onOpenTimeline: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.mortgageSummaryPanel}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryHeaderCopy}>
          <Text
            style={styles.summaryTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {loan.nickname}
          </Text>
          <Text style={styles.summarySubtitle} numberOfLines={1}>
            {lender || t('saved.category.mortgage')}
          </Text>
        </View>
        <DashboardPinButton
          pinned={loan.pinnedToDashboard}
          onPress={onTogglePinned}
          style={styles.summaryPinButton}
        />
      </View>

      {isFutureStart && currentDeal ? (
        <FutureStartPanel loan={loan} deal={currentDeal} />
      ) : (
        <>
          <DashboardProgressGauge progress={dashboardProgress} />
          <MortgageSummaryMetrics summary={summary} progress={dashboardProgress} />
          <CurrentDealSavingsCard loan={loan} currentDeal={overpaymentDeal} />
        </>
      )}
      <CurrentDealSummaryPanel loan={loan} currentDeal={currentDeal} asOf={asOf} />
      {!isFutureStart ? (
        <CompactTimelineSummary
          loan={loan}
          currentDeal={currentDeal}
          publishedDeals={publishedDeals}
          projection={projection}
          onAddDeal={onAddDeal}
          onOpenTimeline={onOpenTimeline}
        />
      ) : null}
    </View>
  );
};

const FutureStartPanel = ({ loan, deal }: { loan: SavedLoan; deal: LoanDeal }) => {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.summaryRaisedPanel}>
      <View style={styles.summaryMetricRow}>
        <Text style={styles.summaryMetricLabel}>{t('mortgage.futureStartsOn')}</Text>
        <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatFriendlyDate(deal.startDate, i18n.language)}
        </Text>
      </View>
      <View style={styles.summaryMetricRow}>
        <Text style={styles.summaryMetricLabel}>{t('mortgage.startingBalance')}</Text>
        <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(deal.openingBalance, loan.currency)}
        </Text>
      </View>
      <AppText variant="bodySm" tone="muted" style={styles.futureStartHelp}>
        {t('mortgage.futureStartHelp')}
      </AppText>
    </View>
  );
};

const MortgageSummaryMetrics = ({
  summary,
  progress,
}: {
  summary: LoanInsightSummary;
  progress: LoanDashboardProgress[];
}) => {
  const { t } = useTranslation();
  const metrics = getSummaryMetrics(summary);
  const timeProgress = progress.find(item => item.labelKey === 'mortgage.timeProgress');
  const elapsedMonths = Number(timeProgress?.caption.values?.elapsed ?? 0);
  const totalMonths = Number(timeProgress?.caption.values?.total ?? 0);
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
  const remainingTermCaptionKey = getRemainingTermCaptionKey(remainingMonths);
  const remainingTermValues = getRemainingTermValues(remainingMonths);

  return (
    <View style={styles.summaryRaisedPanel}>
      {metrics.map((metric, index) => (
        <View
          key={`${metric.labelKey}-${index}`}
          style={styles.summaryMetricRow}
        >
          <Text style={styles.summaryMetricLabel} numberOfLines={1}>
            {t(metric.labelKey)}
          </Text>
          <Text style={styles.summaryMetricValue} numberOfLines={1} adjustsFontSizeToFit>
            {metric.value}
          </Text>
          {metric.labelKey === 'results.payoffDate' && totalMonths > 0 ? (
            <Text style={styles.summaryMetricHelper} numberOfLines={1}>
              {t(remainingTermCaptionKey, remainingTermValues)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const SummaryFact = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.summaryFact}>
    <Text style={styles.summaryFactLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.summaryFactValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

// Overpayment savings highlight, surfaced right under the key-metrics box so the
// value the app exists to show isn't buried among the current-deal facts.
const CurrentDealSavingsCard = ({
  loan,
  currentDeal,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const impact = useMemo(
    () => (currentDeal ? getDealOverpaymentImpact(currentDeal, loan.events) : undefined),
    [currentDeal, loan.events],
  );
  const destination = currentDeal ? `/saved/${loan.id}/deals/${currentDeal.id}/overpayments` as const : undefined;

  if (!currentDeal || !destination) return null;

  if (impact?.hasOverpayments) {
    return (
      <Card style={[styles.soonerCardActive, styles.summarySavingsCard]}>
        <View style={styles.soonerCardHeader}>
          <CoinsStackedIcon size={18} color={colours.secondary} strokeWidth={1.8} />
          <AppText variant="labelMd" tone="success" style={styles.soonerCardTitle}>
            {t('mortgage.dealOverpaymentsSummary')}
          </AppText>
        </View>
        <View style={styles.soonerSavingsRow}>
          <View style={styles.soonerMetric}>
            <AppText variant="bodySm" tone="muted">{t('mortgage.dealInterestSavedLabel')}</AppText>
            <AppText variant="labelMd" style={{ color: colours.secondary }}>
              {formatCurrency(impact.interestSaved, loan.currency)}
            </AppText>
          </View>
          <View style={styles.soonerMetric}>
            <AppText variant="bodySm" tone="muted">{t('mortgage.dealExtraRepaidLabel')}</AppText>
            <AppText variant="labelMd" style={{ color: colours.secondary }}>
              {formatCurrency(impact.extraPrincipalRepaid, loan.currency)}
            </AppText>
          </View>
        </View>
        <TouchableOpacity
          style={styles.soonerManageRow}
          onPress={() => router.push(destination)}
          activeOpacity={0.84}
          accessibilityRole="button"
        >
          <AppText variant="labelMd" style={{ color: colours.secondary, flex: 1 }}>{t('mortgage.manageDealOverpayments')}</AppText>
          <ChevronRightIcon size={14} color={colours.secondary} />
        </TouchableOpacity>
      </Card>
    );
  }

  if (currentDeal.status === 'completed') return null;

  return (
    <View style={[styles.soonerNudgeCard, styles.summarySavingsCard]}>
      <View style={styles.soonerNudgeInner}>
        <CoinsStackedIcon size={20} color={colours.primary} strokeWidth={1.8} />
        <View style={styles.soonerNudgeCopy}>
          <AppText variant="labelMd">{t('mortgage.couldPaySoonerTitle')}</AppText>
          <AppText variant="bodySm" tone="muted">{t('mortgage.couldPaySoonerBody')}</AppText>
        </View>
      </View>
      <Button
        label={t('mortgage.setUpDealOverpayment')}
        onPress={() => router.push(destination)}
        variant="secondary"
      />
    </View>
  );
};

const CurrentDealSummaryPanel = ({
  loan,
  currentDeal,
  asOf,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
  asOf: Date;
}) => {
  const { t, i18n } = useTranslation();
  const balanceSourceMetadata = getBalanceSourceMetadata(currentDeal, loan.events, asOf);
  const balanceSource = getBalanceSource(balanceSourceMetadata, i18n.language, t);
  const reconciliationMessage = getReconciliationMessage(
    balanceSourceMetadata.checkpoint?.reconciliationVariance,
    loan.currency,
    t,
  );

  if (!currentDeal) {
    return (
      <View style={styles.summaryRaisedPanel}>
        <View style={styles.summarySectionHeader}>
          <View style={styles.summarySectionCopy}>
            <Text style={styles.summarySectionKicker}>{t('mortgage.currentDeal')}</Text>
            <Text style={styles.summarySectionTitle} numberOfLines={2}>
              {t('mortgage.savedMortgageEstimate')}
            </Text>
          </View>
        </View>
        <Text style={styles.summaryBodyText}>
          {t('mortgage.currentStateProjectionBody')}
        </Text>
        <View style={styles.summaryFactGrid}>
          <SummaryFact label={t('calculator.interestRate')} value={formatRate(loan.formSnapshot.interest)} />
          <SummaryFact label={t('results.monthlyPayment')} value={formatCurrency(loan.resultSnapshot.monthlyPayments, loan.currency)} />
          <SummaryFact label={t('calculator.additionalPayment')} value={formatCurrency(loan.formSnapshot.additionalMonthlyPayment ?? 0, loan.currency)} />
        </View>
        <View style={styles.summarySourceRow}>
          <Text style={styles.summarySourceLabel}>{t('mortgage.balanceSource')}</Text>
          <Text style={styles.summarySourceValue} numberOfLines={1} adjustsFontSizeToFit>
            {balanceSource}
          </Text>
        </View>
        {reconciliationMessage ? (
          <ReconciliationSummary
            message={reconciliationMessage}
            hasVariance={Math.abs(balanceSourceMetadata.checkpoint?.reconciliationVariance ?? 0) >= 1}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.summaryRaisedPanel}>
      <View style={styles.summarySectionHeader}>
        <View style={styles.summarySectionCopy}>
          <Text style={styles.summarySectionKicker}>{t('mortgage.currentDeal')}</Text>
          <Text style={styles.summarySectionTitle} numberOfLines={2}>
            {currentDeal.name}
          </Text>
          <Text style={styles.summarySectionMeta} numberOfLines={1}>
            {formatFriendlyDateRange(currentDeal.startDate, currentDeal.endDate, i18n.language)}
          </Text>
        </View>
      </View>
      <View style={styles.summaryFactGrid}>
        <SummaryFact
          label={t('calculator.lender')}
          value={currentDeal.lender || loan.lender || t('saved.category.mortgage')}
        />
        <SummaryFact label={t('calculator.interestRate')} value={formatRate(currentDeal.interestRate)} />
        <SummaryFact label={t('results.monthlyPayment')} value={formatCurrency(currentDeal.monthlyPayment, loan.currency)} />
        <SummaryFact label={t('mortgage.currentDealEnds')} value={formatFriendlyDate(currentDeal.endDate, i18n.language)} />
        <SummaryFact label={t('calculator.additionalPayment')} value={formatCurrency(currentDeal.regularOverpayment, loan.currency)} />
      </View>
      <View style={styles.summarySourceRow}>
        <Text style={styles.summarySourceLabel}>{t('mortgage.balanceSource')}</Text>
        <Text style={styles.summarySourceValue} numberOfLines={1} adjustsFontSizeToFit>
          {balanceSource}
        </Text>
      </View>
      {reconciliationMessage ? (
        <ReconciliationSummary
          message={reconciliationMessage}
          hasVariance={Math.abs(balanceSourceMetadata.checkpoint?.reconciliationVariance ?? 0) >= 1}
        />
      ) : null}
    </View>
  );
};

const ReconciliationSummary = ({
  message,
  hasVariance,
}: {
  message: string;
  hasVariance: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.reconciliationBox}>
      <Text style={styles.reconciliationText}>{message}</Text>
      {hasVariance ? (
        <Text style={styles.reconciliationHelp}>{t('mortgage.reconciliationSavingsCaution')}</Text>
      ) : null}
    </View>
  );
};

const CompactTimelineSummary = ({
  loan,
  currentDeal,
  publishedDeals,
  projection,
  onAddDeal,
  onOpenTimeline,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
  publishedDeals: LoanDeal[];
  projection: MortgageProjection;
  onAddDeal: () => void;
  onOpenTimeline: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const firstDeal = publishedDeals[0];
  const actionLabel = firstDeal
    ? t('mortgage.addDeal')
    : t('mortgage.addCurrentDeal');
  const items: Array<{
    key: string;
    marker: 'future' | 'current' | 'start';
    label: string;
    title: string;
    meta: string;
  }> = [
    {
      key: 'saved-start',
      marker: 'start',
      label: t('mortgage.timelineStart'),
      title: formatFriendlyDate(firstDeal?.startDate ?? loan.formSnapshot.startDate, i18n.language),
      meta: formatCurrency(projection.openingBalance, loan.currency),
    },
  ];
  items.push(
    {
      key: currentDeal ? `current-${currentDeal.id}` : 'current-estimate',
      marker: 'current' as const,
      label: currentDeal ? t('mortgage.currentDeal') : t('mortgage.currentEstimate'),
      title: currentDeal?.name ?? t('mortgage.currentBalance'),
      meta: currentDeal
        ? `${formatCurrency(projection.currentBalance, loan.currency)} · ${formatRate(currentDeal.interestRate)} · ${formatDealDuration(currentDeal, i18n.language)}`
        : `${formatCurrency(projection.currentBalance, loan.currency)} · ${formatRate(loan.formSnapshot.interest)}`,
    },
    {
      key: 'projected-end',
      marker: 'future',
      label: t('mortgage.projectedEnd'),
      title: projection.projectedEndDate
        ? formatFriendlyDate(projection.projectedEndDate, i18n.language)
        : t('results.payoffDate'),
      meta: t('mortgage.includedEstimate'),
    },
  );

  return (
    <View style={styles.summaryRaisedPanel}>
      <View style={styles.summarySectionHeader}>
        <View style={styles.summarySectionCopy}>
          <Text style={styles.summarySectionKicker}>{t('mortgage.timeline')}</Text>
          <Text style={styles.summarySectionTitle}>{t('mortgage.dealTimeline')}</Text>
        </View>
        {actionLabel ? (
          <Button
            label={actionLabel}
            leftIcon={<PlusIcon color={colours.primaryInk} size={18} />}
            onPress={onAddDeal}
            variant="icon-pill"
            style={styles.summaryTimelineAction}
          />
        ) : null}
      </View>
      {!firstDeal ? (
        <Text style={styles.summaryBodyText}>
          {t('mortgage.noDealChangesBody')}
        </Text>
      ) : null}
      <View style={styles.summaryTimelineList}>
        <View style={styles.summaryTimelineRail} />
        {items.map(item => (
          <TouchableOpacity
            key={item.key}
            style={styles.summaryTimelineRow}
            onPress={onOpenTimeline}
            activeOpacity={0.84}
            accessibilityRole="button"
          >
            <View
              style={[
                styles.summaryTimelineNode,
                item.marker === 'future' && styles.futurePreviewNode,
                item.marker === 'current' && styles.currentPreviewNode,
                item.marker === 'start' && styles.startPreviewNode,
              ]}
            />
            <View style={styles.summaryTimelineCopy}>
              <Text style={styles.summaryTimelineLabel}>{item.label}</Text>
              <Text style={styles.summaryTimelineTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.summaryTimelineMeta} numberOfLines={1}>{item.meta}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.viewTimelineLink}
        onPress={onOpenTimeline}
        activeOpacity={0.84}
        accessibilityRole="button"
      >
        <Text style={styles.viewTimelineLinkText}>{t('mortgage.viewTimeline')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const MortgageQuickActionsRow = ({
  hasActiveDeal,
  onViewDeal,
  onNewCalculation,
  onAdd,
  onMore,
}: {
  hasActiveDeal: boolean;
  onViewDeal: () => void;
  onNewCalculation: () => void;
  onAdd: () => void;
  onMore: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.quickActionsCard}>
      <View style={styles.quickActionsHeader}>
        <Text style={styles.quickActionsTitle}>{t('mortgage.quickActions')}</Text>
        <Text style={styles.quickActionsHelper}>{t('mortgage.quickActionsHelp')}</Text>
      </View>
      <View style={styles.quickActionsRow}>
        {hasActiveDeal ? (
          <SummaryQuickAction
            label={t('mortgage.viewDeal')}
            icon={<EyeIcon size={21} color={colours.primary} strokeWidth={1.9} />}
            onPress={onViewDeal}
          />
        ) : (
          <SummaryQuickAction
            label={t('results.newCalculation')}
            icon={<AddDocumentIcon size={21} color={colours.primary} strokeWidth={1.9} />}
            onPress={onNewCalculation}
          />
        )}
        <SummaryQuickAction
          label={t('mortgage.add')}
          icon={<PlusIcon size={21} color={colours.primary} />}
          onPress={onAdd}
        />
        <SummaryQuickAction
          label={t('common.more')}
          icon={<MoreIcon size={21} color={colours.primary} />}
          onPress={onMore}
        />
      </View>
    </View>
  );
};

const SummaryQuickAction = ({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.quickActionButton}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={styles.quickActionIcon}>
      {icon}
    </View>
    <Text style={styles.quickActionLabel} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

const ProjectionBasisCard = ({
  currentDeal,
}: {
  currentDeal?: LoanDeal;
}) => {
  const { t } = useTranslation();

  return (
    <Card style={styles.projectionBasisCard}>
      <View style={styles.contextHeader}>
        <View style={styles.contextHeaderCopy}>
          <Text style={styles.contextKicker}>{t('mortgage.projectionBasis')}</Text>
          <Text style={styles.contextTitle} numberOfLines={2}>
            {t('mortgage.overallMortgageProjection')}
          </Text>
        </View>
      </View>
      <Text style={styles.projectionAssumptionText}>
        {currentDeal
          ? t('mortgage.overallMortgageProjectionBody')
          : t('mortgage.currentStateProjectionBody')}
      </Text>
    </Card>
  );
};

const ProjectionChartCard = ({
  title,
  accessibilityLabel,
  helpAccessibilityLabel,
  onPress,
  onHelpPress,
  children,
}: {
  title: string;
  accessibilityLabel: string;
  helpAccessibilityLabel: string;
  onPress: () => void;
  onHelpPress: () => void;
  children: React.ReactNode;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [pressed && styles.previewPressed]}
  >
    <Card style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <AppText variant="title3" style={styles.previewTitle}>{title}</AppText>
        <View style={styles.chartActions}>
          <ChartHelpButton
            accessibilityLabel={helpAccessibilityLabel}
            onPress={onHelpPress}
          />
          <FullscreenIcon />
        </View>
      </View>
      {children}
    </Card>
  </Pressable>
);

const ProjectionSkeletonCard = ({
  title,
  schedule,
}: {
  title: string;
  schedule?: boolean;
}) => (
  <Card style={[styles.chartCard, schedule && styles.scheduleCard]}>
    <View style={styles.chartHeader}>
      <AppText variant="title3">{title}</AppText>
      <View style={styles.fullscreenIconPlaceholder} />
    </View>
    {schedule ? (
      <View style={styles.scheduleSkeleton}>
        <View style={[styles.skeletonLine, styles.skeletonLineFull]} />
        <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
        <View style={[styles.skeletonLine, styles.skeletonLineFull]} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    ) : (
      <View style={styles.chartSkeleton}>
        <View style={styles.skeletonRule} />
        <View style={[styles.skeletonBar, styles.skeletonBarTall]} />
        <View style={[styles.skeletonBar, styles.skeletonBarMedium]} />
        <View style={[styles.skeletonBar, styles.skeletonBarShort]} />
        <View style={[styles.skeletonBar, styles.skeletonBarMediumTall]} />
      </View>
    )}
  </Card>
);

const QuickActionsDrawer = ({
  title,
  visible,
  loan,
  activeDeal,
  draftDeal,
  canPlanNextDeal,
  isFutureStart,
  mode,
  onClose,
  onNavigate,
  onNewCalculation,
}: {
  title: string;
  visible: boolean;
  loan: SavedLoan;
  activeDeal?: LoanDeal;
  draftDeal?: LoanDeal;
  canPlanNextDeal: boolean;
  isFutureStart: boolean;
  mode: 'add' | 'more';
  onClose: () => void;
  onNavigate: (href: string) => void;
  onNewCalculation: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable style={styles.drawer}>
          <View style={styles.drawerHandle} />
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.84}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.drawerOptionList}>
            {mode === 'add' && activeDeal && !isFutureStart ? (
              <>
                <Text style={styles.drawerGroupTitle}>{t('mortgage.eventGroup')}</Text>
                <QuickActionOption
                  title={t('mortgage.addOverpayment')}
                  description={t('mortgage.addOverpaymentHelp')}
                  icon={<CoinsStackedIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                  onPress={() => onNavigate(`/saved/${loan.id}/deals/${activeDeal.id}/overpayments`)}
                />
                <QuickActionOption
                  title={t('mortgage.recordBalance')}
                  description={t('mortgage.recordBalanceHelp')}
                  icon={<ShieldTickIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                  onPress={() => onNavigate(`/saved/${loan.id}/events/new?type=balanceCheckpoint`)}
                />
                <QuickActionOption
                  title={t('mortgage.addNote')}
                  description={t('mortgage.addNoteHelp')}
                  icon={<MessageTextCircleIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                  onPress={() => onNavigate(`/saved/${loan.id}/events/new?type=note`)}
                />
                <QuickActionOption
                  title={t('mortgage.eventMissedPayment')}
                  description={t('mortgage.missedPaymentHelp')}
                  icon={<AlertTriangleIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                  onPress={() => onNavigate(`/saved/${loan.id}/events/new?type=missedPayment`)}
                />
                <QuickActionOption
                  title={t('mortgage.eventPaymentHoliday')}
                  description={t('mortgage.paymentHolidayHelp')}
                  icon={<ClockCheckIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                  onPress={() => onNavigate(`/saved/${loan.id}/events/new?type=paymentHoliday`)}
                />
              </>
            ) : null}
            {mode === 'add' && !activeDeal ? (
              <>
                <Text style={styles.drawerGroupTitle}>{t('mortgage.dealGroup')}</Text>
                <QuickActionOption
                  title={t('mortgage.addDeal')}
                  description={t('mortgage.addNextDealHelp')}
                  icon={<CalendarDateIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                  onPress={() => onNavigate(`/saved/${loan.id}/deals/new`)}
                />
              </>
            ) : null}
            {mode === 'more' ? (
              <>
                <Text style={styles.drawerGroupTitle}>{t('mortgage.dealGroup')}</Text>
                {canPlanNextDeal ? (
                  <QuickActionOption
                    title={t('mortgage.addNextDeal')}
                    description={t('mortgage.addNextDealHelp')}
                    icon={<CalendarDateIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                    onPress={() => onNavigate(`/saved/${loan.id}/deals/new`)}
                  />
                ) : null}
                {draftDeal ? (
                  <QuickActionOption
                    title={t('mortgage.editDraftDeal')}
                    description={t('mortgage.editDraftDealHelp')}
                    icon={<UiEditIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                    onPress={() => onNavigate(`/saved/${loan.id}/deals/${draftDeal.id}`)}
                  />
                ) : null}
                {activeDeal?.status === 'active' && !isFutureStart ? (
                  <QuickActionOption
                    title={t('mortgage.completeCurrentDeal')}
                    description={t('mortgage.completeCurrentDealHelp')}
                    icon={<ClockCheckIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                    onPress={() => onNavigate(`/saved/${loan.id}/complete-current`)}
                  />
                ) : null}
                <QuickActionOption
                  title={t('results.newCalculation')}
                  description={t('mortgage.newCalculationHelp')}
                  icon={<AddDocumentIcon size={20} color={colours.primary} strokeWidth={1.9} />}
                  onPress={onNewCalculation}
                />
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const QuickActionOption = ({
  title,
  description,
  icon,
  destructive,
  onPress,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.drawerOptionRow} onPress={onPress} activeOpacity={0.84}>
    <View style={[styles.drawerOptionIcon, destructive && styles.drawerOptionIconDanger]}>
      {icon}
    </View>
    <View style={styles.drawerOptionCopy}>
      <Text style={[styles.drawerOptionTitle, destructive && styles.drawerOptionTitleDanger]}>{title}</Text>
      <Text style={[styles.drawerOptionDescription, destructive && styles.drawerOptionTitleDanger]}>
        {description}
      </Text>
    </View>
  </TouchableOpacity>
);
