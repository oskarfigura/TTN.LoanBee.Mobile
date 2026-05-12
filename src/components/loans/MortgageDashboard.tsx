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
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DashboardHeader } from '@/components/loans/DashboardHeader';
import { LoanInsightCard } from '@/components/loans/LoanInsightCard';
import { CalculatorIcon, ChevronRightIcon } from '@/components/loans/LoanIcons';
import {
  LoanDashboardProgress,
  buildSavedLoanDashboardProgress,
  buildSavedLoanSummary,
} from '@/loans/loanInsightSummary';
import { getMortgageTrackerSummary } from '@/mortgage/tracker';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { SavedLoan } from '@/types/SavedLoan';
import { colours, fonts, fontSizes, fontWeights, layout, spacing } from '@/theme';

interface Props {
  loans: SavedLoan[];
  onNewCalculation: () => void;
}

const FLOATING_ACTION_SPACE = 84;

const DashboardProgressBars = ({ progress }: { progress: LoanDashboardProgress[] }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.progressBlock}>
      {progress.map((item, index) => (
        <View key={item.labelKey} style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel} numberOfLines={1}>
              {t(item.labelKey)}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(item.value * 100)}%
            </Text>
          </View>
          <ProgressBar
            progress={item.value}
            color={index === 0 ? colours.accent : colours.teal}
          />
          <Text style={styles.progressCaption} numberOfLines={1} adjustsFontSizeToFit>
            {t(item.caption.key, item.caption.values)}
          </Text>
        </View>
      ))}
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
        <LoanInsightCard
          summary={summary}
          density="compact"
          title={loan.nickname}
          subtitle={dealLender || t(`saved.category.${loan.category}`)}
          headerAction={<Badge label={t(`saved.category.${loan.category}`)} variant="ghost" />}
          style={styles.summaryCard}
          footerContent={(
            <View style={styles.cardFooterContent}>
              <DashboardProgressBars progress={progress} />
              <View style={styles.cardFooter}>
                <AppText variant="helper" tone="muted">
                  {t('mortgage.tapForDetails')}
                </AppText>
                <ChevronRightIcon color={colours.primary} />
              </View>
            </View>
          )}
        />
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
  const bottomInset = Math.max(insets.bottom, spacing.sm);

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
      <View style={[styles.content, { paddingBottom: FLOATING_ACTION_SPACE + bottomInset }]}>
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
      <View style={[styles.floatingAction, { paddingBottom: bottomInset }]}>
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
    paddingBottom: spacing.md,
  },
  summaryCard: {
    minHeight: 456,
    justifyContent: 'space-between',
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
  floatingAction: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.headerPadding,
  },
  newCalculationButton: {
    width: '100%',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFooterContent: {
    gap: spacing.sm,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progressItem: {
    gap: spacing.xxs,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressLabel: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    textTransform: 'uppercase',
  },
  progressPercent: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colours.secondary,
  },
  progressCaption: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
});
