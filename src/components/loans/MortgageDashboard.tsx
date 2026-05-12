import React, { useMemo, useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { DashboardHeader } from '@/components/loans/DashboardHeader';
import { CalculatorIcon, EditIcon } from '@/components/loans/LoanIcons';
import {
  LoanDashboardProgress,
  LoanInsightMetric,
  LoanInsightSummary,
  buildSavedLoanDashboardProgress,
  buildSavedLoanSummary,
} from '@/loans/loanInsightSummary';
import { getMortgageTrackerSummary } from '@/mortgage/tracker';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { SavedLoan } from '@/types/SavedLoan';
import { colours, elevation, fontFaces, fontSizes, layout, radii, spacing } from '@/theme';

interface Props {
  loans: SavedLoan[];
  onNewCalculation: () => void;
}

const FLOATING_ACTION_SPACE = 84;
const GAUGE_SIZE = 150;
const GAUGE_HEIGHT = 128;
const GAUGE_STROKE = 18;
const GAUGE_START_ANGLE = 245;
const GAUGE_END_ANGLE = 475;
const DASHBOARD_METRIC_KEYS = [
  'mortgage.currentBalance',
  'results.monthlyPayment',
  'results.payoffDate',
];

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

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? '0' : '1';

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
};

const DashboardProgressGauge = ({ progress }: { progress: LoanDashboardProgress[] }) => {
  const { t } = useTranslation();
  const valueRepaidProgress = progress.find(item => item.labelKey === 'mortgage.moneyProgress')
    ?? progress[0];
  const clampedValue = Math.max(0, Math.min(valueRepaidProgress?.value ?? 0, 1));
  const progressEndAngle = GAUGE_START_ANGLE
    + ((GAUGE_END_ANGLE - GAUGE_START_ANGLE) * clampedValue);
  const radius = (GAUGE_SIZE - GAUGE_STROKE) / 2;
  const center = GAUGE_SIZE / 2;
  const trackPath = describeArc(center, center, radius, GAUGE_START_ANGLE, GAUGE_END_ANGLE);
  const fillPath = describeArc(center, center, radius, GAUGE_START_ANGLE, progressEndAngle);

  return (
    <View style={styles.progressGaugeBlock}>
      <View style={styles.gaugeShell}>
        <Svg width={GAUGE_SIZE} height={GAUGE_HEIGHT} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_HEIGHT}`}>
          <Path
            d={trackPath}
            fill="none"
            stroke={colours.surfaceStrong}
            strokeWidth={GAUGE_STROKE}
            strokeLinecap="round"
          />
          {clampedValue > 0 ? (
            <Path
              d={fillPath}
              fill="none"
              stroke={colours.accent}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
        <View style={styles.gaugeCenter}>
          <View style={styles.gaugePercentRow}>
            <Text style={styles.gaugePercent}>{Math.round(clampedValue * 100)}</Text>
            <Text style={styles.gaugePercentSign}>%</Text>
          </View>
        </View>
      </View>
      <Text style={styles.gaugeLabel} numberOfLines={1}>
        {valueRepaidProgress ? t(valueRepaidProgress.labelKey) : null}
      </Text>
      {valueRepaidProgress ? (
        <Text style={styles.gaugeCaption} numberOfLines={1} adjustsFontSizeToFit>
          {t(valueRepaidProgress.caption.key, valueRepaidProgress.caption.values)}
        </Text>
      ) : null}
    </View>
  );
};

const DashboardMetricPanel = ({
  summary,
  progress,
}: {
  summary: LoanInsightSummary;
  progress: LoanDashboardProgress[];
}) => {
  const { t } = useTranslation();
  const candidates = [summary.hero, ...summary.metrics];
  const timeProgress = progress.find(item => item.labelKey === 'mortgage.timeProgress');
  const elapsedMonths = Number(timeProgress?.caption.values?.elapsed ?? 0);
  const totalMonths = Number(timeProgress?.caption.values?.total ?? 0);
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
  const remainingTermCaptionKey = getRemainingTermCaptionKey(remainingMonths);
  const remainingTermValues = getRemainingTermValues(remainingMonths);
  const seenKeys = new Set<string>();
  const metrics = DASHBOARD_METRIC_KEYS
    .map(key => candidates.find(metric => metric.labelKey === key))
    .filter((metric): metric is LoanInsightMetric => {
      if (!metric || seenKeys.has(metric.labelKey)) return false;
      seenKeys.add(metric.labelKey);
      return true;
    });

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
        <EditIcon color={colours.primary} size={23} />
      </View>
    </View>
  );
};

const LoanDashboardCard = ({
  loan,
  width,
  onOpenDetails,
}: {
  loan: SavedLoan;
  width: number;
  onOpenDetails: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const { progress, summary, dealLender } = useMemo(() => {
    const result = getResultForSavedLoan(loan);
    const asOf = new Date();
    const mortgageSummary = getMortgageTrackerSummary(loan, asOf);

    return {
      progress: buildSavedLoanDashboardProgress(loan, result, asOf),
      summary: buildSavedLoanSummary(loan, result, asOf, i18n.language),
      dealLender: mortgageSummary.currentDeal?.lender ?? loan.deals[0]?.lender ?? loan.lender,
    };
  }, [i18n.language, loan]);

  return (
    <View style={[styles.slide, { width }]}>
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={onOpenDetails}
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
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {dealLender || t(`saved.category.${loan.category}`)}
              </Text>
            </View>
          </View>

          <DashboardProgressGauge progress={progress} />
          <DashboardMetricPanel summary={summary} progress={progress} />
        </View>
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
  const bottomInset = Math.max(insets.bottom - spacing.md, 0);

  const openLoanDetails = (loanId: string) => {
    router.push(`/saved/${loanId}`);
  };

  const navigateFromDashboardMenu = (href: '/saved' | '/settings' | '/about') => {
    router.push({
      pathname: href as never,
      params: { fromDashboard: '1' },
    });
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), loans.length - 1));
  };

  return (
    <View style={styles.root}>
      <DashboardHeader
        onNewCalculation={onNewCalculation}
        onNavigate={navigateFromDashboardMenu}
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: FLOATING_ACTION_SPACE + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.disclaimerWrap}>
          <FinancialDisclaimer dismissible style={styles.disclaimer} />
        </View>
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
      </ScrollView>
      <View style={[styles.floatingAction, { paddingBottom: bottomInset }]}>
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
  },
  contentContainer: {
    paddingTop: spacing.md,
  },
  disclaimerWrap: {
    paddingHorizontal: layout.headerPadding,
  },
  disclaimer: {
    marginBottom: spacing.sm,
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
    paddingTop: 0,
    backgroundColor: colours.background,
  },
  newCalculationButton: {
    width: '100%',
  },
  cardHeader: {
    alignItems: 'center',
  },
  cardHeaderCopy: {
    alignItems: 'center',
    minWidth: 0,
  },
  cardSubtitle: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colours.textSecondary,
    marginTop: spacing.xxxs,
  },
  cardTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    lineHeight: 32,
    color: colours.primary,
    textAlign: 'center',
  },
  progressGaugeBlock: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  gaugeShell: {
    width: GAUGE_SIZE,
    height: GAUGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gaugePercentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gaugePercent: {
    ...fontFaces.heading.extrabold,
    fontSize: 38,
    lineHeight: 44,
    color: colours.primary,
  },
  gaugePercentSign: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 30,
    color: colours.primary,
  },
  gaugeLabel: {
    ...fontFaces.body.regular,
    maxWidth: 160,
    marginTop: spacing.xxs,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  gaugeCaption: {
    ...fontFaces.body.medium,
    maxWidth: '92%',
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textMuted,
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
    fontSize: fontSizes.xs,
    lineHeight: 16,
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
