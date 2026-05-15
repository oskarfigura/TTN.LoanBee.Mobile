import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { mortgageEventLabelKey } from '@/components/loans/MortgageEventForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/currency/format';
import { getMortgageTrackerSummary } from '@/mortgage/tracker';
import { buildSavedLoanDisplayDetails, buildSavedLoanSummary } from '@/loans/loanInsightSummary';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { MortgageEvent, SavedLoan } from '@/types/SavedLoan';
import { colours, fontFaces, fontSizes, radii, spacing } from '@/theme';
import { DashboardPinButton } from '@/components/loans/DashboardPinButton';
import { LoanInsightCard } from '@/components/loans/LoanInsightCard';
import { PlusIcon } from '@/components/loans/LoanIcons';
import { MortgageTimelineView } from '@/components/loans/MortgageTimelineView';
import { SavedLoanProgressBar } from '@/components/loans/SavedLoanProgressBar';
import { formatFriendlyDate } from '@/utils/date';

interface Props {
  loan: SavedLoan;
  onTogglePinned: () => void;
  onLoanUpdated?: () => void;
}

const eventIcon = (event: MortgageEvent) => {
  if (event.type === 'balanceCheckpoint') return 'B';
  if (event.type === 'missedPayment') return '!';
  if (event.type === 'paymentHoliday') return 'P';
  if (event.type === 'note') return 'N';
  return '+';
};

