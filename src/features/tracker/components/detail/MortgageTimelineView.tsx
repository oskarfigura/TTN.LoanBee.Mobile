import React, { useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, ButtonVariant } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { Card } from '@oskarfigura/ui-native';
import { DestructiveConfirmDialog } from '@/shared/ui/components/DestructiveConfirmDialog';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { LiveDotIcon } from '@/shared/ui/components/LiveDotIcon';
import { mortgageEventLabelKey } from '@/features/tracker/components/editing/MortgageEventForm';
import { formatCurrency } from '@/shared/domain/currency/format';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { removeMortgageEvent } from '@/shared/domain/mortgage/events';
import {
  canDeleteDeal,
  canEditDeal,
  formatDealDuration,
  getCurrentDeal,
  getDealOverpaymentImpact,
  getDraftDealsNewestFirst,
  getPublishedDeals,
  getTimelineWarnings,
  projectDeal,
  removeLatestDealAndEvents,
} from '@/shared/domain/mortgage/tracker';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { colours, fontFaces, fontSizes, radii, spacing } from '@/shared/ui/theme';
import { LoanDeal, MortgageEvent, SavedLoan } from '@/shared/domain/types/SavedLoan';
import { formatFriendlyDate, formatFriendlyDateRange, parseDateLabelValue } from '@/shared/lib/utils/date';

interface Props {
  loan: SavedLoan;
  showFooterAction?: boolean;
  onLoanUpdated?: (loan: SavedLoan) => void;
}

export const MortgageWarningBanners = ({ loan }: { loan: SavedLoan }) => {
  const { t } = useTranslation();
  const warnings = useMemo(() => getTimelineWarnings(loan), [loan]);

  if (warnings.length === 0) return null;

  return (
    <View style={styles.warningList}>
      {warnings.map(warning => (
        <Card key={`${warning.type}-${warning.dealId ?? 'group'}`} style={styles.warningCard}>
          <Text style={styles.warningTitle}>{t(warning.title)}</Text>
          <Text style={styles.warningText}>{t(warning.message)}</Text>
        </Card>
      ))}
    </View>
  );
};

const statusIcon = (variant: 'neutral' | 'active' | 'success') => {
  if (variant === 'success') return <Icon icon={IconName.TickIcon} color={colours.success} size={12} strokeWidth={2.4} />;
  if (variant === 'active') return <LiveDotIcon color={colours.white} size={8} />;
  return <Icon icon={IconName.PencilIcon} color={colours.textSecondary} size={12} strokeWidth={2} />;
};

const StatusBadge = ({ label, variant = 'neutral' }: { label: string; variant?: 'neutral' | 'active' | 'success' }) => (
  <Badge label={label} variant={variant} leftIcon={statusIcon(variant)} />
);

type TimelineActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const TimelineAction = ({
  label,
  onPress,
  variant = 'secondary',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: TimelineActionVariant;
  style?: StyleProp<ViewStyle>;
}) => (
  <TouchableOpacity
    style={[styles.timelineAction, timelineActionStyles[variant], style]}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
  >
    <Text
      style={[styles.timelineActionLabel, timelineActionLabelStyles[variant]]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const DealStats = ({
  deal,
  currency,
  events,
  asOf,
}: {
  deal: LoanDeal;
  currency: CurrencyCode;
  events: MortgageEvent[];
  asOf: Date;
}) => {
  const { t, i18n } = useTranslation();
  const impact = useMemo(() => getDealOverpaymentImpact(deal, events), [deal, events]);
  const closingBalance = useMemo(() => {
    if (deal.status === 'completed' && deal.completion) {
      return { value: deal.completion.closingBalance, isPredicted: false };
    }
    const endDate = parseDateLabelValue(deal.endDate) ?? asOf;
    return { value: projectDeal(deal, events, endDate).balance, isPredicted: true };
  }, [deal, events, asOf]);

  return (
    <View>
      <View style={styles.dealBalances}>
        <View style={styles.dealStat}>
          <Text style={styles.statLabel}>{t('mortgage.dealOpeningBalance')}</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(deal.openingBalance, currency)}
          </Text>
        </View>
        <View style={styles.dealStat}>
          <Text style={styles.statLabel}>
            {closingBalance.isPredicted ? t('mortgage.dealPredictedBalance') : t('mortgage.dealClosingBalance')}
          </Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(closingBalance.value, currency)}
          </Text>
        </View>
      </View>
      <View style={styles.dealStats}>
        <View style={styles.dealStat}>
          <Text style={styles.statLabel}>{t('mortgage.duration')}</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatDealDuration(deal, i18n.language)}</Text>
        </View>
        <View style={styles.dealStat}>
          <Text style={styles.statLabel}>{t('calculator.interestRate')}</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{deal.interestRate}%</Text>
        </View>
        <View style={styles.dealStat}>
          <Text style={styles.statLabel}>{t('results.monthlyPayment')}</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(deal.monthlyPayment, currency)}</Text>
        </View>
      </View>
      {impact.hasOverpayments ? (
        <View style={styles.dealSavings}>
          <View style={styles.dealSavingsStat}>
            <Text style={styles.statLabel}>{t('mortgage.dealInterestSaved')}</Text>
            <Text style={styles.statValueAccent} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(impact.interestSaved, currency)}
            </Text>
          </View>
          <View style={styles.dealSavingsStat}>
            <Text style={styles.statLabel}>{t('mortgage.dealExtraPrincipal')}</Text>
            <Text style={styles.statValueAccent} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(impact.extraPrincipalRepaid, currency)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const DealActivityList = ({
  deal,
  loan,
  isActiveDeal,
  onRemoved,
}: {
  deal: LoanDeal;
  loan: SavedLoan;
  isActiveDeal: boolean;
  onRemoved: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [eventPendingRemove, setEventPendingRemove] = useState<MortgageEvent | null>(null);

  const dealEvents = loan.events
    .filter(e => e.dealId === deal.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (dealEvents.length === 0) return null;

  const confirmRemove = () => {
    if (!eventPendingRemove) return;
    const updated = removeMortgageEvent(loan, eventPendingRemove.id);
    savedLoansStorage.update(updated);
    setEventPendingRemove(null);
    onRemoved();
  };

  return (
    <View style={styles.activityList}>
      {dealEvents.map(event => (
        <View key={event.id} style={styles.activityRow}>
          <TouchableOpacity
            style={styles.activityRowContent}
            onPress={() => router.push(`/saved/${loan.id}/events/${event.id}`)}
            activeOpacity={0.84}
          >
            <View style={styles.activityLeft}>
              <Text style={styles.activityType}>{t(mortgageEventLabelKey(event.type))}</Text>
              {event.amount !== undefined ? (
                <Text style={styles.activityAmount}> · {formatCurrency(event.amount, loan.currency)}</Text>
              ) : null}
            </View>
            <Text style={styles.activityDate}>{formatFriendlyDate(event.date, i18n.language)}</Text>
          </TouchableOpacity>
          {isActiveDeal ? (
            <TouchableOpacity
              onPress={() => setEventPendingRemove(event)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}
              accessibilityLabel={t('mortgage.deleteEvent')}
            >
              <Icon icon={IconName.TrashIcon} size={15} color={colours.error} />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
      <DestructiveConfirmDialog
        visible={Boolean(eventPendingRemove)}
        title={t('mortgage.deleteEvent')}
        message={t('mortgage.deleteEventMessage')}
        confirmLabel={t('mortgage.deleteEvent')}
        cancelLabel={t('results.cancelLeave')}
        onCancel={() => setEventPendingRemove(null)}
        onConfirm={confirmRemove}
      />
    </View>
  );
};

export const MortgageTimelineView = ({ loan, showFooterAction = true, onLoanUpdated }: Props) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [dealPendingDelete, setDealPendingDelete] = useState<LoanDeal | null>(null);
  const asOf = useMemo(() => new Date(), [loan]);
  const timeline = useMemo(() => {
    const publishedDeals = getPublishedDeals(loan);
    const drafts = getDraftDealsNewestFirst(loan);

    return {
      drafts,
      current: getCurrentDeal(loan),
      completed: publishedDeals.filter(deal => deal.status === 'completed').reverse(),
      initialDealId: publishedDeals[0]?.id,
      publishedCount: publishedDeals.length,
    };
  }, [loan]);
  const hasDeals = timeline.publishedCount + timeline.drafts.length > 0;
  const hasPublishedDeals = Boolean(timeline.initialDealId);
  const addDealButton = (
    <Button
      label={hasPublishedDeals ? t('mortgage.addNextDeal') : t('mortgage.addCurrentDeal')}
      leftIcon={<Icon icon={IconName.PlusIcon} color={colours.primaryInk} size={18} strokeWidth={1.9} />}
      onPress={() => router.push(`/saved/${loan.id}/deals/new`)}
      variant={ButtonVariant.Secondary}
    />
  );
  const deleteDeal = (deal: LoanDeal) => {
    if (!canDeleteDeal(loan, deal.id)) return;
    setDealPendingDelete(deal);
  };

  const confirmDeleteDeal = () => {
    if (!dealPendingDelete) return;
    const updatedLoan = removeLatestDealAndEvents(loan, dealPendingDelete.id);
    setDealPendingDelete(null);
    savedLoansStorage.update(updatedLoan);
    onLoanUpdated?.(updatedLoan);
  };

  return (
    <View>
      <DestructiveConfirmDialog
        visible={Boolean(dealPendingDelete)}
        title={dealPendingDelete?.status === 'draft' ? t('mortgage.deleteDraftTitle') : t('mortgage.deleteDealTitle')}
        message={dealPendingDelete?.status === 'draft'
          ? t('mortgage.deleteDraftMessage')
          : t('mortgage.deleteDealMessage', { name: dealPendingDelete?.name ?? '' })}
        confirmLabel={dealPendingDelete?.status === 'draft' ? t('mortgage.deleteDraft') : t('mortgage.deleteDeal')}
        cancelLabel={t('results.cancelLeave')}
        onCancel={() => setDealPendingDelete(null)}
        onConfirm={confirmDeleteDeal}
      />
      {showFooterAction ? (
        <View style={styles.topAction}>
          {addDealButton}
        </View>
      ) : null}

      {!hasDeals ? (
        <Card style={styles.noDealsCard}>
          <Text style={styles.noDealsTitle}>{t('mortgage.noDealChangesTitle')}</Text>
          <Text style={styles.noDealsText}>{t('mortgage.noDealChangesBody')}</Text>
        </Card>
      ) : null}

      {hasDeals ? (
      <View style={styles.timelineShell}>
        <View style={styles.rail} />

        {timeline.drafts.map(deal => (
          <View key={deal.id} style={styles.timelineItem}>
            <View style={styles.nodeMuted} />
            <Card style={styles.futureCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.kicker}>{t('mortgage.future')}</Text>
                  <Text style={styles.futureTitle} numberOfLines={2}>{deal.name}</Text>
                </View>
                <StatusBadge label={t('mortgage.inactive')} />
              </View>
              <Text style={styles.meta}>
                {t('mortgage.startsOn', { date: formatFriendlyDate(deal.startDate, i18n.language) })}
              </Text>
              <Text style={styles.meta}>{formatDealDuration(deal, i18n.language)}</Text>
              <Text style={styles.draftHelp}>{t('mortgage.draftPreviewBody')}</Text>
              <View style={styles.futureActions}>
                <TimelineAction
                  label={canEditDeal(loan, deal.id) ? t('mortgage.editDraftDeal') : t('saved.view')}
                  onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}
                />
                {canDeleteDeal(loan, deal.id) ? (
                  <TimelineAction
                    label={t('mortgage.deleteDraft')}
                    onPress={() => deleteDeal(deal)}
                    variant="danger"
                  />
                ) : null}
              </View>
            </Card>
          </View>
        ))}

        {timeline.current && (
          <View style={styles.timelineItem}>
            <View style={styles.nodeActive} />
            <Card style={styles.currentCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.currentKicker}>{t('mortgage.currentDeal')}</Text>
                <StatusBadge label={t('mortgage.active')} variant="active" />
              </View>
              <Text style={styles.currentTitle} numberOfLines={2}>{timeline.current.name}</Text>
              <Text style={styles.meta}>
                {formatFriendlyDateRange(timeline.current.startDate, timeline.current.endDate, i18n.language)}
              </Text>
              <DealStats deal={timeline.current} currency={loan.currency} events={loan.events} asOf={asOf} />
              <DealActivityList
                deal={timeline.current}
                loan={loan}
                isActiveDeal={true}
                onRemoved={() => {
                  const updated = savedLoansStorage.getById(loan.id);
                  if (updated) onLoanUpdated?.(updated);
                }}
              />
              <View style={styles.currentActions}>
                <TimelineAction
                  label={t('mortgage.addOverpayment')}
                  onPress={() => router.push(`/saved/${loan.id}/deals/${timeline.current?.id}/overpayments`)}
                  style={styles.currentPrimaryAction}
                />
                <TimelineAction
                  label={t('mortgage.completeCurrentDeal')}
                  onPress={() => router.push(`/saved/${loan.id}/complete-current`)}
                  variant={ButtonVariant.Primary}
                  style={styles.currentPrimaryAction}
                />
                <View style={styles.timelineActionRow}>
                  {canEditDeal(loan, timeline.current.id) ? (
                    <TimelineAction
                      label={t('mortgage.editDeal')}
                      onPress={() => router.push(`/saved/${loan.id}/deals/${timeline.current?.id}`)}
                      style={styles.timelineActionFill}
                    />
                  ) : (
                    <TimelineAction
                      label={t('saved.view')}
                      onPress={() => router.push(`/saved/${loan.id}/deals/${timeline.current?.id}`)}
                      style={styles.timelineActionFill}
                    />
                  )}
                  {canDeleteDeal(loan, timeline.current.id) ? (
                    <TimelineAction
                      label={t('mortgage.deleteDeal')}
                      onPress={() => deleteDeal(timeline.current as LoanDeal)}
                      variant="danger"
                      style={styles.timelineActionFill}
                    />
                  ) : null}
                </View>
              </View>
            </Card>
          </View>
        )}

        {timeline.completed.map(deal => (
          <View key={deal.id} style={styles.timelineItem}>
            <View style={styles.nodeComplete} />
            <Card style={styles.pastCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.kicker}>{deal.id === timeline.initialDealId ? t('mortgage.mortgageStart') : t('mortgage.past')}</Text>
                  <Text style={styles.pastTitle} numberOfLines={2}>{deal.name}</Text>
                </View>
                <StatusBadge label={t('saved.completed')} variant="success" />
              </View>
              <Text style={styles.meta}>{formatFriendlyDateRange(deal.startDate, deal.endDate, i18n.language)}</Text>
              <DealStats deal={deal} currency={loan.currency} events={loan.events} asOf={asOf} />
              <DealActivityList deal={deal} loan={loan} isActiveDeal={false} onRemoved={() => {}} />
              {deal.completion && (
                <Text style={styles.completionText}>
                  {t('mortgage.closedAt', { amount: formatCurrency(deal.completion.closingBalance, loan.currency) })}
                </Text>
              )}
              <View style={styles.completedActions}>
                <TimelineAction
                  label={t('saved.view')}
                  onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}
                  style={styles.completedAction}
                />
                {canEditDeal(loan, deal.id) ? (
                  <TimelineAction
                    label={t('mortgage.editDeal')}
                    onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}?correct=1`)}
                    variant={ButtonVariant.Ghost}
                    style={styles.completedAction}
                  />
                ) : null}
                {canDeleteDeal(loan, deal.id) ? (
                  <TimelineAction
                    label={t('mortgage.deleteDeal')}
                    onPress={() => deleteDeal(deal)}
                    variant="danger"
                    style={styles.completedAction}
                  />
                ) : null}
              </View>
            </Card>
          </View>
        ))}

        {!timeline.initialDealId && hasDeals ? (
          <View style={styles.timelineItem}>
            <View style={styles.nodeStart} />
            <Text style={styles.startText}>{t('mortgage.noActiveDealYet')}</Text>
          </View>
        ) : null}
      </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  topAction: { marginBottom: spacing.md },
  timelineShell: { position: 'relative', paddingLeft: 42 },
  rail: {
    position: 'absolute',
    left: 13,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colours.border,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  warningList: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  nodeMuted: {
    position: 'absolute',
    left: -42,
    top: 24,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  nodeActive: {
    position: 'absolute',
    left: -46,
    top: 31,
    width: 36,
    height: 36,
    borderRadius: radii.full,
    borderWidth: 4,
    borderColor: colours.teal,
    backgroundColor: colours.white,
  },
  nodeComplete: {
    position: 'absolute',
    left: -42,
    top: 24,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colours.textSecondary,
    backgroundColor: colours.background,
  },
  nodeStart: {
    position: 'absolute',
    left: -42,
    top: 0,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  futureCard: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colours.border,
  },
  currentCard: {
    borderTopWidth: 4,
    borderTopColor: colours.teal,
  },
  pastCard: {},
  noDealsCard: {
    marginBottom: spacing.md,
  },
  noDealsTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
  },
  noDealsText: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleGroup: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  futureTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    color: colours.textPrimary,
    lineHeight: 25,
    marginTop: spacing.xxs,
  },
  currentKicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.primary,
    textTransform: 'uppercase',
  },
  currentTitle: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes.xl,
    color: colours.primary,
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  pastTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    color: colours.textPrimary,
    lineHeight: 25,
    marginTop: spacing.xxs,
  },
  meta: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  draftHelp: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  futureActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  dealBalances: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  dealStats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  dealStat: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colours.white,
  },
  dealSavings: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colours.successBorder,
    borderRadius: radii.input,
    backgroundColor: colours.successSurface,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  dealSavingsStat: {
    flex: 1,
    padding: spacing.sm,
  },
  statLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.primary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  statValueAccent: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.secondary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  currentActions: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  currentPrimaryAction: {
    alignSelf: 'stretch',
  },
  timelineActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timelineActionFill: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  timelineAction: {
    minHeight: 42,
    borderRadius: radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  timelineActionLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  warningCard: {
    borderColor: colours.error,
    borderWidth: 1,
  },
  warningTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.base,
    color: colours.error,
  },
  warningText: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    marginTop: 6,
    lineHeight: 20,
  },
  completedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  completedAction: {
    flexGrow: 1,
    flexBasis: '29%',
    minWidth: 96,
  },
  completionText: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  startText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.md,
    color: colours.textSecondary,
    paddingTop: spacing.xxs,
  },
  activityList: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.xs,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  activityRowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activityType: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  activityAmount: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  activityDate: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    flexShrink: 0,
  },
});

const timelineActionStyles = StyleSheet.create({
  primary: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
  secondary: {
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.borderSoft,
  },
  ghost: {
    backgroundColor: colours.surface,
    borderColor: colours.border,
  },
  danger: {
    backgroundColor: colours.errorSurface,
    borderColor: colours.errorSurface,
  },
});

const timelineActionLabelStyles = StyleSheet.create({
  primary: {
    color: colours.white,
  },
  secondary: {
    color: colours.primary,
  },
  ghost: {
    color: colours.textSecondary,
  },
  danger: {
    color: colours.error,
  },
});
