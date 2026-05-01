import React, { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CalculatorIcon } from '@/components/loans/LoanIcons';
import { formatCurrency } from '@/currency/format';
import { getMortgageTrackerSummary } from '@/mortgage/tracker';
import { SavedLoan, MortgageEvent } from '@/types/SavedLoan';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

interface Props {
  loans: SavedLoan[];
  onNewCalculation: () => void;
}

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const eventTitle = (event: MortgageEvent) => {
  if (event.type === 'lumpOverpayment') return 'Lump overpayment';
  if (event.type === 'missedPayment') return 'Missed payment';
  if (event.type === 'paymentHoliday') return 'Payment holiday';
  if (event.type === 'balanceCheckpoint') return 'Bank balance checkpoint';
  return 'Note';
};

const EventRow = ({ event, currency }: { event: MortgageEvent; currency: SavedLoan['currency'] }) => (
  <View style={styles.eventRow}>
    <View style={styles.eventIcon}>
      <Text style={styles.eventIconText}>{event.type === 'balanceCheckpoint' ? 'B' : '+'}</Text>
    </View>
    <View style={styles.eventCopy}>
      <Text style={styles.eventTitle}>{eventTitle(event)}</Text>
      <Text style={styles.eventMeta}>
        {event.balance !== undefined
          ? `Updated to ${formatCurrency(event.balance, currency)}`
          : event.amount !== undefined
            ? `${formatCurrency(event.amount, currency)} applied`
            : event.note || event.date}
      </Text>
    </View>
    <Text style={styles.eventDate}>{event.date}</Text>
  </View>
);

const LoanDashboardCard = ({
  loan,
  width,
  onOpenDetails,
}: {
  loan: SavedLoan;
  width: number;
  onOpenDetails: () => void;
}) => {
  const { t } = useTranslation();
  const isMortgage = loan.category === 'mortgage';
  const mortgageSummary = isMortgage ? getMortgageTrackerSummary(loan) : null;
  const currentDeal = mortgageSummary?.currentDeal ?? loan.deals.find(deal => deal.status === 'active') ?? loan.deals[0];
  const balance = mortgageSummary?.currentBalance ?? loan.formSnapshot.loanAmount;
  const paid = mortgageSummary?.principalPaid ?? Math.max(0, loan.formSnapshot.loanAmount - balance);
  const progress = mortgageSummary?.balanceProgress ?? 0;

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.slide}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={onOpenDetails}
        style={styles.cardPressable}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.lender}>{loan.lender || currentDeal?.lender || t(`saved.category.${loan.category}`)}</Text>
          <Text style={styles.dashboardTitle}>{loan.nickname}</Text>
        </View>

        <Card style={styles.balanceCard}>
          <Text style={styles.cardKicker}>{t('mortgage.currentBalance')}</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance, loan.currency)}</Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.statLabel}>{t('results.monthlyPayment')}</Text>
              <Text style={styles.statValue}>
                {formatCurrency(currentDeal?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments, loan.currency)}
              </Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={styles.statLabel}>{t('calculator.interestRate')}</Text>
              <Text style={styles.statValue}>
                {currentDeal ? `${currentDeal.interestRate}%` : `${loan.formSnapshot.interest}%`}
                <Text style={styles.statSuffix}>
                  {currentDeal?.repaymentType === 'interestOnly' ? ' IO' : ' Fixed'}
                </Text>
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardKicker}>{isMortgage ? t('mortgage.balancePaidShort') : t('saved.loanProgress')}</Text>
            <Text style={styles.progressPercent}>{formatPercent(progress)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressCaption}>{t('mortgage.paidAmount', { amount: formatCurrency(paid, loan.currency) })}</Text>
            <Text style={styles.progressCaption}>{t('mortgage.totalAmount', { amount: formatCurrency(mortgageSummary?.originalBalance ?? loan.formSnapshot.loanAmount, loan.currency) })}</Text>
          </View>
        </Card>

        <Card style={styles.timelineCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('mortgage.dealTimeline')}</Text>
          </View>
          <View style={styles.timelinePreview}>
            <View style={styles.timelineDotActive} />
            <View>
              <Text style={styles.timelineLabel}>{t('mortgage.currentDealEnds')}</Text>
              <Text style={styles.timelineDate}>{currentDeal?.endDate ?? loan.formSnapshot.startDate}</Text>
            </View>
          </View>
          {mortgageSummary?.nextDraftDeal && (
            <View style={styles.timelinePreviewMuted}>
              <View style={styles.timelineDotMuted} />
              <View>
                <Text style={styles.timelineLabelMuted}>{t('mortgage.nextDealDraft')}</Text>
                <Text style={styles.timelineDateMuted}>{mortgageSummary.nextDraftDeal.startDate}</Text>
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>{t('mortgage.recentEvents')}</Text>
          {(mortgageSummary?.recentEvents.length ?? 0) > 0 ? (
            mortgageSummary?.recentEvents.map(event => (
              <EventRow key={event.id} event={event} currency={loan.currency} />
            ))
          ) : (
            <Text style={styles.emptyEvents}>{t('mortgage.noEventsYet')}</Text>
          )}
        </Card>
      </TouchableOpacity>
    </ScrollView>
  );
};