export const MortgageGroupDetail = ({ loan, onTogglePinned, onLoanUpdated }: Props) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);
  const summary = getMortgageTrackerSummary(loan);
  const currentDeal = summary.currentDeal;
  const draftDeal = summary.nextDraftDeal;
  const result = useMemo(() => getResultForSavedLoan(loan), [loan]);
  const displayDetails = useMemo(() => buildSavedLoanDisplayDetails(loan), [loan]);
  const insightSummary = useMemo(() => (
    buildSavedLoanSummary(loan, result, new Date(), i18n.language)
  ), [i18n.language, loan, result]);
  const navigateFromPicker = (href: string) => {
    setPickerVisible(false);
    router.push(href as Parameters<typeof router.push>[0]);
  };

  return (
    <View>
      <LoanInsightCard
        summary={insightSummary}
        density="full"
        title={loan.nickname}
        subtitle={displayDetails.lender || t('saved.category.mortgage')}
        headerAction={(
          <DashboardPinButton
            pinned={loan.pinnedToDashboard}
            onPress={onTogglePinned}
            style={styles.pinButton}
          />
        )}
        showProgress
        progressContent={<SavedLoanProgressBar loan={loan} result={result} summary={insightSummary} />}
      />

      <View style={styles.timelineSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('mortgage.dealTimeline')}</Text>
          <Button
            label={t('mortgage.addDeal')}
            leftIcon={<PlusIcon color={colours.primaryInk} size={18} />}
            onPress={() => router.push(`/saved/${loan.id}/deals/new`)}
            variant="icon-pill"
            style={styles.addDealButton}
          />
        </View>
        <MortgageTimelineView loan={loan} showFooterAction={false} onLoanUpdated={onLoanUpdated} />
      </View>

      <Card style={styles.card}>
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>{t('mortgage.recentActivity')}</Text>
          <Button
            label={t('mortgage.addActivity')}
            onPress={() => setPickerVisible(true)}
            variant="icon-pill"
            style={styles.addActivityButton}
          />
        </View>
        {summary.recentEvents.length > 0 ? summary.recentEvents.map(event => (
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
        )) : (
          <TouchableOpacity
            style={styles.emptyActivity}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.84}
          >
            <Text style={styles.empty}>{t('mortgage.noEventsYet')}</Text>
            <Text style={styles.emptyAction}>{t('mortgage.addActivity')}</Text>
          </TouchableOpacity>
        )}
      </Card>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('mortgage.addActivity')}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} activeOpacity={0.84}>
                <Text style={styles.closeText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.optionList}>
              {currentDeal ? (
                <>
                  <Text style={styles.optionGroupTitle}>{t('mortgage.eventGroup')}</Text>
                  <ActivityOption
                    title={t('mortgage.addOverpayment')}
                    description={t('mortgage.addOverpaymentHelp')}
                    marker="+"
                    onPress={() => navigateFromPicker(`/saved/${loan.id}/events/new?type=lumpOverpayment`)}
                  />
                  <ActivityOption
                    title={t('mortgage.recordBalance')}
                    description={t('mortgage.recordBalanceHelp')}
                    marker="B"
                    onPress={() => navigateFromPicker(`/saved/${loan.id}/events/new?type=balanceCheckpoint`)}
                  />
                  <ActivityOption
                    title={t('mortgage.addNote')}
                    description={t('mortgage.addNoteHelp')}
                    marker="N"
                    onPress={() => navigateFromPicker(`/saved/${loan.id}/events/new?type=note`)}
                  />
                  <ActivityOption
                    title={t('mortgage.eventMissedPayment')}
                    description={t('mortgage.missedPaymentHelp')}
                    marker="!"
                    onPress={() => navigateFromPicker(`/saved/${loan.id}/events/new?type=missedPayment`)}
                  />
                  <ActivityOption
                    title={t('mortgage.eventPaymentHoliday')}
                    description={t('mortgage.paymentHolidayHelp')}
                    marker="P"
                    onPress={() => navigateFromPicker(`/saved/${loan.id}/events/new?type=paymentHoliday`)}
                  />
                </>
              ) : null}

              <Text style={styles.optionGroupTitle}>{t('mortgage.dealGroup')}</Text>
              <ActivityOption
                title={t('mortgage.addNextDeal')}
                description={t('mortgage.addNextDealHelp')}
                marker="D"
                onPress={() => navigateFromPicker(`/saved/${loan.id}/deals/new`)}
              />
              {currentDeal ? (
                <ActivityOption
                  title={t('mortgage.editCurrentDeal')}
                  description={t('mortgage.editCurrentDealHelp')}
                  marker="E"
                  onPress={() => navigateFromPicker(`/saved/${loan.id}/deals/${currentDeal.id}`)}
                />
              ) : null}
              {draftDeal ? (
                <ActivityOption
                  title={t('mortgage.editDraftDeal')}
                  description={t('mortgage.editDraftDealHelp')}
                  marker="R"
                  onPress={() => navigateFromPicker(`/saved/${loan.id}/deals/${draftDeal.id}`)}
                />
              ) : null}
              {currentDeal?.status === 'active' ? (
                <ActivityOption
                  title={t('mortgage.completeCurrentDeal')}
                  description={t('mortgage.completeCurrentDealHelp')}
                  marker="C"
                  onPress={() => navigateFromPicker(`/saved/${loan.id}/complete-current`)}
                />
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const ActivityOption = ({
  title,
  description,
  marker,
  onPress,
}: {
  title: string;
  description: string;
  marker: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.84}>
    <View style={styles.optionMarker}>
      <Text style={styles.optionMarkerText}>{marker}</Text>
    </View>
    <View style={styles.optionCopy}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroCopy: { flex: 1, paddingRight: 12 },
  pinButton: {
    marginBottom: 0,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  addDealButton: {
    flexShrink: 0,
  },
  lender: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginBottom: 4,
  },
  title: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes['3xl'],
    color: colours.primary,
  },
  balanceCard: { marginBottom: 14 },
  card: { marginBottom: 14 },
  kicker: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    textTransform: 'uppercase',
  },
  balance: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes['3xl'],
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
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    color: colours.textPrimary,
  },
  statSuffix: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  metric: { flex: 1 },
  metricLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  metricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.primary,
    marginTop: 4,
  },
  sectionTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    color: colours.primary,
  },
  timelineSection: {
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  addActivityButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
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
    ...fontFaces.heading.bold,
    fontSize: fontSizes.base,
    color: colours.primary,
  },
  eventCopy: { flex: 1 },
  eventTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  eventMeta: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 3,
  },
  eventDate: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  empty: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  emptyActivity: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surface,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  emptyAction: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
    marginTop: spacing.xs,
  },
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colours.modalScrim,
    padding: spacing.md,
  },
  modalCard: {
    maxHeight: '86%',
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colours.borderSoft,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    color: colours.primary,
  },
  closeText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  optionList: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  optionGroupTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceRaised,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  optionMarker: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colours.focusRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionMarkerText: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  optionDescription: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
  },
});
