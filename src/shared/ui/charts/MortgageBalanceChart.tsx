import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/shared/ui/theme';
import { CurrencyCode, CURRENCIES } from '@/shared/domain/currency/currencies';
import { getNiceChartMaxValue, getProjectionChartLayout } from './dimensions';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  scenarioRemaining: number[];
  currency: CurrencyCode;
  baselineRemaining?: number[];
  height?: number;
  comparisonLabelKeys?: {
    baseline: string;
    scenario: string;
  };
}

const SAMPLE_STEP = 12;
const POINT_SPACING = 44;
const INITIAL_SPACING = 8;
const X_LABEL_WIDTH = 46;
const MIN_LABEL_GAP = 52;
// Trailing pad after the last point. When the whole timeline fits the card we right-anchor
// the final label (it ends at its point) so only a small pad is needed and the curve
// stretches close to the right edge instead of stopping short under empty gridlines. In
// the rare scroll fallback (pathologically long terms) the final label stays centred and
// keeps the half-label reserve to avoid clipping at the scroll content's edge.
const FIT_END_SPACING = 12;
const SCROLL_END_SPACING = X_LABEL_WIDTH / 2 + 4;
const SECTION_COUNT = 4;

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

export const MortgageBalanceChart = ({
  scenarioRemaining,
  baselineRemaining,
  currency,
  height = 196,
  comparisonLabelKeys,
}: Props) => {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);
  const symbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';
  const hasBaseline = Boolean(baselineRemaining && baselineRemaining.length > 1);

  const formatChartCurrency = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${symbol}${Math.round(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${symbol}${Math.round(abs / 1_000)}K`;
    return `${symbol}${Math.round(abs)}`;
  };

  const maxLen = Math.max(
    scenarioRemaining.length,
    baselineRemaining?.length ?? 0,
  );

  const buildYearlyIndexes = () => {
    const lastIndex = maxLen - 1;
    if (lastIndex < 0) return [];

    const indexes: number[] = [];

    indexes.push(0);

    for (let i = SAMPLE_STEP; i <= lastIndex; i += SAMPLE_STEP) {
      indexes.push(i);
    }

    if (lastIndex > 0 && indexes[indexes.length - 1] !== lastIndex) {
      indexes.push(lastIndex);
    }

    return indexes;
  };

  const indexes = buildYearlyIndexes();
  if (indexes.length < 2) return <ChartEmptyState height={height} />;

  const { chartWidth, scrollEnabled, pointSpacing } = getProjectionChartLayout({
    containerWidth,
    pointCount: indexes.length,
    perPointWidth: POINT_SPACING,
    edgeSpacing: INITIAL_SPACING + FIT_END_SPACING,
    fitToWidth: true,
    spacingMode: 'intervals',
    fillAvailableWidth: true,
  });

  const endSpacing = scrollEnabled ? SCROLL_END_SPACING : FIT_END_SPACING;
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_GAP / pointSpacing));
  const lastPosition = indexes.length - 1;
  const shouldLabel = (position: number) => (
    position === 0
    || position === lastPosition
    || (position % labelEvery === 0 && lastPosition - position >= labelEvery)
  );
  const removeTrailingPaidOffPlateau = <T extends { value: number }>(data: T[]): T[] => {
    let end = data.length;
    while (
      end > 1
      && data[end - 1].value <= 0.005
      && data[end - 2].value <= 0.005
    ) {
      end -= 1;
    }

    return end === data.length ? data : data.slice(0, end);
  };

  const buildBalanceData = (
    series: number[],
    color: string,
    includeLabels: boolean,
  ) => {
    const seriesLastIndex = series.length - 1;
    if (seriesLastIndex < 0) return [];

    const data = [];
    for (let position = 0; position < indexes.length; position += 1) {
      const rawIndex = indexes[position];
      const index = Math.min(rawIndex, seriesLastIndex);
      const labelled = includeLabels && shouldLabel(position);

      data.push({
        value: series[index],
        dataPointColor: color,
        ...(labelled
          ? {
            labelComponent: () => (
              <XAxisLabel
                text={`Yr ${Math.ceil(index / SAMPLE_STEP)}`}
                spacing={pointSpacing}
                anchor={position === lastPosition && !scrollEnabled ? 'end' : 'center'}
              />
            ),
          }
          : {}),
      });

      if (rawIndex >= seriesLastIndex) {
        break;
      }
    }

    return removeTrailingPaidOffPlateau(data);
  };

  const scenarioColor = hasBaseline ? colours.teal : colours.primary;
  const scenarioData = buildBalanceData(scenarioRemaining, scenarioColor, !hasBaseline);
  const baselineData = baselineRemaining
    ? buildBalanceData(baselineRemaining, colours.primary, true)
    : undefined;
  const maxValue = getNiceChartMaxValue([
    ...(baselineData ?? scenarioData).map(item => item.value),
    ...scenarioData.map(item => item.value),
  ], SECTION_COUNT);

  const legendItems = hasBaseline && comparisonLabelKeys
    ? [
      { labelKey: comparisonLabelKeys.baseline, color: colours.primary },
      { labelKey: comparisonLabelKeys.scenario, color: colours.teal },
    ]
    : [];

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
          key={`balance-${Math.round(containerWidth)}`}
          data={baselineData ?? scenarioData}
          {...(baselineData ? { data2: scenarioData } : {})}
          width={chartWidth}
          height={height}
          spacing={pointSpacing}
          areaChart
          {...(baselineData ? { areaChart2: true } : {})}
          thickness1={3}
          {...(baselineData ? { thickness2: 3 } : {})}
          color={baselineData ? colours.primary : scenarioColor}
          {...(baselineData ? { color2: scenarioColor } : {})}
          startFillColor={baselineData ? colours.primary : scenarioColor}
          {...(baselineData ? { startFillColor2: scenarioColor } : {})}
          startOpacity={0.1}
          {...(baselineData ? { startOpacity2: 0.12 } : {})}
          endOpacity={0.01}
          {...(baselineData ? { endOpacity2: 0.01 } : {})}
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
          curvature={0.08}
        />
      </ScrollView>
      {legendItems.length > 0 ? (
        <View style={styles.legend}>
          {legendItems.map(item => (
            <View key={item.labelKey} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{t(item.labelKey)}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
