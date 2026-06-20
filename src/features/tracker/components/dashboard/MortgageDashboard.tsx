import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
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
import { Button } from '@oskarfigura/ui-native';
import { FinancialDisclaimer } from '@/shared/ui/components/FinancialDisclaimer';
import { DashboardHeader } from '@/features/tracker/components/dashboard/DashboardHeader';
import { DashboardProgressGauge } from '@/features/tracker/components/dashboard/DashboardProgressGauge';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import {
  LoanDashboardProgress,
  buildSavedLoanDisplayDetails,
} from '@/shared/domain/loans/loanInsightSummary';
import { UserVisibleMetric, buildSavedLoanDisplayContract } from '@/shared/domain/loans/loanDisplayContract';
import { LoanCategoryTag } from '@/features/tracker/components/LoanCategoryTag';
import { getResultForSavedLoan } from '@/shared/domain/results/loanResultRoute';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';
import { colours, elevation, fontFaces, fontSizes, layout, spacing } from '@/shared/ui/theme';

interface Props {
  loans: SavedLoan[];
  onNewCalculation: () => void;
}

const FLOATING_ACTION_SPACE = 84;
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

const DashboardMetricPanel = ({
  metrics,
  progress,
}: {
  metrics: UserVisibleMetric[];
  progress: LoanDashboardProgress[];
}) => {
  const { t } = useTranslation();
  const timeProgress = progress.find(item => item.labelKey === 'mortgage.timeProgress');
  const elapsedMonths = Number(timeProgress?.caption.values?.elapsed ?? 0);
  const totalMonths = Number(timeProgress?.caption.values?.total ?? 0);
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
  const remainingTermCaptionKey = getRemainingTermCaptionKey(remainingMonths);
  const remainingTermValues = getRemainingTermValues(remainingMonths);

  return (
    <View style={styles.metricPanel}>
      {metrics.map((metric, index) => (
        <View
          key={`${metric.labelKey}-${index}`}
          style={[
            styles.dashboardMetricRow,
            index === 0 && styles.dashboardMetricRowWithAction,
            index === metrics.length - 1 && styles.dashboardMetricRowLast,
          ]}
        >
          <Text style={styles.dashboardMetricLabel} numberOfLines={1}>
            {t(metric.labelKey)}
          </Text>
          <Text style={styles.dashboardMetricValue} numberOfLines={1} adjustsFontSizeToFit>
            {metric.value}
          </Text>
          {metric.labelKey === 'results.payoffDate' && totalMonths > 0 ? (
            <Text style={styles.dashboardMetricHelper} numberOfLines={1}>
              {t(remainingTermCaptionKey, remainingTermValues)}
            </Text>
          ) : null}
        </View>
      ))}
      <View style={styles.editBubble}>
        <Icon icon={IconName.EditIcon} color={colours.primary} size={23} strokeWidth={1.8} />
      </View>
    </View>
  );
};

const LoanDashboardCard = React.memo(({
  loan,
  width,
  onOpenDetails,
}: {
  loan: SavedLoan;
  width: number;
  onOpenDetails: (loanId: string) => void;
}) => {
  const { i18n } = useTranslation();
  const { progress, dashboardMetrics, dealLender } = useMemo(() => {
    const result = getResultForSavedLoan(loan);
    const asOf = new Date();
    const displayDetails = buildSavedLoanDisplayDetails(loan, asOf);
    const contract = buildSavedLoanDisplayContract({
      loan,
      result,
      asOf,
      locale: i18n.language,
    });

    return {
      progress: contract.dashboardProgress,
      dashboardMetrics: contract.dashboardMetrics,
      dealLender: displayDetails.lender,
    };
  }, [i18n.language, loan]);

  return (
    <View style={[styles.slide, { width }]}>
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={() => onOpenDetails(loan.id)}
        style={styles.cardPressable}
      >
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderCopy}>
              <Text
                style={styles.cardTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {loan.nickname}
              </Text>
              <LoanCategoryTag
                loan={loan}
                lender={dealLender}
                color={colours.textSecondary}
                variant="bodyLg"
                style={styles.cardSubtitle}
              />
            </View>
          </View>

          <DashboardProgressGauge progress={progress} />
          <DashboardMetricPanel metrics={dashboardMetrics} progress={progress} />
        </View>
      </TouchableOpacity>
    </View>
  );
});
LoanDashboardCard.displayName = 'LoanDashboardCard';

