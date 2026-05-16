import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/theme';
import { CurrencyCode, CURRENCIES } from '@/currency/currencies';
import { getProjectionChartWidth } from './dimensions';

interface Props {
  baselineRemaining: number[];
  scenarioRemaining: number[];
  currency: CurrencyCode;
  height?: number;
}

const SAMPLE_STEP = 12;

export const OverpaymentsComparisonChart = ({
  baselineRemaining,
  scenarioRemaining,
  currency,
  height = 196,
}: Props) => {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);
  const width = getProjectionChartWidth(containerWidth);
  const shouldScroll = containerWidth > 0 && width + 66 > containerWidth;
  const symbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const formatChartCurrency = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${symbol}${Math.round(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${symbol}${Math.round(abs / 1_000)}K`;
    return `${symbol}${Math.round(abs)}`;
  };

  // Align both arrays to the same length by padding the shorter with zeros.
  const maxLen = Math.max(baselineRemaining.length, scenarioRemaining.length);
  const padded = (arr: number[]) =>
    arr.length >= maxLen ? arr : [...arr, ...Array(maxLen - arr.length).fill(0)];

  const baselinePadded = padded(baselineRemaining);
  const scenarioPadded = padded(scenarioRemaining);

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

  const labelEvery = indexes.length <= 12 ? 1 : Math.ceil(indexes.length / 6);

  const baselineData = indexes.map((index, position) => ({
    value: baselinePadded[index],
    label: position % labelEvery === 0 || index === maxLen - 1
      ? `Yr ${Math.ceil((index + 1) / SAMPLE_STEP)}`
      : '',
    dataPointColor: colours.primary,
  }));

  const scenarioData = indexes.map(index => ({
    value: scenarioPadded[index],
    dataPointColor: colours.teal,
  }));

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
        horizontal={shouldScroll}
        scrollEnabled={shouldScroll}
        showsHorizontalScrollIndicator={shouldScroll}
      >
        <LineChart
          data={baselineData}
          data2={scenarioData}
          width={width}
          height={height}
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
          initialSpacing={8}
          endSpacing={8}
          noOfSections={4}
          formatYLabel={v => formatChartCurrency(+v)}
          hideDataPoints
          disableScroll={!shouldScroll}
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
