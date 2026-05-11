import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
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
import { buildMortgageProjection } from '@/mortgage/projection';
import {
  formatDealDuration,
  getCurrentDeal,
  getMortgageTrackerSummary,
  getPublishedDeals,
} from '@/mortgage/tracker';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { LoanDeal, MortgageEvent, SavedLoan } from '@/types/SavedLoan';
import { colours, fonts, fontSizes, fontWeights, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate, formatFriendlyDateRange } from '@/utils/date';

type MortgageDetailTab = 'overview' | 'projection' | 'timeline';

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
          />

          <TimelinePreview
            loan={loan}
            currentDeal={activeDeal}
            draftDeal={draftDeal}
            publishedDeals={publishedDeals}
            onAddDeal={() => router.push(`/saved/${loan.id}/deals/new`)}
            onOpenTimeline={() => switchTab('timeline')}
          />

          {trackerSummary.recentEvents.length > 0 ? (
            <RecentActivity
              loan={loan}
              events={trackerSummary.recentEvents}
              canAddActivity={Boolean(activeDeal)}
              limit={3}
              onViewAll={() => switchTab('timeline')}
            />
          ) : null}

          <Button
            label={t('mortgage.quickActions')}
            onPress={() => setActionDrawerVisible(true)}
            variant="secondary"
            style={styles.quickActionsTrigger}
          />
        </View>
      ) : null}

      {activeTab === 'projection' ? (
        <View style={styles.tabPanel}>
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <AppText variant="title3">{t('results.repaymentBreakdown')}</AppText>
            </View>
            <RepaymentBarChart
              monthlyArray={projection.loanChartMonthlyArray}
              interestArray={projection.loanChartInterestArray}
              labelArray={projection.loanChartLabelArray}
              currency={loan.currency}
            />
          </Card>
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <AppText variant="title3">{t('results.cumulativePayments')}</AppText>
            </View>
            <CumulativeAreaChart
              monthlyArray={projection.loanChartMonthlyArray}
              interestArray={projection.loanChartInterestArray}
              remainingArray={projection.loanChartRemainingArray}
              currency={loan.currency}
            />
          </Card>
          <Card style={[styles.chartCard, styles.scheduleCard]}>
            <View style={styles.chartHeader}>
              <AppText variant="title3">{t('mortgage.trackedSchedule')}</AppText>
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

const TimelinePreview = ({
  loan,
  currentDeal,
  draftDeal,
  publishedDeals,
  onAddDeal,
  onOpenTimeline,
}: {
  loan: SavedLoan;
  currentDeal?: LoanDeal;
  draftDeal?: LoanDeal;
  publishedDeals: LoanDeal[];
  onAddDeal: () => void;
  onOpenTimeline: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const latestCompletedDeal = [...publishedDeals]
    .reverse()
    .find(deal => deal.status === 'completed');
  const firstDeal = publishedDeals[0];
  const completedDealIsInitial = Boolean(latestCompletedDeal && latestCompletedDeal.id === firstDeal?.id);
  const items: Array<{
    key: string;
    marker: 'future' | 'current' | 'past' | 'start';
    label: string;
    title: string;
    meta: string;
  }> = [
    ...(draftDeal ? [{
      key: `draft-${draftDeal.id}`,
      marker: 'future' as const,
      label: t('mortgage.future'),
      title: draftDeal.name,
      meta: `${t('mortgage.startsOn', { date: formatFriendlyDate(draftDeal.startDate, i18n.language) })} · ${formatDealDuration(draftDeal, i18n.language)}`,
    }] : []),
    ...(currentDeal ? [{
      key: `current-${currentDeal.id}`,
      marker: 'current' as const,
      label: t('mortgage.currentDeal'),
      title: currentDeal.name,
      meta: `${formatFriendlyDateRange(currentDeal.startDate, currentDeal.endDate, i18n.language)} · ${formatDealDuration(currentDeal, i18n.language)}`,
    }] : []),
    ...(latestCompletedDeal && latestCompletedDeal.id !== currentDeal?.id ? [{
      key: `completed-${latestCompletedDeal.id}`,
      marker: completedDealIsInitial ? 'start' as const : 'past' as const,
      label: completedDealIsInitial ? t('mortgage.mortgageStart') : t('mortgage.past'),
      title: latestCompletedDeal.name,
      meta: latestCompletedDeal.completion
        ? `${t('mortgage.closedAt', { amount: formatCurrency(latestCompletedDeal.completion.closingBalance, loan.currency) })} · ${formatDealDuration(latestCompletedDeal, i18n.language)}`
        : `${formatFriendlyDateRange(latestCompletedDeal.startDate, latestCompletedDeal.endDate, i18n.language)} · ${formatDealDuration(latestCompletedDeal, i18n.language)}`,
    }] : []),
    ...(!firstDeal ? [{
      key: 'mortgage-start',
      marker: 'start' as const,
      label: t('mortgage.mortgageStart'),
      title: formatFriendlyDate(loan.formSnapshot.startDate, i18n.language),
      meta: loan.lender || t('saved.category.mortgage'),
    }] : []),
  ].slice(0, 3);

  return (
    <Card style={styles.timelinePreviewCard}>
      <View style={styles.timelinePreviewHeader}>
        <Text style={styles.sectionTitle}>{t('mortgage.dealTimeline')}</Text>
        <Button
          label={loan.deals.length > 0 ? t('mortgage.addDeal') : t('mortgage.addFirstDeal')}
          leftIcon={<PlusIcon color={colours.primaryInk} size={18} />}
          onPress={onAddDeal}
          variant="icon-pill"
          style={styles.timelinePreviewAction}
        />
      </View>
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  timelinePreviewTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginTop: spacing.xxs,
  },
  timelinePreviewMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  closeText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  drawerOptionList: {
    paddingBottom: spacing.md,
  },
  drawerGroupTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  drawerOptionMarkerDangerText: {
    color: colours.error,
  },
  drawerOptionTitle: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
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
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  scheduleCard: {
    paddingBottom: 8,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  eventMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 2,
  },
  eventDate: {
    fontFamily: fonts.body,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
});
