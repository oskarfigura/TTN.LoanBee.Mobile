import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AmortisationTable } from '@/components/calculator/AmortisationTable';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
import { RepaymentBarChart } from '@/components/charts/RepaymentBarChart';
import { mortgageEventLabelKey } from '@/components/loans/MortgageEventForm';
import { DashboardPinButton } from '@/components/loans/DashboardPinButton';
import { LoanInsightCard } from '@/components/loans/LoanInsightCard';
import { PlusIcon } from '@/components/loans/LoanIcons';
import { MortgageTimelineView, MortgageWarningBanners } from '@/components/loans/MortgageTimelineView';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { SegmentedControl } from '@/components/ui/FormPrimitives';
import { formatCurrency } from '@/currency/format';
import { buildSavedLoanSummary, LoanInsightSummary } from '@/loans/loanInsightSummary';
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
import { LoanDeal, MortgageEvent, SavedLoan } from '@/types/SavedLoan';
import { colours, fontFaces, fontSizes, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate, formatFriendlyDateRange } from '@/utils/date';

type MortgageDetailTab = 'overview' | 'projection' | 'timeline';
type ProjectionPreview = 'repayment' | 'cumulative' | 'schedule';

interface Props {
  loan: SavedLoan;
  onTogglePinned: () => void;
  onLoanUpdated?: () => void;
  footerActions?: React.ReactNode;
}

const eventIcon = (event: MortgageEvent) => {
  if (event.type === 'balanceCheckpoint') return 'B';
  if (event.type === 'missedPayment') return '!';
  if (event.type === 'paymentHoliday') return 'P';
  if (event.type === 'note') return 'N';
  return '+';
};

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
  const [actionDrawerVisible, setActionDrawerVisible] = useState(false);
  const [projectionPreview, setProjectionPreview] = useState<ProjectionPreview | null>(null);
  const isProjectionPreviewOpen = projectionPreview !== null;
  const asOf = useMemo(() => new Date(), [loan]);
  const result = useMemo(() => getResultForSavedLoan(loan), [loan]);
  const projection = useMemo(() => buildMortgageProjection(loan, asOf), [asOf, loan]);
  const trackerSummary = useMemo(() => getMortgageTrackerSummary(loan, asOf), [asOf, loan]);
  const insightSummary = useMemo(() => (
    buildSavedLoanSummary(loan, result, asOf, i18n.language)
  ), [asOf, i18n.language, loan, result]);
  const tabs: Array<{ value: MortgageDetailTab; label: string }> = [
    { value: 'overview', label: t('mortgage.overview') },
    { value: 'projection', label: t('mortgage.projection') },
    { value: 'timeline', label: t('mortgage.timeline') },
  ];
  const currentDeal = trackerSummary.currentDeal;
  const activeDeal = getCurrentDeal(loan, asOf);
  const publishedDeals = getPublishedDeals(loan);
  const draftDeal = trackerSummary.nextDraftDeal;
  const overviewSummary = useMemo<LoanInsightSummary>(() => ({
    ...insightSummary,
    metrics: insightSummary.metrics.slice(0, 3),
    progress: insightSummary.progress
      ? {
        ...insightSummary.progress,
        metrics: [],
      }
      : undefined,
  }), [insightSummary]);
  const switchTab = (nextTab: MortgageDetailTab) => {
    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };
  const navigateFromActions = (href: string) => {
    setActionDrawerVisible(false);
    router.push(href as Parameters<typeof router.push>[0]);
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
            labelArray={projection.loanChartLabelArray}
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
          <OpeningBalanceHint loan={loan} activeDeal={activeDeal} />
          <LoanInsightCard
            summary={overviewSummary}
            density="full"
            title={loan.nickname}
            subtitle={currentDeal?.lender || publishedDeals[0]?.lender || loan.lender || t('saved.category.mortgage')}
            headerAction={(
              <DashboardPinButton
                pinned={loan.pinnedToDashboard}
                onPress={onTogglePinned}
                style={styles.pinButton}
              />
            )}
            showProgress
            footerContent={(
              <MortgageTopCardContext
                loan={loan}
                currentDeal={currentDeal}
              />
            )}
          />

          <TimelinePreview
            loan={loan}
            currentDeal={activeDeal}
            draftDeal={draftDeal}
            publishedDeals={publishedDeals}
            projection={projection}
            onAddDeal={() => router.push(`/saved/${loan.id}/deals/new`)}
            onOpenTimeline={() => switchTab('timeline')}
          />

          {activeDeal ? (
            <DealOverpaymentsCard loan={loan} currentDeal={activeDeal} />
          ) : null}

          {(() => {
            const currentDealEvents = activeDeal
              ? [...loan.events]
                  .filter(e => e.dealId === activeDeal.id)
                  .sort((a, b) => b.date.localeCompare(a.date))
              : trackerSummary.recentEvents;
            return currentDealEvents.length > 0 ? (
              <RecentActivity
                loan={loan}
                events={currentDealEvents}
                canAddActivity={Boolean(activeDeal)}
                limit={3}
                onViewAll={() => switchTab('timeline')}
              />
            ) : null;
          })()}

          {activeDeal ? (
            <Button
              label={t('mortgage.quickActions')}
              onPress={() => setActionDrawerVisible(true)}
              variant="secondary"
              style={styles.quickActionsTrigger}
            />
          ) : null}
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
                labelArray={projection.loanChartLabelArray}
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
                <AppText variant="labelSm" tone="accent" style={styles.actionButtonText}>
                  {t('results.fullScreen')}
                </AppText>
              </TouchableOpacity>
            </View>
            <AmortisationTable
              items={projection.tableItems}
              startDate={publishedDeals[0]?.startDate ?? loan.formSnapshot.startDate}
              currency={loan.currency}
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
          <View style={styles.timelineSection}>
            {trackerSummary.recentEvents.length > 0 ? (
              <RecentActivity
                loan={loan}
                events={trackerSummary.recentEvents}
                canAddActivity={Boolean(activeDeal)}
                titleKey="mortgage.activityLog"
              />
            ) : null}
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
            visible={actionDrawerVisible}
            loan={loan}
            activeDeal={activeDeal}
            onClose={() => setActionDrawerVisible(false)}
            onNavigate={navigateFromActions}
          />
    </ScrollView>
  );
};

