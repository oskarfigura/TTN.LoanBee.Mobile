import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { formatCurrencyCompact } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import { getProjectionChartWidth } from './dimensions';

interface Props {
  monthlyArray: number[];
  interestArray: number[];
  labelArray: string[];
  currency: CurrencyCode;
}

const SAMPLE_STEP = 12;

export const RepaymentBarChart = ({ monthlyArray, interestArray, labelArray, currency }: Props) => {
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = useState(0);
  const width = getProjectionChartWidth(containerWidth);
  const shouldScroll = containerWidth > 0 && width + 66 > containerWidth;

  const yearlyData = [];
  for (let i = SAMPLE_STEP; i < monthlyArray.length; i += SAMPLE_STEP) {
    const totalPaid = monthlyArray[i] - monthlyArray[i - SAMPLE_STEP];
    const interestPaid = interestArray[i] - interestArray[i - SAMPLE_STEP];
    const principalPaid = totalPaid - interestPaid;
    const year = Math.ceil(i / SAMPLE_STEP);
    yearlyData.push({
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
      ],
      label: `Y${year}`,
    });
  }

  if (yearlyData.length === 0) return null;

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
        <BarChart
          stackData={yearlyData}
          width={width}
          height={196}
          barWidth={Math.max(8, Math.min(24, width / yearlyData.length - 4))}
          spacing={Math.max(8, Math.min(18, width / yearlyData.length / 2))}
          initialSpacing={8}
          endSpacing={16}
          noOfSections={4}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
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
          disableScroll={!shouldScroll}
          adjustToWidth={!shouldScroll}
          isAnimated
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
    fontFamily: fonts.body,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
});
