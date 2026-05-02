import React, { useMemo, useState } from 'react';
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
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  CalculatorIcon,
  ChevronRightIcon,
} from '@/components/loans/LoanIcons';
import { formatCurrency } from '@/currency/format';
import { getMortgageTrackerSummary } from '@/mortgage/tracker';
import { SavedLoan } from '@/types/SavedLoan';
import { colours, layout, spacing } from '@/theme';
import { monthsBetween } from '@/utils/date';

interface Props {
  loans: SavedLoan[];
  onNewCalculation: () => void;
}

const FOOTER_HEIGHT = 56;

const formatPercent = (value: number) => `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;

const clamp = (value: number) => Math.max(0, Math.min(value, 1));

const getStandardLoanSummary = (loan: SavedLoan, asOf: Date) => {
  const downPayment = loan.formSnapshot.downPaymentType === 'PERCENT'
    ? (loan.formSnapshot.downPayment / 100) * loan.formSnapshot.loanAmount
    : loan.formSnapshot.downPayment;
  const originalPrincipal = Math.max(loan.formSnapshot.loanAmount - downPayment, 0);
  const monthlyRate = loan.formSnapshot.interest / 100 / 12;
  const elapsedMonths = Math.min(
    monthsBetween(loan.formSnapshot.startDate, asOf),
    loan.resultSnapshot.totalTermInMonths,
  );
  let currentBalance = originalPrincipal;

  for (let month = 0; month < elapsedMonths && currentBalance > 0; month++) {
    const interestPayment = currentBalance * monthlyRate;
    const principalPayment = Math.max(0, loan.resultSnapshot.monthlyPayments - interestPayment);
    currentBalance = Math.max(0, currentBalance - principalPayment);
  }

  const paidSoFar = Math.max(originalPrincipal - currentBalance, 0);

  return {
    currentBalance,
    paidSoFar,
    moneyProgress: originalPrincipal > 0 ? paidSoFar / originalPrincipal : 0,
  };
};

const SummaryMetric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.metricItem}>
    <AppText variant="labelSm" tone="muted" style={styles.metricLabel}>
      {label}
    </AppText>
    <AppText variant="title3" style={styles.metricValue}>
      {value}
    </AppText>
  </View>
);

const ProgressRow = ({
  label,
  progress,
  color,
}: {
  label: string;
  progress: number;
  color: string;
}) => (
  <View style={styles.progressRow}>
    <View style={styles.progressRowHeader}>
      <AppText variant="labelMd" tone="muted">
        {label}
      </AppText>
      <AppText variant="labelMd" tone="accent">
        {formatPercent(progress)}
      </AppText>
    </View>
    <ProgressBar progress={progress} color={color} trackStyle={styles.progressTrack} />
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
  const summary = useMemo(() => {
    const asOf = new Date();
    const elapsedMonths = monthsBetween(loan.formSnapshot.startDate, asOf);
    const timeProgress = clamp(elapsedMonths / Math.max(loan.resultSnapshot.totalTermInMonths, 1));

    if (isMortgage) {
      const mortgageSummary = getMortgageTrackerSummary(loan, asOf);
      const currentDeal = mortgageSummary.currentDeal ?? loan.deals.find(deal => deal.status === 'active') ?? loan.deals[0];

      return {
        lender: loan.lender || currentDeal?.lender || t(`saved.category.${loan.category}`),
        monthlyPayment: currentDeal?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments,
        interestRate: currentDeal?.interestRate ?? loan.formSnapshot.interest,
        currentBalance: mortgageSummary.currentBalance,
        paidSoFar: mortgageSummary.principalPaid,
        timeProgress,
        moneyProgress: clamp(mortgageSummary.balanceProgress),
      };
    }

    const standardLoanSummary = getStandardLoanSummary(loan, asOf);

    return {
      lender: loan.lender || t(`saved.category.${loan.category}`),
      monthlyPayment: loan.resultSnapshot.monthlyPayments,
      interestRate: loan.formSnapshot.interest,
      currentBalance: standardLoanSummary.currentBalance,
      paidSoFar: standardLoanSummary.paidSoFar,
      timeProgress,
      moneyProgress: clamp(standardLoanSummary.moneyProgress),
    };
  }, [isMortgage, loan, t]);

  return (
    <View style={[styles.slide, { width }]}>
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={onOpenDetails}
        style={styles.cardPressable}
      >
        <Card style={styles.summaryCard} variant="accent" padding={layout.cardPadding}>
          <View style={styles.cardHeader}>
            <View style={styles.headerCopy}>
              <AppText variant="display" tone="accent" numberOfLines={2}>
                {loan.nickname}
              </AppText>
              <AppText variant="bodyMd" tone="muted" numberOfLines={1} style={styles.lender}>
                {summary.lender}
              </AppText>
            </View>
            <Badge label={t(`saved.category.${loan.category}`)} variant="ghost" style={styles.typeBadge} />
          </View>

          <View style={styles.metricsGrid}>
            <SummaryMetric
              label={t('results.monthlyPayment')}
              value={formatCurrency(summary.monthlyPayment, loan.currency)}
            />
            <SummaryMetric
              label={t('calculator.interestRate')}
              value={`${summary.interestRate}%`}
            />
            <SummaryMetric
              label={t('mortgage.currentBalance')}
              value={formatCurrency(summary.currentBalance, loan.currency)}
            />
            <SummaryMetric
              label={t('mortgage.paidSoFar')}
              value={formatCurrency(summary.paidSoFar, loan.currency)}
            />
          </View>

          <View style={styles.progressSection}>
            <ProgressRow
              label={t('mortgage.timeProgress')}
              progress={summary.timeProgress}
              color={colours.primary}
            />
            <ProgressRow
              label={t('mortgage.moneyProgress')}
              progress={summary.moneyProgress}
              color={isMortgage ? colours.teal : colours.secondaryBright}
            />
          </View>

          <View style={styles.cardFooter}>
            <AppText variant="helper" tone="muted">
              {t('mortgage.tapForDetails')}
            </AppText>
            <ChevronRightIcon color={colours.primary} />
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );
};

export const MortgageDashboard = ({ loans, onNewCalculation }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const slideWidth = width;

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
      <View style={[styles.content, { paddingBottom: FOOTER_HEIGHT + Math.max(insets.bottom, spacing.xs) }]}>
        <ScrollView
          style={styles.carousel}
          contentContainerStyle={styles.carouselContent}
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
        {loans.length > 1 ? (
          <View style={styles.indicatorBlock}>
            <View style={styles.dots}>
              {loans.map((loan, index) => (
                <View
                  key={loan.id}
                  style={[styles.dot, index === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
      <View style={[styles.footer, { paddingBottom: 0 }]}>
        <Button
          label={t('calculator.generate')}
          onPress={onNewCalculation}
          rightIcon={<CalculatorIcon />}
          style={styles.newCalculationButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colours.background },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  carousel: {
    flexGrow: 0,
  },
  carouselContent: {
    alignItems: 'stretch',
    paddingTop: spacing.xxs,
  },
  cardPressable: {
    width: '100%',
  },
  slide: {
    paddingHorizontal: layout.headerPadding,
    paddingBottom: spacing.md,
  },
  summaryCard: {
    minHeight: 372,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  lender: {
    marginTop: spacing.xs,
  },
  typeBadge: {
    marginTop: spacing.xxs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  metricItem: {
    width: '47%',
    backgroundColor: colours.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colours.border,
  },
  metricLabel: {
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: spacing.xs,
  },
  progressSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  progressRow: {
    gap: spacing.xs,
  },
  progressRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 10,
  },
  indicatorBlock: {
    alignItems: 'center',
    paddingHorizontal: layout.headerPadding,
    paddingTop: spacing.xxxs,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.headerPadding,
    paddingTop: 0,
    backgroundColor: colours.background,
  },
  cardFooter: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colours.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newCalculationButton: {
    width: '100%',
  },
});