const OPENING_BALANCE_HINT_WINDOW_DAYS = 14;

const OpeningBalanceHint = ({
  loan,
  activeDeal,
}: {
  loan: SavedLoan;
  activeDeal?: LoanDeal;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const onlyActiveDeal = loan.deals.length === 1 && activeDeal?.status === 'active';
  const hasNoActivityYet = loan.events.length === 0;
  const createdAt = new Date(loan.createdAt).getTime();
  const ageInDays = Number.isFinite(createdAt)
    ? (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
    : Number.POSITIVE_INFINITY;
  const isFreshlySaved = ageInDays <= OPENING_BALANCE_HINT_WINDOW_DAYS;

  if (!onlyActiveDeal || !hasNoActivityYet || !activeDeal || !isFreshlySaved) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      style={styles.openingBalanceHint}
      onPress={() => router.push(`/saved/${loan.id}/deals/${activeDeal.id}`)}
      accessibilityRole="button"
    >
      <AppText style={styles.openingBalanceHintTitle}>{t('mortgage.openingBalanceHintTitle')}</AppText>
      <AppText style={styles.openingBalanceHintBody}>{t('mortgage.openingBalanceHintBody')}</AppText>
      <AppText style={styles.openingBalanceHintCta}>{t('mortgage.openingBalanceHintCta')} →</AppText>
    </TouchableOpacity>
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

const TimelinePreview = ({
  loan,
  currentDeal,
  draftDeal,
  publishedDeals,
  projection,
  onAddDeal,
  onOpenTimeline,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
  draftDeal?: LoanDeal;
  publishedDeals: LoanDeal[];
  projection: MortgageProjection;
  onAddDeal: () => void;
  onOpenTimeline: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const firstDeal = publishedDeals[0];
  const items: Array<{
    key: string;
    marker: 'future' | 'current' | 'past' | 'start';
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
    {
      key: currentDeal ? `current-${currentDeal.id}` : 'current-estimate',
      marker: 'current' as const,
      label: currentDeal ? t('mortgage.currentDeal') : t('mortgage.currentEstimate'),
      title: currentDeal?.name ?? t('mortgage.currentBalance'),
      meta: currentDeal
        ? `${formatCurrency(projection.currentBalance, loan.currency)} · ${formatDealDuration(currentDeal, i18n.language)}`
        : formatCurrency(projection.currentBalance, loan.currency),
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
  ];
  const showTimelineList = items.length > 0;

  return (
    <Card style={styles.timelinePreviewCard}>
      <View style={styles.timelinePreviewHeader}>
        <Text style={styles.sectionTitle}>{t('mortgage.dealTimeline')}</Text>
        {firstDeal || draftDeal ? (
          <Button
            label={firstDeal ? t('mortgage.addDeal') : t('mortgage.editDraftDeal')}
            leftIcon={<PlusIcon color={colours.primaryInk} size={18} />}
            onPress={onAddDeal}
            variant="icon-pill"
            style={styles.timelinePreviewAction}
          />
        ) : null}
      </View>
      {!firstDeal && !draftDeal ? (
        <Text style={styles.timelinePreviewHelp}>
          {t('mortgage.noDealChangesBody')}
        </Text>
      ) : null}
      {showTimelineList ? (
        <View style={styles.timelinePreviewList}>
          <View style={styles.timelinePreviewRail} />
          {items.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.timelinePreviewRow}
              onPress={onOpenTimeline}
              activeOpacity={0.84}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.timelinePreviewNode,
                  item.marker === 'future' && styles.futurePreviewNode,
                  item.marker === 'current' && styles.currentPreviewNode,
                  item.marker === 'past' && styles.pastPreviewNode,
                  item.marker === 'start' && styles.startPreviewNode,
                ]}
              />
              <View style={styles.timelinePreviewCopy}>
                <Text style={styles.timelinePreviewLabel}>{item.label}</Text>
                <Text style={styles.timelinePreviewTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.timelinePreviewMeta} numberOfLines={1}>{item.meta}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
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
    </Card>
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

const MortgageTopCardContext = ({
  loan,
  currentDeal,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
}) => {
  const { t, i18n } = useTranslation();
  const latestCheckpoint = [...loan.events]
    .filter(event => event.type === 'balanceCheckpoint' && (!currentDeal || event.dealId === currentDeal.id))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const balanceSource = latestCheckpoint
    ? t('mortgage.sourceBankCheckpoint', { date: formatFriendlyDate(latestCheckpoint.date, i18n.language) })
    : currentDeal?.status === 'completed' && currentDeal.completion
      ? t('mortgage.sourceCompletedDeal', { date: formatFriendlyDate(currentDeal.completion.completedAt, i18n.language) })
      : currentDeal
        ? t('mortgage.sourceProjectedFromCurrentDeal')
        : t('mortgage.sourceCurrentStateProjection');
  const dealImpact = useMemo(
    () => currentDeal ? getDealOverpaymentImpact(currentDeal, loan.events) : undefined,
    [currentDeal, loan.events],
  );

  return (
    <View style={styles.topCardContext}>
      <View style={styles.balanceSourceRow}>
        <Text style={styles.balanceSourceLabel}>{t('mortgage.balanceSource')}</Text>
        <Text style={styles.balanceSourceValue} numberOfLines={1} adjustsFontSizeToFit>
          {balanceSource}
        </Text>
      </View>
      {currentDeal ? (
        <View style={styles.topDealContext}>
          <View style={styles.topDealCopy}>
            <Text style={styles.topDealLabel}>
              {currentDeal.status === 'completed' ? t('mortgage.historicalContext') : t('mortgage.currentDealDriver')}
            </Text>
            <Text style={styles.topDealTitle} numberOfLines={1}>
              {currentDeal.name}
            </Text>
          </View>
          <View style={styles.topDealFacts}>
            <Text style={styles.topDealFact} numberOfLines={1}>
              {t('mortgage.currentDealEnds')}: {formatFriendlyDate(currentDeal.endDate, i18n.language)}
            </Text>
            <Text style={styles.topDealFact} numberOfLines={1}>
              {t('calculator.additionalPayment')}: {formatCurrency(currentDeal.regularOverpayment, loan.currency)}
            </Text>
            {dealImpact?.hasOverpayments ? (
              <Text style={styles.topDealSaved} numberOfLines={1}>
                {t('mortgage.dealSavedSoFar')}: {formatCurrency(dealImpact.interestSaved, loan.currency)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const DealOverpaymentsCard = ({
  loan,
  currentDeal,
}: {
  loan: SavedLoan;
  currentDeal: LoanDeal;
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const lumpOverpayments = loan.events
    .filter(e => e.type === 'lumpOverpayment' && e.dealId === currentDeal.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (lumpOverpayments.length === 0) return null;

  const impact = getDealOverpaymentImpact(currentDeal, loan.events);
  const totalOverpaid = lumpOverpayments.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return (
    <Card style={styles.overpaymentCard}>
      <View style={styles.overpaymentCardHeader}>
        <Text style={styles.sectionTitle}>{t('mortgage.overpayments')}</Text>
        <Button
          label={t('mortgage.addOverpayment')}
          onPress={() => router.push(`/saved/${loan.id}/events/new?type=lumpOverpayment`)}
          variant="icon-pill"
          style={styles.addActivityButton}
        />
      </View>
      {lumpOverpayments.map(event => (
        <TouchableOpacity
          key={event.id}
          style={styles.eventRow}
          onPress={() => router.push(`/saved/${loan.id}/events/${event.id}`)}
          activeOpacity={0.84}
        >
          <View style={styles.overpaymentRowLeft}>
            <Text style={styles.eventTitle}>{formatCurrency(event.amount ?? 0, loan.currency)}</Text>
          </View>
          <Text style={styles.eventDate}>{formatFriendlyDate(event.date, i18n.language)}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.overpaymentCardFooter}>
        <Text style={styles.overpaymentFooterTotal}>
          {t('mortgage.totalOverpaid')}: {formatCurrency(totalOverpaid, loan.currency)}
        </Text>
        {impact.interestSaved > 0 ? (
          <Text style={styles.overpaymentFooterSaved}>
            {t('mortgage.estInterestSaved')}: {formatCurrency(impact.interestSaved, loan.currency)}
          </Text>
        ) : null}
      </View>
    </Card>
  );
};

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
  visible,
  loan,
  activeDeal,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  loan: SavedLoan;
  activeDeal?: LoanDeal;
  onClose: () => void;
  onNavigate: (href: string) => void;
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
            <Text style={styles.drawerTitle}>{t('mortgage.quickActions')}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.84}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.drawerOptionList}>
            {activeDeal ? (
              <>
                <QuickActionOption
                  title={t('mortgage.reviewCurrentDeal')}
                  marker="R"
                  onPress={() => onNavigate(`/saved/${loan.id}/deals/${activeDeal.id}`)}
                />
                <QuickActionOption
                  title={t('mortgage.addOverpayment')}
                  marker="+"
                  onPress={() => onNavigate(`/saved/${loan.id}/events/new?type=lumpOverpayment`)}
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
  marker,
  destructive,
  onPress,
}: {
  title: string;
  marker: string;
  destructive?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.drawerOptionRow} onPress={onPress} activeOpacity={0.84}>
    <View style={[styles.drawerOptionMarker, destructive && styles.drawerOptionMarkerDanger]}>
      <Text style={[styles.drawerOptionMarkerText, destructive && styles.drawerOptionMarkerDangerText]}>{marker}</Text>
    </View>
    <Text style={[styles.drawerOptionTitle, destructive && styles.drawerOptionTitleDanger]}>{title}</Text>
  </TouchableOpacity>
);

const RecentActivity = ({
  loan,
  events,
  canAddActivity,
  limit,
  onViewAll,
  titleKey = 'mortgage.recentActivity',
}: {
  loan: SavedLoan;
  events: MortgageEvent[];
  canAddActivity: boolean;
  limit?: number;
  onViewAll?: () => void;
  titleKey?: string;
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const visibleEvents = typeof limit === 'number' ? events.slice(0, limit) : events;
  const hasHiddenEvents = typeof limit === 'number' && events.length > limit;

  if (events.length === 0) return null;

  return (
    <Card style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <Text style={styles.sectionTitle}>{t(titleKey)}</Text>
        {canAddActivity ? (
          <Button
            label={t('mortgage.addActivity')}
            onPress={() => router.push(`/saved/${loan.id}/events/new`)}
            variant="icon-pill"
            style={styles.addActivityButton}
          />
        ) : null}
      </View>
      {visibleEvents.map(event => (
        <TouchableOpacity
          key={event.id}
          style={styles.eventRow}
          onPress={() => router.push(`/saved/${loan.id}/events/${event.id}`)}
          activeOpacity={0.84}
        >
          <View style={styles.eventIcon}>
            <Text style={styles.eventIconText}>{eventIcon(event)}</Text>
          </View>
          <View style={styles.eventCopy}>
            <Text style={styles.eventTitle}>{t(mortgageEventLabelKey(event.type))}</Text>
            <Text style={styles.eventMeta}>
              {event.balance !== undefined
                ? formatCurrency(event.balance, loan.currency)
                : event.amount !== undefined
                  ? formatCurrency(event.amount, loan.currency)
                  : event.note || t('mortgage.eventNoAmount')}
            </Text>
          </View>
          <Text style={styles.eventDate}>{formatFriendlyDate(event.date, i18n.language)}</Text>
        </TouchableOpacity>
      ))}
      {hasHiddenEvents && onViewAll ? (
        <TouchableOpacity
          style={styles.viewAllActivity}
          onPress={onViewAll}
          activeOpacity={0.84}
          accessibilityRole="button"
        >
          <Text style={styles.viewAllActivityText}>{t('common.viewAll')}</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
};

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
  pinButton: {
    marginBottom: 0,
    marginTop: 4,
  },
  quickActionsTrigger: {
    marginBottom: spacing.sm,
  },
  projectionBasisCard: {
    marginBottom: spacing.sm,
  },
  topCardContext: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  balanceSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceSourceLabel: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  balanceSourceValue: {
    flex: 1,
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
    textAlign: 'right',
  },
  topDealContext: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surface,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  topDealCopy: {
    gap: spacing.xxxs,
  },
  topDealLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  topDealTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  topDealFacts: {
    gap: spacing.xxxs,
  },
  topDealFact: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  topDealSaved: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.success,
  },
  openingBalanceHint: {
    borderWidth: 1,
    borderColor: colours.accent,
    backgroundColor: colours.surfaceAccent,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xxs,
  },
  openingBalanceHintTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.primary,
  },
  openingBalanceHintBody: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    lineHeight: 19,
  },
  openingBalanceHintCta: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
    marginTop: spacing.xs,
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
  timelinePreviewCard: {
    marginBottom: spacing.sm,
  },
  timelinePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timelinePreviewAction: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  timelinePreviewHelp: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textSecondary,
    marginBottom: spacing.sm,
  },
  timelinePreviewList: {
    position: 'relative',
    paddingLeft: 34,
  },
  timelinePreviewRail: {
    position: 'absolute',
    left: 11,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: colours.border,
  },
  timelinePreviewRow: {
    minHeight: 58,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  timelinePreviewNode: {
    position: 'absolute',
    left: -34,
    top: 20,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 3,
    backgroundColor: colours.background,
  },
  futurePreviewNode: {
    borderColor: colours.border,
  },
  currentPreviewNode: {
    borderColor: colours.teal,
    backgroundColor: colours.white,
  },
  pastPreviewNode: {
    borderColor: colours.textSecondary,
  },
  startPreviewNode: {
    borderColor: colours.border,
  },
  timelinePreviewCopy: {
    minWidth: 0,
  },
  timelinePreviewLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  timelinePreviewTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
    marginTop: spacing.xxs,
  },
  timelinePreviewMeta: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
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
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingVertical: spacing.sm,
  },
  drawerOptionMarker: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
    marginRight: spacing.sm,
  },
  drawerOptionMarkerDanger: {
    backgroundColor: colours.errorSurface,
  },
  drawerOptionMarkerText: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  drawerOptionMarkerDangerText: {
    color: colours.error,
  },
  drawerOptionTitle: {
    flex: 1,
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
  },
  drawerOptionTitleDanger: {
    color: colours.error,
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
  activityCard: {
    marginBottom: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
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
  eventIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
    marginRight: 10,
  },
  eventIconText: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  eventMeta: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 2,
  },
  eventDate: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginLeft: spacing.sm,
    maxWidth: 92,
    textAlign: 'right',
  },
  viewAllActivity: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colours.border,
    marginTop: spacing.xs,
  },
  viewAllActivityText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  overpaymentCard: {
    marginBottom: 14,
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
