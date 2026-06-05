import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/theme';
import { CurrencyCode, CURRENCIES } from '@/currency/currencies';
import { getProjectionChartLayout } from './dimensions';

interface Props {
  baselineRemaining: number[];
  scenarioRemaining: number[];
  currency: CurrencyCode;
  height?: number;
}

const SAMPLE_STEP = 12;
const POINT_SPACING = 44;
const INITIAL_SPACING = 8;
// Fixed width for each x-axis label so the text stays legible no matter how tightly
// the points are packed, plus the minimum clear gap to keep between two labels.
const X_LABEL_WIDTH = 46;
const MIN_LABEL_GAP = 52;
// Reserve enough room past the final point for half of its centred label so the
// last year (which is always labelled) isn't clipped at the chart's right edge.
const END_SPACING = X_LABEL_WIDTH / 2 + 4;

// gifted-charts sizes each x-axis label's container to the point spacing and clips the
// text to it, so a condensed chart shrinks labels to an unreadable sliver. This custom
// label renders at a fixed width and offsets itself by half the overflow so it still
// sits centred on its data point (matching the library's default centring maths).
const XAxisLabel = ({ text, spacing }: { text: string; spacing: number }) => (
  <View style={{ width: X_LABEL_WIDTH, marginLeft: (spacing - X_LABEL_WIDTH) / 2 }}>
    <Text style={styles.xAxisLabel} numberOfLines={1}>{text}</Text>
  </View>
);

export const OverpaymentsComparisonChart = ({
  baselineRemaining,
  scenarioRemaining,
  currency,
  height = 196,
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

  // The baseline (no overpayments) always runs at least as long as the scenario, so it
  // sets the chart's full width; pad defensively in case they ever match exactly.
  const maxLen = Math.max(baselineRemaining.length, scenarioRemaining.length);
  const baselinePadded = baselineRemaining.length >= maxLen
    ? baselineRemaining
    : [...baselineRemaining, ...Array(maxLen - baselineRemaining.length).fill(0)];

  // Sample at yearly intervals, always include the last point.
  const buildYearlyIndexes = () => {
    const lastIndex = maxLen - 1;
    const indexes: number[] = [];
    for (let i = SAMPLE_STEP - 1; i <= lastIndex; i += SAMPLE_STEP) {
      indexes.push(i);
    }
    if (lastIndex >= 0 && indexes[indexes.length - 1] !== lastIndex) {
      indexes.push(lastIndex);
    }
    return indexes;
  };

  const indexes = buildYearlyIndexes();
  if (indexes.length < 2) return null;

  const { chartWidth, scrollEnabled, pointSpacing } = getProjectionChartLayout({
    containerWidth,
    pointCount: indexes.length,
    perPointWidth: POINT_SPACING,
    edgeSpacing: INITIAL_SPACING + END_SPACING,
    // Condense the whole timeline into the viewport so a narrow screen shows the
    // entire balance curve at once rather than a scrollable snapshot of a few years.
    fitToWidth: true,
  });

  // Thin labels to the actual spacing so they never overlap, and anchor the cadence to
  // the final point — the payoff year is the most useful label to guarantee is shown.
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_GAP / pointSpacing));
  const lastPosition = indexes.length - 1;

  const baselineData = indexes.map((index, position) => ({
    value: baselinePadded[index],
    dataPointColor: colours.primary,
    ...((lastPosition - position) % labelEvery === 0
      ? {
        labelComponent: () => (
          <XAxisLabel text={`Yr ${Math.ceil((index + 1) / SAMPLE_STEP)}`} spacing={pointSpacing} />
        ),
      }
      : {}),
  }));

  // End the "with overpayments" line at payoff rather than padding it flat along £0:
  // plot each sampled point until the loan clears, then a single point at the payoff
  // balance so the line touches the axis and stops. The baseline keeps running to its
  // own (later) payoff, so the gap between the two lines is the time saved.
  const scenarioLastIndex = scenarioRemaining.length - 1;
  const scenarioData: Array<{ value: number; dataPointColor: string }> = [];
  for (let position = 0; position < indexes.length; position += 1) {
    const index = indexes[position];
    if (index >= scenarioLastIndex) {
      scenarioData.push({ value: scenarioRemaining[scenarioLastIndex], dataPointColor: colours.teal });
      break;
    }
    scenarioData.push({ value: scenarioRemaining[index], dataPointColor: colours.teal });
  }

  const legendItems = [
    { labelKey: 'overpayments.withoutOverpayments', color: colours.primary },
    { labelKey: 'overpayments.withOverpayments', color: colours.teal },
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
          data={baselineData}
          data2={scenarioData}
          width={chartWidth}
          height={height}
          spacing={pointSpacing}
          areaChart
          areaChart2
          thickness1={3}
          thickness2={3}
          color={colours.primary}
          color2={colours.teal}
          startFillColor={colours.primary}
          startFillColor2={colours.teal}
          startOpacity={0.1}
          startOpacity2={0.12}
          endOpacity={0.01}
          endOpacity2={0.01}
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
          endSpacing={END_SPACING}
          noOfSections={4}
          formatYLabel={v => formatChartCurrency(+v)}
          hideDataPoints
          disableScroll={!scrollEnabled}
          curved
          curvature={0.16}
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
