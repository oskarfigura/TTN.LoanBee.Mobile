import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { CurrencyCode, CURRENCIES } from '@/currency/currencies';
import { getProjectionChartWidth } from './dimensions';

interface Props {
  monthlyArray: number[];
  interestArray: number[];
  remainingArray: number[];
  currency: CurrencyCode;
}

const SAMPLE_STEP = 12;

export const CumulativeAreaChart = ({ monthlyArray, interestArray, remainingArray, currency }: Props) => {
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

  const buildYearlyData = () => {
    const lastIndex = monthlyArray.length - 1;
    const indexes: number[] = [];

    for (let i = SAMPLE_STEP - 1; i <= lastIndex; i += SAMPLE_STEP) {
      indexes.push(i);
    }

    if (lastIndex >= 0 && indexes[indexes.length - 1] !== lastIndex) {
      indexes.push(lastIndex);
    }

    const labelEvery = indexes.length <= 12 ? 1 : Math.ceil(indexes.length / 6);

    return indexes.map((index, position) => ({
      index,
      label: position % labelEvery === 0 || index === lastIndex
        ? `Yr ${Math.ceil((index + 1) / SAMPLE_STEP)}`
        : '',
    }));
  };

  const yearlyData = buildYearlyData();
  const remainingData = yearlyData.map(({ index, label }) => ({
    value: remainingArray[index],
    label,
    color: colours.accent,
    dataPointColor: colours.accent,
  }));
  const totalData = yearlyData.map(({ index, label }) => ({
    value: monthlyArray[index],
    label,
    color: colours.primary,
    dataPointColor: colours.primary,
  }));
  const interestData = yearlyData.map(({ index, label }) => ({
    value: interestArray[index],
    label,
    color: colours.teal,
    dataPointColor: colours.teal,
  }));

  if (totalData.length < 2) return null;

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
        horizontal={shouldScroll}
        scrollEnabled={shouldScroll}
        showsHorizontalScrollIndicator={shouldScroll}
      >
        <LineChart
          data={remainingData}
          data2={totalData}
          data3={interestData}
          width={width}
          height={196}
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
    fontFamily: fonts.body,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
});
