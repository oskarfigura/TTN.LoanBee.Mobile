import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AmortisationTable } from '@/components/calculator/AmortisationTable';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
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
  MortgageProjectionDealSegment,
} from '@/mortgage/projection';
import {
  CURRENT_STATE_PROJECTION_DEAL_ID,
  formatDealDuration,
  getCurrentDeal,
  getDealOverpaymentImpact,
  getMortgageTrackerSummary,
  getPublishedDeals,
} from '@/mortgage/tracker';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { LoanDeal, SavedLoan } from '@/types/SavedLoan';
import { colours, elevation, fontFaces, fontSizes, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate, formatFriendlyDateRange } from '@/utils/date';

type MortgageDetailTab = 'overview' | 'projection' | 'timeline';
type ProjectionPreview = 'repayment' | 'cumulative' | 'schedule';

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
  const isProjectionPreviewOpen = projectionPreview !== null;
  const asOf = useMemo(() => new Date(), [loan]);
  const result = useMemo(() => getResultForSavedLoan(loan), [loan]);
  const projection = useMemo(() => buildMortgageProjection(loan, asOf), [asOf, loan]);
  const trackerSummary = useMemo(() => getMortgageTrackerSummary(loan, asOf), [asOf, loan]);
  const displayDetails = useMemo(() => buildSavedLoanDisplayDetails(loan, asOf), [asOf, loan]);
  const insightSummary = useMemo(() => (
    buildSavedLoanSummary(loan, result, asOf, i18n.language)
  ), [asOf, i18n.language, loan, result]);
  const dashboardProgress = useMemo(() => (
    buildSavedLoanDashboardProgress(loan, result, asOf)
  ), [asOf, loan, result]);
  const tabs: Array<{ value: MortgageDetailTab; label: string }> = [
    { value: 'overview', label: t('mortgage.overview') },
    { value: 'projection', label: t('mortgage.projection') },
    { value: 'timeline', label: t('mortgage.timeline') },
  ];
  const currentDeal = trackerSummary.currentDeal;
  const activeDeal = getCurrentDeal(loan, asOf);
  const publishedDeals = getPublishedDeals(loan);
  const draftDeal = trackerSummary.nextDraftDeal;
  const canPlanNextDeal = !draftDeal;
  const overpaymentDeal = activeDeal ?? publishedDeals[publishedDeals.length - 1];
  const switchTab = useCallback((nextTab: MortgageDetailTab) => {
    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, []);

  const tabOrder: MortgageDetailTab[] = ['overview', 'projection', 'timeline'];
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
    router.push({ pathname: '/' as never, params: { calculator: '1' } });
  };
  const openProjectionPreview = useCallback((preview: ProjectionPreview) => {
    setProjectionPreview(preview);
    ScreenOrientation.unlockAsync().catch(() => undefined);
  }, []);
  const closeProjectionPreview = useCallback(() => {
    setProjectionPreview(null);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);
  const getProjectionPreviewTitle = () => {
    if (projectionPreview === 'repayment') return t('results.repaymentBreakdown');
    if (projectionPreview === 'cumulative') return t('results.cumulativePayments');
    return t('mortgage.trackedSchedule');
  };
  const renderProjectionPreview = () => {
    if (projectionPreview === 'repayment') {
      return (
        <>
          <RepaymentBarChart
            monthlyArray={projection.loanChartMonthlyArray}
            interestArray={projection.loanChartInterestArray}
            currency={loan.currency}
            height={320}
          />
          <DealSegmentStrip segments={projection.dealSegments} />
        </>
      );
    }

    if (projectionPreview === 'cumulative') {
      return (
        <>
          <CumulativeAreaChart
            monthlyArray={projection.loanChartMonthlyArray}
            interestArray={projection.loanChartInterestArray}
            remainingArray={projection.loanChartRemainingArray}
            currency={loan.currency}
            height={320}
          />
          <DealSegmentStrip segments={projection.dealSegments} />
        </>
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
            draftDeal={draftDeal}
            publishedDeals={publishedDeals}
            projection={projection}
            onTogglePinned={onTogglePinned}
            onAddDeal={() => router.push(`/saved/${loan.id}/deals/new`)}
            onEditDraft={() => {
              if (draftDeal) router.push(`/saved/${loan.id}/deals/${draftDeal.id}`);
            }}
            onOpenTimeline={() => switchTab('timeline')}
          />

          {overpaymentDeal ? (
            <DealOverpaymentsCard loan={loan} deal={overpaymentDeal} />
          ) : null}

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
            loan={loan}
            projection={projection}
            currentDeal={currentDeal}
            draftDeal={draftDeal}
          />
          <Pressable
            onPress={() => openProjectionPreview('repayment')}
            accessibilityRole="button"
            accessibilityLabel={`${t('results.repaymentBreakdown')} ${t('results.fullScreen')}`}
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <AppText variant="title3">{t('results.repaymentBreakdown')}</AppText>
                <FullscreenIcon />
              </View>
              <RepaymentBarChart
                monthlyArray={projection.loanChartMonthlyArray}
                interestArray={projection.loanChartInterestArray}
                currency={loan.currency}
              />
              <DealSegmentStrip segments={projection.dealSegments} />
            </Card>
          </Pressable>
          <Pressable
            onPress={() => openProjectionPreview('cumulative')}
            accessibilityRole="button"
            accessibilityLabel={`${t('results.cumulativePayments')} ${t('results.fullScreen')}`}
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <AppText variant="title3">{t('results.cumulativePayments')}</AppText>
                <FullscreenIcon />
              </View>
              <CumulativeAreaChart
                monthlyArray={projection.loanChartMonthlyArray}
                interestArray={projection.loanChartInterestArray}
                remainingArray={projection.loanChartRemainingArray}
                currency={loan.currency}
              />
              <DealSegmentStrip segments={projection.dealSegments} />
            </Card>
          </Pressable>
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
        mode="more"
        onClose={() => setActionDrawerVisible(false)}
        onNavigate={navigateFromActions}
        onNewCalculation={goToNewCalculation}
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
  loan: SavedLoan,
  currentDeal: LoanDeal | undefined,
  locale: string,
  t: ReturnType<typeof useTranslation>['t'],
) => {
  if (!currentDeal) {
    return t('mortgage.sourceCurrentStateProjection');
  }

  const latestCheckpoint = [...loan.events]
    .filter(event => event.type === 'balanceCheckpoint' && event.dealId === currentDeal.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (latestCheckpoint) {
    return t('mortgage.sourceBankCheckpoint', { date: formatFriendlyDate(latestCheckpoint.date, locale) });
  }

  if (currentDeal?.status === 'completed' && currentDeal.completion) {
    return t('mortgage.sourceCompletedDeal', { date: formatFriendlyDate(currentDeal.completion.completedAt, locale) });
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
  draftDeal,
  publishedDeals,
  projection,
  onTogglePinned,
  onAddDeal,
  onEditDraft,
  onOpenTimeline,
}: {
  loan: SavedLoan;
  summary: LoanInsightSummary;
  dashboardProgress: LoanDashboardProgress[];
  lender?: string;
  currentDeal?: LoanDeal;
  draftDeal?: LoanDeal;
  publishedDeals: LoanDeal[];
  projection: MortgageProjection;
  onTogglePinned: () => void;
  onAddDeal: () => void;
  onEditDraft: () => void;
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

      <DashboardProgressGauge progress={dashboardProgress} />
      <MortgageSummaryMetrics summary={summary} progress={dashboardProgress} />
      <CurrentDealSummaryPanel loan={loan} currentDeal={currentDeal} />
      <CompactTimelineSummary
        loan={loan}
        currentDeal={currentDeal}
        draftDeal={draftDeal}
        publishedDeals={publishedDeals}
        projection={projection}
        onAddDeal={onAddDeal}
        onEditDraft={onEditDraft}
        onOpenTimeline={onOpenTimeline}
      />
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

const CurrentDealSummaryPanel = ({
  loan,
  currentDeal,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
}) => {
  const { t, i18n } = useTranslation();
  const balanceSource = getBalanceSource(loan, currentDeal, i18n.language, t);
  const dealImpact = useMemo(
    () => currentDeal ? getDealOverpaymentImpact(currentDeal, loan.events) : undefined,
    [currentDeal, loan.events],
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
        {dealImpact?.hasOverpayments ? (
          <SummaryFact label={t('mortgage.dealInterestSavedLabel')} value={formatCurrency(dealImpact.interestSaved, loan.currency)} />
        ) : null}
      </View>
      <View style={styles.summarySourceRow}>
        <Text style={styles.summarySourceLabel}>{t('mortgage.balanceSource')}</Text>
        <Text style={styles.summarySourceValue} numberOfLines={1} adjustsFontSizeToFit>
          {balanceSource}
        </Text>
      </View>
    </View>
  );
};

const CompactTimelineSummary = ({
  loan,
  currentDeal,
  draftDeal,
  publishedDeals,
  projection,
  onAddDeal,
  onEditDraft,
  onOpenTimeline,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
  draftDeal?: LoanDeal;
  publishedDeals: LoanDeal[];
  projection: MortgageProjection;
  onAddDeal: () => void;
  onEditDraft: () => void;
  onOpenTimeline: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const firstDeal = publishedDeals[0];
  const actionLabel = draftDeal
    ? t('mortgage.editDraftDeal')
    : firstDeal
      ? t('mortgage.addDeal')
      : t('mortgage.addCurrentDeal');
  const actionHandler = draftDeal ? onEditDraft : onAddDeal;
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
            onPress={actionHandler}
            variant="icon-pill"
            style={styles.summaryTimelineAction}
          />
        ) : null}
      </View>
      {!firstDeal && !draftDeal ? (
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
      {draftDeal ? (
        <View style={styles.draftExcludedNote}>
          <Text style={styles.draftExcludedTitle}>{t('mortgage.draftExcludedFromEstimate')}</Text>
          <Text style={styles.draftExcludedText}>
            {t('mortgage.draftExcludedFromEstimateBody', { name: draftDeal.name })}
          </Text>
        </View>
      ) : null}
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

const ContextMetric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.contextMetric}>
    <Text style={styles.contextMetricLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.contextMetricValue} numberOfLines={2} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const DealOverpaymentsCard = ({
  loan,
  deal,
}: {
  loan: SavedLoan;
  deal: LoanDeal;
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  const hasRegular = deal.regularOverpayment > 0;
  const hasLumps = loan.events.some(
    e => e.type === 'lumpOverpayment' && e.dealId === deal.id,
  );
  const hasOverpayments = hasRegular || hasLumps;

  const impact = useMemo(
    () => hasOverpayments ? getDealOverpaymentImpact(deal, loan.events) : null,
    [deal, hasOverpayments, loan.events],
  );

  const destination = `/saved/${loan.id}/deals/${deal.id}/overpayments` as const;

  if (hasOverpayments && impact) {
    return (
      <Card style={styles.soonerCardActive}>
        <View style={styles.soonerCardHeader}>
          <CoinsStackedIcon size={18} color={colours.secondary} strokeWidth={1.8} />
          <AppText variant="labelMd" tone="success" style={styles.soonerCardTitle}>
            {t('mortgage.dealOverpaymentsSummary')}
          </AppText>
        </View>
        <View style={styles.soonerSavingsRow}>
          <View style={styles.soonerMetric}>
            <AppText variant="bodySm" tone="muted">{t('mortgage.dealInterestSavedLabel')}</AppText>
            <AppText variant="labelMd" style={{ color: colours.secondary }}>{formatCurrency(impact.interestSaved, loan.currency)}</AppText>
          </View>
          <View style={styles.soonerMetric}>
            <AppText variant="bodySm" tone="muted">{t('mortgage.dealExtraRepaidLabel')}</AppText>
            <AppText variant="labelMd" style={{ color: colours.secondary }}>{formatCurrency(impact.extraPrincipalRepaid, loan.currency)}</AppText>
          </View>
        </View>
        <TouchableOpacity
          style={styles.soonerManageRow}
          onPress={() => router.push(destination)}
          activeOpacity={0.84}
        >
          <AppText variant="labelMd" style={{ color: colours.secondary, flex: 1 }}>{t('mortgage.manageDealOverpayments')}</AppText>
          <ChevronRightIcon size={14} color={colours.secondary} />
        </TouchableOpacity>
      </Card>
    );
  }

  if (deal.status === 'completed') return null;

  return (
    <View style={styles.soonerNudgeCard}>
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

const getSegmentLabelKey = (segment: MortgageProjectionDealSegment) => {
  if (segment.status === 'completed') return 'saved.completed';
  if (segment.isCurrent && segment.projectedPointCount > 0) return 'mortgage.currentProjection';
  if (segment.isCurrent) return 'mortgage.currentDeal';
  return 'mortgage.historicalContext';
};

const DealSegmentStrip = ({
  segments,
}: {
  segments: MortgageProjectionDealSegment[];
}) => {
  const { t, i18n } = useTranslation();
  if (segments.length === 0) return null;
  const visibleSegments = segments.filter(segment => segment.dealId !== CURRENT_STATE_PROJECTION_DEAL_ID);
  if (visibleSegments.length === 0) return null;

  return (
    <View style={styles.segmentStrip}>
      {visibleSegments.map(segment => (
          <View
            key={segment.dealId}
            style={[
              styles.segmentItem,
              segment.isCurrent && styles.segmentItemCurrent,
            ]}
          >
            <View style={[
              styles.segmentDot,
              segment.status === 'completed' && styles.segmentDotCompleted,
              segment.isCurrent && styles.segmentDotCurrent,
            ]} />
            <View style={styles.segmentCopy}>
              <Text style={styles.segmentTitle} numberOfLines={1}>{segment.dealName}</Text>
              <Text style={styles.segmentMeta} numberOfLines={1}>
                {t(getSegmentLabelKey(segment))} · {formatFriendlyDateRange(segment.startDate, segment.endDate, i18n.language)}
              </Text>
            </View>
          </View>
      ))}
    </View>
  );
};

const ProjectionBasisCard = ({
  loan,
  projection,
  currentDeal,
  draftDeal,
}: {
  loan: SavedLoan;
  projection: MortgageProjection;
  currentDeal?: LoanDeal;
  draftDeal?: LoanDeal;
}) => {
  const { t, i18n } = useTranslation();

  return (
    <Card style={styles.projectionBasisCard}>
      <View style={styles.contextHeader}>
        <View style={styles.contextHeaderCopy}>
          <Text style={styles.contextKicker}>{t('mortgage.projectionBasis')}</Text>
          <Text style={styles.contextTitle} numberOfLines={2}>
            {currentDeal ? t('mortgage.currentDealProjectionFrom', { name: currentDeal.name }) : t('mortgage.savedMortgageEstimate')}
          </Text>
        </View>
        {projection.publishedDealCount > 0 ? (
          <View style={styles.contextBadge}>
            <Text style={styles.contextBadgeText}>
              {t('mortgage.publishedDealCount', { count: projection.publishedDealCount })}
            </Text>
          </View>
        ) : null}
      </View>
      {!currentDeal ? (
        <Text style={styles.projectionAssumptionText}>
          {t('mortgage.savedMortgageEstimateBody')}
        </Text>
      ) : null}
      <DealSegmentStrip segments={projection.dealSegments} />
      {draftDeal ? (
        <View style={styles.draftPreview}>
          <View style={styles.draftPreviewHeader}>
            <Text style={styles.contextKicker}>{t('mortgage.draftPreview')}</Text>
            <Text style={styles.draftPreviewBadge}>{t('mortgage.draftExcluded')}</Text>
          </View>
          <Text style={styles.draftPreviewTitle} numberOfLines={2}>{draftDeal.name}</Text>
          <Text style={styles.draftPreviewBody}>
            {t('mortgage.draftPreviewBody')}
          </Text>
          <View style={styles.contextMetricGrid}>
            <ContextMetric label={t('mortgage.dealStartDate')} value={formatFriendlyDate(draftDeal.startDate, i18n.language)} />
            <ContextMetric label={t('calculator.interestRate')} value={`${draftDeal.interestRate}%`} />
            <ContextMetric label={t('mortgage.openingBankBalance')} value={formatCurrency(draftDeal.openingBalance, loan.currency)} />
            <ContextMetric label={t('results.monthlyPayment')} value={formatCurrency(draftDeal.monthlyPayment, loan.currency)} />
          </View>
        </View>
      ) : null}
    </Card>
  );
};

const QuickActionsDrawer = ({
  title,
  visible,
  loan,
  activeDeal,
  draftDeal,
  canPlanNextDeal,
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
            {mode === 'add' && activeDeal ? (
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
                {activeDeal?.status === 'active' ? (
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['3xl'],
  },
  stickyTabs: {
    marginHorizontal: -layout.screenPadding,
    backgroundColor: colours.background,
    zIndex: 2,
    elevation: 2,
  },
  tabControl: {
    marginHorizontal: 0,
  },
  financialDisclaimer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tabPanel: {
    marginTop: spacing.xs,
  },
  mortgageSummaryPanel: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  summaryHeader: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: 44,
    minHeight: 62,
  },
  summaryHeaderCopy: {
    alignItems: 'center',
    minWidth: 0,
  },
  summaryTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    lineHeight: 32,
    color: colours.primary,
    textAlign: 'center',
  },
  summarySubtitle: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
  },
  summaryPinButton: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  summaryRaisedPanel: {
    borderRadius: radii.chip,
    backgroundColor: colours.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    ...elevation.level2,
  },
  summaryMetricRow: {
    minHeight: 66,
    justifyContent: 'center',
  },
  summaryMetricLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  summaryMetricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
    color: colours.primary,
  },
  summaryMetricHelper: {
    ...fontFaces.body.medium,
    marginTop: spacing.xxxs,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colours.textSecondary,
  },
  summarySectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summarySectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  summarySectionKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  summarySectionTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
    color: colours.primary,
    marginTop: spacing.xxs,
  },
  summarySectionMeta: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginTop: spacing.xxs,
  },
  summaryBodyText: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  summaryFactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    columnGap: spacing.md,
  },
  summaryFact: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
  },
  summaryFactLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginBottom: spacing.xxxs,
  },
  summaryFactValue: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  summarySourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colours.borderSoft,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  summarySourceLabel: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  summarySourceValue: {
    flex: 1,
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
    textAlign: 'right',
  },
  summaryTimelineAction: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  summaryTimelineList: {
    position: 'relative',
    paddingLeft: 34,
    marginTop: spacing.xs,
  },
  summaryTimelineRail: {
    position: 'absolute',
    left: 11,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: colours.border,
  },
  summaryTimelineRow: {
    minHeight: 58,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  summaryTimelineNode: {
    position: 'absolute',
    left: -34,
    top: 20,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 3,
    backgroundColor: colours.background,
  },
  summaryTimelineCopy: {
    minWidth: 0,
  },
  summaryTimelineLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  summaryTimelineTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
    marginTop: spacing.xxs,
  },
  summaryTimelineMeta: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
  },
  quickActionsCard: {
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    borderRadius: radii.card,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  quickActionsHeader: {
    gap: spacing.xxxs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  quickActionsTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  quickActionsHelper: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  quickActionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
  },
  quickActionLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textPrimary,
    textAlign: 'center',
  },
  projectionBasisCard: {
    marginBottom: spacing.sm,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contextHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  contextKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  contextTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
    marginTop: spacing.xxs,
  },
  contextBadge: {
    maxWidth: 132,
    borderRadius: radii.chip,
    backgroundColor: colours.surfaceAccent,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contextBadgeText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.primary,
    textAlign: 'center',
  },
  projectionAssumptionText: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textSecondary,
    marginBottom: spacing.sm,
  },
  contextMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contextMetric: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surface,
    padding: spacing.sm,
  },
  contextMetricLabel: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  contextMetricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  segmentStrip: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  segmentItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surface,
    padding: spacing.sm,
  },
  segmentItemCurrent: {
    borderColor: colours.teal,
    backgroundColor: colours.successSurface,
  },
  segmentDot: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
    backgroundColor: colours.borderStrong,
  },
  segmentDotCompleted: {
    backgroundColor: colours.primary,
  },
  segmentDotCurrent: {
    backgroundColor: colours.teal,
  },
  segmentCopy: {
    flex: 1,
    minWidth: 0,
  },
  segmentTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  segmentMeta: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
  },
  draftPreview: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  draftPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  draftPreviewBadge: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.warning,
    textTransform: 'uppercase',
  },
  draftPreviewTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
  },
  draftPreviewBody: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: colours.textSecondary,
  },
  futurePreviewNode: {
    borderColor: colours.border,
  },
  currentPreviewNode: {
    borderColor: colours.teal,
    backgroundColor: colours.white,
  },
  startPreviewNode: {
    borderColor: colours.border,
  },
  draftExcludedNote: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.warningSurface,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  draftExcludedTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.warning,
    textTransform: 'uppercase',
  },
  draftExcludedText: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textPrimary,
    marginTop: spacing.xxs,
  },
  viewTimelineLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colours.border,
    marginTop: spacing.xs,
  },
  viewTimelineLinkText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colours.modalScrim,
  },
  drawer: {
    maxHeight: '84%',
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colours.borderSoft,
    marginBottom: spacing.md,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  drawerTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    color: colours.primary,
  },
  closeText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  drawerOptionList: {
    paddingBottom: spacing.md,
  },
  drawerGroupTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  drawerOptionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingVertical: spacing.sm,
  },
  drawerOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  drawerOptionIconDanger: {
    backgroundColor: colours.errorSurface,
  },
  drawerOptionCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  drawerOptionTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  drawerOptionTitleDanger: {
    color: colours.error,
  },
  drawerOptionDescription: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colours.textSecondary,
  },
  chartCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
  },
  chartHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  previewPressed: {
    opacity: 0.84,
  },
  scheduleCard: {
    paddingBottom: 8,
  },
  previewTitle: {
    flex: 1,
  },
  fullscreenButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
  },
  actionButtonText: {
    textTransform: 'uppercase',
  },
  fullscreenSafe: {
    flex: 1,
    backgroundColor: colours.background,
  },
  fullscreenHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.background,
  },
  closeButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  fullscreenBody: {
    flex: 1,
  },
  fullscreenContent: {
    padding: layout.screenPadding,
    paddingBottom: spacing['2xl'],
  },
  timelineSection: {
    marginBottom: spacing.md,
  },
  timelineSectionTitle: {
    color: colours.primary,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    color: colours.primary,
  },
  addActivityButton: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
  eventTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  eventDate: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginLeft: spacing.sm,
    maxWidth: 92,
    textAlign: 'right',
  },
  soonerNudgeCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
    backgroundColor: colours.surface,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  soonerNudgeInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  soonerNudgeCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  soonerCardActive: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colours.successSurface,
    borderColor: colours.successBorder,
    gap: spacing.xs,
  },
  soonerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  soonerCardTitle: {
    flex: 1,
  },
  soonerSavingsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  soonerMetric: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    gap: spacing.xxxs,
  },
  soonerManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colours.successBorder,
    paddingTop: spacing.xs,
    marginTop: spacing.xxs,
  },
  overpaymentCard: {
    marginBottom: 14,
    marginHorizontal: spacing.sm,
  },
  overpaymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  overpaymentRowLeft: {
    flex: 1,
    minWidth: 0,
  },
  overpaymentCardFooter: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  overpaymentFooterTotal: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  overpaymentFooterSaved: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.secondary,
  },
});
