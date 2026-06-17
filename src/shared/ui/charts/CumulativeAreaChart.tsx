import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/shared/ui/theme';
import { CurrencyCode, CURRENCIES } from '@/shared/domain/currency/currencies';
import { getNiceChartMaxValue, getProjectionChartLayout } from './dimensions';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  monthlyArray: number[];
  interestArray: number[];
  remainingArray: number[];
  currency: CurrencyCode;
  height?: number;
  fitToWidth?: boolean;
}

const SAMPLE_STEP = 12;
const POINT_SPACING = 44;
const INITIAL_SPACING = 8;
const X_LABEL_WIDTH = 46;
const MIN_LABEL_GAP = 52;
// Trailing pad after the last point. When fitting the whole timeline into the card we
// right-anchor the final label (it ends at its point) so only a small pad is needed and
// the series stretches close to the right edge instead of stopping short under empty
// gridlines. When the chart scrolls (fullscreen) the final label stays centred, so it
// keeps the half-label reserve to avoid clipping at the scroll content's edge.
const FIT_END_SPACING = 12;
const SCROLL_END_SPACING = X_LABEL_WIDTH / 2 + 4;
const SECTION_COUNT = 4;

/**
 * Whether the cumulative chart has enough monthly points to draw a curve (at least
 * two yearly samples). Below this it renders an empty state, so callers can use this
 * to avoid presenting the card as an interactive (tappable / fullscreen) chart.
 */
export const hasCumulativeChartData = (monthlyPointCount: number) =>
  monthlyPointCount - 1 >= SAMPLE_STEP;

const XAxisLabel = ({ text, spacing, anchor = 'center' }: { text: string; spacing: number; anchor?: 'center' | 'end' }) => (
  // gifted-charts positions the label's left edge at its data point. 'center' shifts the
  // box back so the text sits under the point; 'end' pulls the box so it finishes at the
  // point and the text right-aligns — used for the final point so it never overflows the
  // right edge and the chart can use a minimal trailing pad.
  <View
    style={{
      width: X_LABEL_WIDTH,
      marginLeft: anchor === 'end' ? spacing - X_LABEL_WIDTH : (spacing - X_LABEL_WIDTH) / 2,
    }}
  >
    <Text
      style={[styles.xAxisLabel, anchor === 'end' && styles.xAxisLabelEnd]}
      numberOfLines={1}
    >
      {text}
    </Text>
  </View>
);

export const CumulativeAreaChart = ({
  monthlyArray,
  interestArray,
  remainingArray,
  currency,
  height = 196,
  fitToWidth = false,
}: Props) => {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);
  const symbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const formatChartCurrency = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${symbol}${Math.round(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${symbol}${Math.round(abs / 1_000)}K`;
    return `${symbol}${Math.round(abs)}`;
  };

  const buildYearlyData = () => {
    const lastIndex = monthlyArray.length - 1;
    const indexes: number[] = [];

    for (let i = SAMPLE_STEP - 1; i <= lastIndex; i += SAMPLE_STEP) {
      indexes.push(i);
    }

    if (lastIndex >= 0 && indexes[indexes.length - 1] !== lastIndex) {
      indexes.push(lastIndex);
    }

    return indexes.map(index => ({ index }));
  };

  const yearlyData = buildYearlyData();
  if (yearlyData.length < 2) return <ChartEmptyState height={height} />;

  const endSpacing = fitToWidth ? FIT_END_SPACING : SCROLL_END_SPACING;

  const { chartWidth, scrollEnabled, pointSpacing } = getProjectionChartLayout({
    containerWidth,
    pointCount: yearlyData.length,
    perPointWidth: POINT_SPACING,
    edgeSpacing: INITIAL_SPACING + endSpacing,
    fitToWidth,
    spacingMode: 'intervals',
    fillAvailableWidth: true,
  });

  const labelEvery = fitToWidth
    ? Math.max(1, Math.ceil(MIN_LABEL_GAP / pointSpacing))
    : yearlyData.length <= 12 ? 1 : Math.ceil(yearlyData.length / 6);
  const lastPosition = yearlyData.length - 1;
  const shouldLabel = (position: number) => (
    position === 0
    || position === lastPosition
    || (position % labelEvery === 0 && lastPosition - position >= labelEvery)
  );
  const remainingData = yearlyData.map(({ index }, position) => ({
    value: remainingArray[index],
    color: colours.accent,
    dataPointColor: colours.accent,
    ...(shouldLabel(position)
      ? {
        labelComponent: () => (
          <XAxisLabel
            text={`Yr ${Math.ceil((index + 1) / SAMPLE_STEP)}`}
            spacing={pointSpacing}
            anchor={position === lastPosition && fitToWidth ? 'end' : 'center'}
          />
        ),
      }
      : {}),
  }));
  const totalData = yearlyData.map(({ index }) => ({
    value: monthlyArray[index],
    color: colours.primary,
    dataPointColor: colours.primary,
  }));
  const interestData = yearlyData.map(({ index }) => ({
    value: interestArray[index],
    color: colours.teal,
    dataPointColor: colours.teal,
  }));
  const maxValue = getNiceChartMaxValue([
    ...remainingData.map(item => item.value),
    ...totalData.map(item => item.value),
    ...interestData.map(item => item.value),
  ], SECTION_COUNT);

  const legendItems = [
    { labelKey: 'results.remaining', color: colours.accent },
    { labelKey: 'results.totalPaid', color: colours.primary },
    { labelKey: 'results.interestPaid', color: colours.teal },
  ] as const;

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
        <LineChart
          data={remainingData}
          data2={totalData}
          data3={interestData}
          width={chartWidth}
          height={height}
          spacing={pointSpacing}
          areaChart
          areaChart2
          areaChart3
          thickness1={3}
          thickness2={3}
          thickness3={3}
          color={colours.accent}
          color2={colours.primary}
          color3={colours.teal}
          startFillColor={colours.accent}
          startFillColor2={colours.primary}
          startFillColor3={colours.teal}
          startOpacity={0.12}
          startOpacity2={0.1}
          startOpacity3={0.08}
          endOpacity={0.01}
          endOpacity2={0.01}
          endOpacity3={0.01}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          yAxisLabelWidth={46}
          xAxisLabelsHeight={24}
          rulesColor={colours.border}
          rulesThickness={1}
          rulesType="dashed"
          dashWidth={5}
          dashGap={6}
          xAxisColor={colours.white}
          yAxisColor={colours.white}
          yAxisThickness={0}
          xAxisThickness={0}
          initialSpacing={INITIAL_SPACING}
          endSpacing={endSpacing}
          noOfSections={SECTION_COUNT}
          maxValue={maxValue}
          formatYLabel={v => formatChartCurrency(+v)}
          hideDataPoints
          disableScroll={!scrollEnabled}
          curved
          curvature={0.16}
          isAnimated
        />
      </ScrollView>
      <View style={styles.legend}>
        {legendItems.map(item => (
          <View key={item.labelKey} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{t(item.labelKey)}</Text>
          </View>
        ))}
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
  xAxisLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.tiny,
    color: colours.textSecondary,
    textAlign: 'center',
  },
  xAxisLabelEnd: {
    textAlign: 'right',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    columnGap: 18,
    rowGap: 10,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 11, height: 11, borderRadius: 6 },
  legendText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
});
