import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/currency/format';
import { getMortgageTrackerSummary, getTimelineWarnings } from '@/mortgage/tracker';
import { MortgageEvent, SavedLoan } from '@/types/SavedLoan';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { PinIcon } from '@/components/loans/LoanIcons';

interface Props {
  loan: SavedLoan;
  onTogglePinned: () => void;
  onViewCalculation: () => void;
}

const eventTitle = (event: MortgageEvent) => {
  if (event.type === 'lumpOverpayment') return 'Lump overpayment';
  if (event.type === 'missedPayment') return 'Missed payment';
  if (event.type === 'paymentHoliday') return 'Payment holiday';
  if (event.type === 'balanceCheckpoint') return 'Bank balance checkpoint';
  return 'Note';
};

export const MortgageGroupDetail = ({ loan, onTogglePinned, onViewCalculation }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const summary = getMortgageTrackerSummary(loan);
  const warnings = getTimelineWarnings(loan);
  const currentDeal = summary.currentDeal;

  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.lender}>{loan.lender || currentDeal?.lender || t('saved.category.mortgage')}</Text>
          <Text style={styles.title}>{loan.nickname}</Text>
        </View>
        <TouchableOpacity style={styles.pinPill} onPress={onTogglePinned}>
          <PinIcon color={colours.primary} size={14} />
          <Text style={styles.pinText}>
            {loan.pinnedToDashboard ? t('mortgage.pinned') : t('mortgage.pinToDashboard')}
          </Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.balanceCard}>
        <Text style={styles.kicker}>{t('mortgage.currentBalance')}</Text>
        <Text style={styles.balance}>{formatCurrency(summary.currentBalance, loan.currency)}</Text>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('results.monthlyPayment')}</Text>
            <Text style={styles.statValue}>{formatCurrency(currentDeal?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments, loan.currency)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('calculator.interestRate')}</Text>
            <Text style={styles.statValue}>
              {currentDeal?.interestRate ?? loan.formSnapshot.interest}%
              <Text style={styles.statSuffix}>{currentDeal?.repaymentType === 'interestOnly' ? ' IO' : ' Fixed'}</Text>
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.kicker}>{t('mortgage.balancePaidShort')}</Text>
          <Text style={styles.progressPercent}>{Math.round(summary.balanceProgress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${summary.balanceProgress * 100}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressCaption}>{t('mortgage.paidAmount', { amount: formatCurrency(summary.principalPaid, loan.currency) })}</Text>
          <Text style={styles.progressCaption}>{t('mortgage.totalAmount', { amount: formatCurrency(summary.originalBalance, loan.currency) })}</Text>
        </View>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t('mortgage.estimatedInterestPaid')}</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.interestPaidEstimate, loan.currency)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{t('mortgage.estimatedSavings')}</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.overpaymentSavingsEstimate, loan.currency)}</Text>
          </View>
        </View>
      </Card>

      {warnings.map(warning => (
        <Card key={`${warning.type}-${warning.dealId ?? 'group'}`} style={styles.warningCard}>
          <Text style={styles.warningTitle}>{warning.title}</Text>
          <Text style={styles.warningText}>{warning.message}</Text>
        </Card>
      ))}

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('mortgage.dealTimeline')}</Text>
          <TouchableOpacity onPress={() => router.push(`/saved/${loan.id}/timeline`)}>
            <Text style={styles.sectionLink}>{t('mortgage.viewFullTimeline')}</Text>
          </TouchableOpacity>
        </View>
        {summary.nextDraftDeal && (
          <View style={styles.timelineRow}>
            <View style={styles.timelineNodeMuted} />
            <View style={styles.timelineCopy}>
              <Text style={styles.timelineKicker}>{t('mortgage.future')}</Text>
              <Text style={styles.timelineTitle}>{summary.nextDraftDeal.name}</Text>
              <Text style={styles.timelineMeta}>{t('mortgage.startsOn', { date: summary.nextDraftDeal.startDate })}</Text>
            </View>
          </View>
        )}
        {currentDeal && (
          <View style={styles.timelineRow}>
            <View style={styles.timelineNodeActive} />
            <View style={styles.timelineCopy}>
              <Text style={styles.timelineKicker}>{t('mortgage.currentDeal')}</Text>
              <Text style={styles.timelineTitle}>{currentDeal.name}</Text>
              <Text style={styles.timelineMeta}>{currentDeal.startDate} - {currentDeal.endDate}</Text>
            </View>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>{t('mortgage.recentEvents')}</Text>
        {summary.recentEvents.length > 0 ? summary.recentEvents.map(event => (
          <View key={event.id} style={styles.eventRow}>
            <View style={styles.eventIcon}>
              <Text style={styles.eventIconText}>{event.type === 'balanceCheckpoint' ? 'B' : '+'}</Text>
            </View>
            <View style={styles.eventCopy}>
              <Text style={styles.eventTitle}>{eventTitle(event)}</Text>
              <Text style={styles.eventMeta}>
                {event.balance !== undefined
                  ? formatCurrency(event.balance, loan.currency)
                  : event.amount !== undefined
                    ? formatCurrency(event.amount, loan.currency)
                    : event.note || event.date}
              </Text>
            </View>
            <Text style={styles.eventDate}>{event.date}</Text>
          </View>
        )) : (
          <Text style={styles.empty}>{t('mortgage.noEventsYet')}</Text>
        )}
      </Card>

      <View style={styles.actions}>
        <Button label={t('mortgage.recordBalance')} onPress={() => router.push(`/saved/${loan.id}/events/new?type=balanceCheckpoint`)} variant="secondary" style={styles.action} />
        <Button label={t('mortgage.addOverpayment')} onPress={() => router.push(`/saved/${loan.id}/events/new?type=lumpOverpayment`)} variant="secondary" style={styles.action} />
        <Button label={t('mortgage.addNextDeal')} onPress={() => router.push(`/saved/${loan.id}/deals/new`)} variant="secondary" style={styles.action} />
        <Button label={t('mortgage.completeCurrentDeal')} onPress={() => router.push(`/saved/${loan.id}/complete-current`)} variant="secondary" style={styles.action} />
      </View>

      <Button label={t('saved.viewFullCalculation')} onPress={onViewCalculation} style={styles.primaryAction} />
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroCopy: { flex: 1, paddingRight: 12 },
  lender: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  pinPill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: 12,
    backgroundColor: colours.surface,
  },
  pinText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  balanceCard: { marginBottom: 14 },
  card: { marginBottom: 14 },
  kicker: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    textTransform: 'uppercase',
  },
  balance: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colours.border,
    marginVertical: 18,
  },
  statRow: { flexDirection: 'row', gap: 20 },
  stat: { flex: 1 },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  statSuffix: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  progressPercent: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.secondary,
  },
  progressTrack: {
    height: 14,
    backgroundColor: colours.border,
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colours.teal,
    borderRadius: 7,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  progressCaption: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  metric: { flex: 1 },
  metricLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  metricValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.primary,
    marginTop: 4,
  },
  warningCard: {
    borderColor: colours.error,
    borderWidth: 1,
    marginBottom: 14,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingBottom: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  sectionLink: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  timelineNodeMuted: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colours.border,
    marginTop: 4,
  },
  timelineNodeActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: colours.teal,
    marginTop: 4,
  },
  timelineCopy: { flex: 1 },
  timelineKicker: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  timelineTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginTop: 4,
  },
  timelineMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 4,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.focusRing,
  },
  eventIconText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  eventCopy: { flex: 1 },
  eventTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
  },
  eventMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 3,
  },
  eventDate: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  action: { flexBasis: '100%', flexGrow: 1 },
  primaryAction: { marginTop: 10 },
});
