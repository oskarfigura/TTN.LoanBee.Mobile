import React, { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuickActionTile } from '@/components/ui/QuickActionTile';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  BalanceIcon,
  CalculatorIcon,
  PaymentIcon,
  SwitchIcon,
  TimelineIcon,
} from '@/components/loans/LoanIcons';
import { formatCurrency } from '@/currency/format';
import { getMortgageTrackerSummary } from '@/mortgage/tracker';
import { SavedLoan, MortgageEvent } from '@/types/SavedLoan';
import { colours, layout, radii, spacing } from '@/theme';

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
      <AppText variant="labelMd" tone="accent">{event.type === 'balanceCheckpoint' ? 'B' : '+'}</AppText>
    </View>
    <View style={styles.eventCopy}>
      <AppText variant="title3">{eventTitle(event)}</AppText>
      <AppText variant="bodySm" tone="muted" style={styles.eventMeta}>
        {event.balance !== undefined
          ? `Updated to ${formatCurrency(event.balance, currency)}`
          : event.amount !== undefined
            ? `${formatCurrency(event.amount, currency)} applied`
            : event.note || event.date}
      </AppText>
    </View>
    <AppText variant="helper" tone="muted">{event.date}</AppText>
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
  const originalBalance = mortgageSummary?.originalBalance ?? loan.formSnapshot.loanAmount;
  const savings = mortgageSummary?.overpaymentSavingsEstimate ?? 0;
  const interestPaid = mortgageSummary?.interestPaidEstimate ?? 0;

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
          <AppText variant="bodyMd" tone="muted">{loan.lender || currentDeal?.lender || t(`saved.category.${loan.category}`)}</AppText>
          <AppText variant="display" tone="accent" style={styles.dashboardTitle}>{loan.nickname}</AppText>
        </View>

        <Card style={styles.balanceCard} variant="accent" padding={layout.cardPadding}>
          <View style={styles.heroTopBorder} />
          <View style={styles.heroHeader}>
            <View style={styles.heroIdentity}>
              <View style={styles.heroIconWrap}>
                <BalanceIcon />
              </View>
              <View style={styles.heroCopy}>
                <AppText variant="title2" tone="accent">{loan.nickname}</AppText>
                <AppText variant="bodySm" tone="muted">{loan.lender || currentDeal?.lender || t(`saved.category.${loan.category}`)}</AppText>
              </View>
            </View>
            <Badge label="On track" variant="success" />
          </View>
          <AppText variant="labelMd" tone="muted" style={styles.cardKicker}>{t('mortgage.currentBalance')}</AppText>
          <AppText variant="metricLg" tone="accent" style={styles.balanceAmount}>{formatCurrency(balance, loan.currency)}</AppText>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <AppText variant="labelSm" tone="muted" style={styles.statLabel}>{t('results.monthlyPayment')}</AppText>
              <AppText variant="title2">
                {formatCurrency(currentDeal?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments, loan.currency)}
              </AppText>
            </View>
            <View style={styles.balanceStat}>
              <AppText variant="labelSm" tone="muted" style={styles.statLabel}>{t('calculator.interestRate')}</AppText>
              <AppText variant="title2">
                {currentDeal ? `${currentDeal.interestRate}%` : `${loan.formSnapshot.interest}%`}
                <AppText variant="bodySm" tone="muted" style={styles.statSuffix}>
                  {currentDeal?.repaymentType === 'interestOnly' ? ' IO' : ' Fixed'}
                </AppText>
              </AppText>
            </View>
          </View>
        </Card>

        <Card style={styles.progressCard} padding={layout.cardPadding}>
          <View style={styles.progressHeader}>
            <AppText variant="labelMd" tone="muted">{isMortgage ? t('mortgage.balancePaidShort') : t('saved.loanProgress')}</AppText>
            <AppText variant="title2" tone="success">{formatPercent(progress)}</AppText>
          </View>
          <ProgressBar progress={progress} color={colours.tealDeep} />
          <View style={styles.progressLabels}>
            <AppText variant="helper" tone="muted">{t('mortgage.paidAmount', { amount: formatCurrency(paid, loan.currency) })}</AppText>
            <AppText variant="helper" tone="muted">{t('mortgage.totalAmount', { amount: formatCurrency(originalBalance, loan.currency) })}</AppText>
          </View>
        </Card>

        <Card style={styles.breakdownCard} padding={layout.cardPadding}>
          <SectionHeader title={t('mortgage.financialBreakdown')} />
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownItem}>
              <AppText variant="bodySm" tone="muted">{t('mortgage.paidAmount', { amount: formatCurrency(paid, loan.currency) })}</AppText>
            </View>
            <View style={styles.breakdownItem}>
              <AppText variant="bodySm" tone="muted">{t('mortgage.estimatedInterestPaid')}</AppText>
              <AppText variant="title3">{formatCurrency(interestPaid, loan.currency)}</AppText>
            </View>
            <View style={styles.breakdownItem}>
              <AppText variant="bodySm" tone="muted">{t('mortgage.totalAmount', { amount: formatCurrency(originalBalance, loan.currency) })}</AppText>
            </View>
            <View style={[styles.breakdownItem, styles.breakdownItemAccent]}>
              <AppText variant="bodySm" tone="success">{t('mortgage.estimatedSavings')}</AppText>
              <AppText variant="title2" tone="success">{formatCurrency(savings, loan.currency)}</AppText>
            </View>
          </View>
        </Card>

        <Card style={styles.timelineCard} padding={layout.cardPadding}>
          <SectionHeader title={t('mortgage.dealTimeline')} />
          <View style={styles.timelinePreview}>
            <View style={styles.timelineDotActive} />
            <View>
              <AppText variant="labelMd" tone="success">{t('mortgage.currentDealEnds')}</AppText>
              <AppText variant="bodyLg">{currentDeal?.endDate ?? loan.formSnapshot.startDate}</AppText>
            </View>
          </View>
          {mortgageSummary?.nextDraftDeal && (
            <View style={styles.timelinePreviewMuted}>
              <View style={styles.timelineDotMuted} />
              <View>
                <AppText variant="labelMd" tone="muted">{t('mortgage.nextDealDraft')}</AppText>
                <AppText variant="bodyMd" tone="muted">{mortgageSummary.nextDraftDeal.startDate}</AppText>
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.timelineCard} padding={layout.cardPadding}>
          <SectionHeader title={t('mortgage.recentEvents')} />
          {(mortgageSummary?.recentEvents.length ?? 0) > 0 ? (
            mortgageSummary?.recentEvents.map(event => (
              <EventRow key={event.id} event={event} currency={loan.currency} />
            ))
          ) : (
            <AppText variant="bodySm" tone="muted" style={styles.emptyEvents}>{t('mortgage.noEventsYet')}</AppText>
          )}
        </Card>

        <View style={styles.quickActions}>
          <QuickActionTile
            label={t('mortgage.recordBalance')}
            icon={<BalanceIcon />}
            onPress={() => onOpenDetails()}
          />
          <QuickActionTile
            label={t('mortgage.addOverpayment')}
            icon={<PaymentIcon />}
            onPress={() => onOpenDetails()}
          />
          <QuickActionTile
            label={t('mortgage.addNextDeal')}
            icon={<SwitchIcon />}
            onPress={() => onOpenDetails()}
          />
          <QuickActionTile
            label={t('mortgage.dealTimeline')}
            icon={<TimelineIcon />}
            onPress={() => onOpenDetails()}
          />
        </View>
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
      <ScreenHeader title={t('mortgage.dashboard')} variant="top-level" />
      {loans.length > 1 && (
        <View style={styles.carouselHint}>
          <AppText variant="helper" tone="muted" style={styles.carouselHintText}>
            {t('mortgage.dashboardPosition', { current: activeIndex + 1, total: loans.length })}
          </AppText>
          <View style={styles.dots}>
            {loans.map((loan, index) => (
              <View
                key={loan.id}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
          <AppText variant="helper" tone="muted" style={styles.carouselHintText}>{t('mortgage.dashboardSwipeHint')}</AppText>
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
          label={t('results.newCalculation')}
          onPress={onNewCalculation}
          leftIcon={<CalculatorIcon />}
          style={styles.newCalculationButton}
        />
        <Button
          label={t('mortgage.viewDetails')}
          onPress={() => openLoanDetails(activeLoan.id)}
          variant="secondary"
          style={styles.detailsButton}
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
    paddingHorizontal: layout.headerPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  titleBlock: { marginBottom: spacing.lg },
  dashboardTitle: {
    marginTop: spacing.xxs,
  },
  balanceCard: { marginBottom: spacing.md, overflow: 'hidden' },
  heroTopBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    height: 3,
    backgroundColor: colours.tealDeep,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  cardKicker: {
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  balanceAmount: {
    marginTop: spacing.sm,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colours.borderSoft,
    marginVertical: spacing.lg,
  },
  balanceStats: { flexDirection: 'row', gap: spacing.lg },
  balanceStat: { flex: 1 },
  statLabel: {
    marginBottom: spacing.xxs,
  },
  statSuffix: {
    marginLeft: spacing.xxs,
  },
  progressCard: { marginBottom: spacing.md },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  breakdownCard: {
    marginBottom: spacing.md,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  breakdownItem: {
    width: '47%',
    minHeight: 76,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colours.borderSoft,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  breakdownItemAccent: {
    borderLeftColor: colours.tealDeep,
    backgroundColor: colours.successSurface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  timelineCard: { marginBottom: spacing.md },
  timelinePreview: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  timelinePreviewMuted: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.focusRing,
  },
  eventCopy: { flex: 1 },
  eventMeta: {
    marginTop: 3,
  },
  emptyEvents: { marginTop: spacing.sm },
  quickActions: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  carouselHint: {
    paddingHorizontal: layout.headerPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.borderSoft,
    backgroundColor: colours.background,
  },
  carouselHintText: {
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
    backgroundColor: colours.borderSoft,
  },
  dotActive: {
    width: 18,
    backgroundColor: colours.primary,
  },
  footer: {
    paddingHorizontal: layout.headerPadding,
    paddingTop: spacing.sm,
    backgroundColor: colours.background,
  },
  detailsButton: {
    marginTop: spacing.sm,
  },
  newCalculationButton: {
  },
});