export const MortgageDashboard = ({ loans, onNewCalculation }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const slideWidth = width;
  const activeLoan = loans[Math.min(activeIndex, loans.length - 1)] ?? loans[0];

  const openLoanDetails = (loanId: string) => {
    router.push(`/saved/${loanId}`);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), loans.length - 1));
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={t('mortgage.dashboard')} />
      {loans.length > 1 && (
        <View style={styles.carouselHint}>
          <Text style={styles.carouselHintText}>
            {t('mortgage.dashboardPosition', { current: activeIndex + 1, total: loans.length })}
          </Text>
          <View style={styles.dots}>
            {loans.map((loan, index) => (
              <View
                key={loan.id}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
          <Text style={styles.carouselHintText}>{t('mortgage.dashboardSwipeHint')}</Text>
        </View>
      )}
      <ScrollView
        style={styles.carousel}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
      >
        {loans.map(loan => (
          <LoanDashboardCard
            key={loan.id}
            loan={loan}
            width={slideWidth}
            onOpenDetails={() => openLoanDetails(loan.id)}
          />
        ))}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          label={t('mortgage.viewDetails')}
          onPress={() => openLoanDetails(activeLoan.id)}
          variant="secondary"
          style={styles.detailsButton}
        />
        <Button
          label={t('results.newCalculation')}
          onPress={onNewCalculation}
          leftIcon={<CalculatorIcon />}
          style={styles.newCalculationButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colours.background },
  carousel: { flex: 1 },
  cardPressable: { flex: 1 },
  slide: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  titleBlock: { marginBottom: 18 },
  lender: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginBottom: 4,
  },
  dashboardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  balanceCard: { marginBottom: 14 },
  cardKicker: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
    marginTop: 18,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colours.border,
    marginVertical: 18,
  },
  balanceStats: { flexDirection: 'row', gap: 20 },
  balanceStat: { flex: 1 },
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
  progressCard: { marginBottom: 14 },
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
  timelineCard: { marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  timelinePreview: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  timelinePreviewMuted: {
    flexDirection: 'row',
    gap: 14,
    opacity: 0.65,
  },
  timelineDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colours.teal,
    marginTop: 6,
  },
  timelineDotMuted: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colours.border,
    marginTop: 6,
  },
  timelineLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
  },
  timelineDate: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
    marginTop: 4,
  },
  timelineLabelMuted: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  timelineDateMuted: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colours.textSecondary,
    marginTop: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  emptyEvents: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 12,
  },
  carouselHint: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.background,
  },
  carouselHintText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginVertical: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colours.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: colours.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colours.background,
  },
  detailsButton: {
    marginBottom: 10,
  },
  newCalculationButton: {
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
});