export const MortgageDashboard = ({ loans, onNewCalculation }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const slideWidth = width;
  const bottomInset = Math.max(insets.bottom - spacing.md, 0);

  const openLoanDetails = useCallback((loanId: string) => {
    router.push(`/saved/${loanId}`);
  }, [router]);

  const navigateFromDashboardMenu = (href: '/saved' | '/settings') => {
    router.push({
      pathname: href as never,
      params: { fromDashboard: '1' },
    });
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), loans.length - 1));
  };

  // Each slide is its own vertical ScrollView so a tall card (or large font scale)
  // still scrolls on small screens. The horizontal pager that owns them is now a
  // FlatList — different axis from the slide scrollers (no same-orientation nesting,
  // which is what made card taps/swipes glitch), and it virtualises so off-screen
  // cards don't mount or run their amortisation until you page near them.
  const renderSlide = useCallback<ListRenderItem<SavedLoan>>(({ item }) => (
    <ScrollView
      style={{ width: slideWidth }}
      contentContainerStyle={[
        styles.slideContent,
        { paddingBottom: FLOATING_ACTION_SPACE + bottomInset },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <LoanDashboardCard loan={item} width={slideWidth} onOpenDetails={openLoanDetails} />
    </ScrollView>
  ), [slideWidth, bottomInset, openLoanDetails]);

  return (
    <View style={styles.root}>
      <DashboardHeader
        onNewCalculation={onNewCalculation}
        onNavigate={navigateFromDashboardMenu}
      />
      <View style={styles.disclaimerWrap}>
        <FinancialDisclaimer dismissible style={styles.disclaimer} />
      </View>
      <FlatList
        style={styles.carousel}
        data={loans}
        keyExtractor={loan => loan.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, index) => ({ length: slideWidth, offset: slideWidth * index, index })}
      />
      <View style={[styles.floatingAction, { paddingBottom: Math.max(bottomInset, spacing.xs) }]}>
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
        <Button
          label={t('results.newCalculation')}
          onPress={onNewCalculation}
          rightIcon={<Icon icon={IconName.CalculatorIcon} color={colours.white} size={18} strokeWidth={1.8} />}
          style={styles.newCalculationButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colours.background },
  disclaimerWrap: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.headerPadding,
  },
  disclaimer: {
    marginBottom: spacing.sm,
  },
  carousel: {
    flex: 1,
  },
  slideContent: {
    alignItems: 'stretch',
    paddingTop: spacing.xxs,
  },
  cardPressable: {
    width: '100%',
  },
  slide: {
    paddingHorizontal: layout.headerPadding,
    paddingBottom: spacing['2xl'],
  },
  summaryCard: {
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  indicatorBlock: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
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
  floatingAction: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.headerPadding,
    paddingTop: spacing.xs,
    backgroundColor: colours.background,
  },
  newCalculationButton: {
    width: '100%',
  },
  cardHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardHeaderCopy: {
    alignItems: 'center',
    minWidth: 0,
  },
  cardSubtitle: {
    // Wraps the LoanCategoryTag row: stretch to the header width and centre the
    // icon + label so a long "category · lender" still truncates instead of overflowing.
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginTop: spacing.xxxs,
  },
  cardTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    lineHeight: 32,
    color: colours.primary,
    textAlign: 'center',
  },
  metricPanel: {
    position: 'relative',
    borderRadius: 20,
    backgroundColor: colours.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    ...elevation.level2,
  },
  dashboardMetricRow: {
    minHeight: 66,
    justifyContent: 'center',
  },
  dashboardMetricRowLast: {
    borderBottomWidth: 0,
  },
  dashboardMetricRowWithAction: {
    paddingRight: 58,
  },
  dashboardMetricLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  dashboardMetricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
    color: colours.primary,
  },
  dashboardMetricHelper: {
    ...fontFaces.body.medium,
    marginTop: spacing.xxxs,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: colours.textSecondary,
  },
  editBubble: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    backgroundColor: colours.surfaceAccent,
    ...elevation.level1,
  },
});
