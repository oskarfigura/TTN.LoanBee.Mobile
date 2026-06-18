import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/shared/ui/theme';
import { formatCurrencyCompact } from '@/shared/domain/currency/format';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { getProjectionChartLayout } from './dimensions';
import { useFirstMeasureAnimation } from './useFirstMeasureAnimation';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  monthlyArray: number[];
  interestArray: number[];
  currency: CurrencyCode;
  height?: number;
  fitToWidth?: boolean;
}

const SAMPLE_STEP = 12;
const BAR_WIDTH = 18;
const BAR_SPACING = 14;
const INITIAL_SPACING = 8;
const END_SPACING = 16;
const MIN_BAR_SLOT = 10;
const MIN_LABEL_GAP = 34;
const X_LABEL_WIDTH = 34;
const MAX_FITTED_BAR_WIDTH = 28;
// Cap the gap between fitted bars (~2× the widest bar). Without this, a handful of bars on a
// wide tablet would distribute across the whole width, leaving thin bars marooned by huge
// gaps; once the gap is clamped the cluster no longer fills the width and is centred instead.
const MAX_FITTED_BAR_SPACING = 56;

type StackSegment = {
  value: number;
  color: string;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
};

export const RepaymentBarChart = ({
  monthlyArray,
  interestArray,
  currency,
  height = 196,
  fitToWidth = false,
}: Props) => {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);
  const shouldAnimate = useFirstMeasureAnimation(containerWidth);

  // Bucket the cumulative arrays into years. The final bucket can be a partial year
  // (e.g. an 18-month loan ends on a half-year); clamp its end to the last index so
  // those trailing months still get their own bar rather than being dropped.
  const lastIndex = monthlyArray.length - 1;
  const buckets: { year: number; principalPaid: number; interestPaid: number; totalPaid: number }[] = [];
  for (let start = 0; start < lastIndex; start += SAMPLE_STEP) {
    const end = Math.min(start + SAMPLE_STEP, lastIndex);
    const totalPaid = monthlyArray[end] - monthlyArray[start];
    const interestPaid = interestArray[end] - interestArray[start];
    const principalPaid = Math.max(0, totalPaid - interestPaid);
    const year = Math.ceil(end / SAMPLE_STEP);
    buckets.push({ year, principalPaid, interestPaid, totalPaid });
  }

  // The amortisation engine settles a sub-instalment remainder as one extra closing
  // entry (e.g. a £379 final payment after the last full £1,502 instalment). Bucketed
  // naively that stub spills into a fresh year and renders as a jarring one-month
  // sliver tacked on past the real final year. When the closing bucket is smaller than
  // a single instalment of the loan's closing year, fold it back into the preceding year
  // so the chart ends on the loan's true final year while still conserving the total
  // paid. Only the final bucket can be partial, so the second-to-last is always a full
  // 12-month year — its monthly rate is the right reference even if a remortgage changed
  // the instalment partway through.
  if (buckets.length >= 2) {
    const tail = buckets[buckets.length - 1];
    const prev = buckets[buckets.length - 2];
    const closingMonthlyRate = prev.totalPaid / SAMPLE_STEP;
    if (closingMonthlyRate > 0 && tail.totalPaid < closingMonthlyRate - 1e-6) {
      prev.principalPaid += tail.principalPaid;
      prev.interestPaid += tail.interestPaid;
      prev.totalPaid += tail.totalPaid;
      buckets.pop();
    }
  }

  if (buckets.length === 0) return <ChartEmptyState height={height} />;

  const rawYearlyData = buckets.map(({ year, principalPaid, interestPaid }) => ({
    year,
    stacks: [
      {
        value: principalPaid,
        color: colours.primary,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 5,
      },
      {
        value: interestPaid,
        color: colours.accent,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
      },
    ] as StackSegment[],
  }));

  const { chartWidth, scrollEnabled, pointSpacing } = getProjectionChartLayout({
    containerWidth,
    pointCount: rawYearlyData.length,
    perPointWidth: BAR_WIDTH + BAR_SPACING,
    edgeSpacing: INITIAL_SPACING + END_SPACING,
    fitToWidth,
    minPerPointWidth: MIN_BAR_SLOT,
    fillAvailableWidth: fitToWidth,
  });
  const barSlot = fitToWidth ? pointSpacing : BAR_WIDTH + BAR_SPACING;
  const barWidth = fitToWidth
    ? Math.max(6, Math.min(MAX_FITTED_BAR_WIDTH, Math.floor(barSlot * 0.58)))
    : BAR_WIDTH;
  const fittedSpacing = rawYearlyData.length > 1 && !scrollEnabled
    ? (
      chartWidth
      - INITIAL_SPACING
      - END_SPACING
      - rawYearlyData.length * barWidth
    ) / (rawYearlyData.length - 1)
    : barSlot - barWidth;
  const spacing = fitToWidth
    ? Math.min(Math.max(3, fittedSpacing), MAX_FITTED_BAR_SPACING)
    : BAR_SPACING;
  // When the clamped cluster no longer fills the width (few bars on a wide screen), centre it
  // so it reads as a balanced group beneath the full-width gridlines rather than hugging the
  // y-axis with a wide empty gutter on the right.
  const barsRegion = rawYearlyData.length * barWidth + (rawYearlyData.length - 1) * spacing;
  const initialSpacing = fitToWidth && barsRegion + INITIAL_SPACING + END_SPACING < chartWidth
    ? Math.round((chartWidth - barsRegion) / 2)
    : INITIAL_SPACING;
  const labelEvery = fitToWidth
    ? Math.max(1, Math.ceil(MIN_LABEL_GAP / pointSpacing))
    : 1;
  const lastPosition = rawYearlyData.length - 1;
  const yearlyData = rawYearlyData.map((item, position) => ({
    ...item,
    label: !fitToWidth || position === lastPosition || position % labelEvery === 0
      ? `Y${item.year}`
      : '',
    labelWidth: X_LABEL_WIDTH,
  }));

  return (
    <View
      style={styles.container}
      onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        horizontal={scrollEnabled}
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={scrollEnabled}
      >
        <BarChart
          key={`repayment-${Math.round(containerWidth)}`}
          stackData={yearlyData}
          width={chartWidth}
          height={height}
          barWidth={barWidth}
          spacing={spacing}
          initialSpacing={initialSpacing}
          endSpacing={END_SPACING}
          noOfSections={4}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          xAxisTextNumberOfLines={1}
          yAxisLabelWidth={42}
          xAxisLabelsHeight={24}
          rulesColor={colours.border}
          rulesThickness={1}
          xAxisColor={colours.border}
          yAxisColor={colours.border}
          yAxisThickness={1}
          xAxisThickness={1}
          showYAxisIndices={false}
          showXAxisIndices={false}
          formatYLabel={v => formatCurrencyCompact(+v, currency)}
          disableScroll={!scrollEnabled}
          adjustToWidth={!scrollEnabled && !fitToWidth}
          isAnimated={shouldAnimate}
        />
      </ScrollView>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colours.primary }]} />
          <Text style={styles.legendText}>{t('results.principal')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colours.accent }]} />
          <Text style={styles.legendText}>{t('results.interest')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: 4, paddingBottom: 2 },
  axisText: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.tiny,
    color: colours.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
});
