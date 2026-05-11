import React, { useMemo } from 'react';
import { Alert, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlusIcon } from '@/components/loans/LoanIcons';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import {
  canDeleteDeal,
  formatDealDuration,
  getCurrentDeal,
  getDraftDeals,
  getPublishedDeals,
  getTimelineWarnings,
  removeLatestDealAndEvents,
} from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, fonts, fontSizes, fontWeights, radii, spacing } from '@/theme';
import { LoanDeal, SavedLoan } from '@/types/SavedLoan';
import { formatFriendlyDate, formatFriendlyDateRange } from '@/utils/date';

interface Props {
  loan: SavedLoan;
  showFooterAction?: boolean;
  onLoanUpdated?: (loan: SavedLoan) => void;
}

export const MortgageWarningBanners = ({ loan }: { loan: SavedLoan }) => {
  const warnings = useMemo(() => getTimelineWarnings(loan), [loan]);

  if (warnings.length === 0) return null;

  return (
    <View style={styles.warningList}>
      {warnings.map(warning => (
        <Card key={`${warning.type}-${warning.dealId ?? 'group'}`} style={styles.warningCard}>
          <Text style={styles.warningTitle}>{warning.title}</Text>
          <Text style={styles.warningText}>{warning.message}</Text>
        </Card>
      ))}
    </View>
  );
};

const StatusBadge = ({ label, variant = 'neutral' }: { label: string; variant?: 'neutral' | 'active' | 'success' }) => (
  <Badge label={label} variant={variant} />
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

const DealStats = ({ deal, currency }: { deal: LoanDeal; currency: CurrencyCode }) => {
  const { t, i18n } = useTranslation();

  return (
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
  );
};

export const MortgageTimelineView = ({ loan, showFooterAction = true, onLoanUpdated }: Props) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const timeline = useMemo(() => {
    const publishedDeals = getPublishedDeals(loan);

    return {
      drafts: getDraftDeals(loan),
      current: getCurrentDeal(loan),
      completed: publishedDeals.filter(deal => deal.status === 'completed').reverse(),
      initialDealId: publishedDeals[0]?.id,
    };
  }, [loan]);
  const hasDeals = loan.deals.length > 0;
  const addDealButton = (
    <Button
      label={hasDeals ? t('mortgage.addNextDeal') : t('mortgage.addFirstDeal')}
      leftIcon={<PlusIcon color={colours.primaryInk} size={18} />}
      onPress={() => router.push(`/saved/${loan.id}/deals/new`)}
      variant="secondary"
    />
  );
  const deleteDeal = (deal: LoanDeal) => {
    if (!canDeleteDeal(loan, deal.id)) return;

    const isDraft = deal.status === 'draft';
    Alert.alert(
      isDraft ? t('mortgage.deleteDraftTitle') : t('mortgage.deleteDealTitle'),
      isDraft ? t('mortgage.deleteDraftMessage') : t('mortgage.deleteDealMessage', { name: deal.name }),
      [
        { text: t('results.cancelLeave'), style: 'cancel' },
        {
          text: isDraft ? t('mortgage.deleteDraft') : t('mortgage.deleteDeal'),
          style: 'destructive',
          onPress: () => {
            const updatedLoan = removeLatestDealAndEvents(loan, deal.id);
            savedLoansStorage.update(updatedLoan);
            onLoanUpdated?.(updatedLoan);
          },
        },
      ],
    );
  };

  return (
    <View>
      {showFooterAction ? (
        <View style={styles.topAction}>
          {addDealButton}
        </View>
      ) : null}

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
              <View style={styles.futureActions}>
                <TimelineAction
                  label={t('mortgage.editDraftDeal')}
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
              <DealStats deal={timeline.current} currency={loan.currency} />
              <View style={styles.currentActions}>
                <TimelineAction
                  label={t('mortgage.completeCurrentDeal')}
                  onPress={() => router.push(`/saved/${loan.id}/complete-current`)}
                  variant="primary"
                  style={styles.currentPrimaryAction}
                />
                <View style={styles.timelineActionRow}>
                  <TimelineAction
                    label={t('mortgage.editDeal')}
                    onPress={() => router.push(`/saved/${loan.id}/deals/${timeline.current?.id}`)}
                    style={styles.timelineActionFill}
                  />
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
              <DealStats deal={deal} currency={loan.currency} />
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
                <TimelineAction
                  label={t('mortgage.correctDeal')}
                  onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}?correct=1`)}
                  variant="ghost"
                  style={styles.completedAction}
                />
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

        {!timeline.initialDealId ? (
          <View style={styles.timelineItem}>
            <View style={styles.nodeStart} />
            <Text style={styles.startText}>{t('mortgage.mortgageStart')}</Text>
          </View>
        ) : null}
      </View>
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  futureTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    lineHeight: 25,
    marginTop: spacing.xxs,
  },
  currentKicker: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
    textTransform: 'uppercase',
  },
  currentTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  pastTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    lineHeight: 25,
    marginTop: spacing.xxs,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  futureActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  dealStats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  dealStat: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colours.white,
  },
  statLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.primary,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
  },
  warningCard: {
    borderColor: colours.error,
    borderWidth: 1,
  },
  warningTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.error,
  },
  warningText: {
    fontFamily: fonts.body,
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
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  startText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    paddingTop: spacing.xxs,
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
