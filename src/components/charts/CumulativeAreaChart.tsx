import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colours, fonts, fontSizes } from '@/theme';
import { formatCurrencyCompact } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';

interface Props {
  monthlyArray: number[];
  interestArray: number[];
  remainingArray: number[];
  currency: CurrencyCode;
}

const SAMPLE_STEP = 12;

export const CumulativeAreaChart = ({ monthlyArray, interestArray, remainingArray, currency }: Props) => {
  const width = Dimensions.get('window').width - 64;

  const sample = (arr: number[]) => {
    const result = [];
    for (let i = 0; i < arr.length; i += SAMPLE_STEP) result.push({ value: arr[i] });
    return result;
  };

  const totalData = sample(monthlyArray).map(d => ({ ...d, color: colours.accent, dataPointColor: colours.accent }));
  const interestData = sample(interestArray).map(d => ({ ...d, color: colours.primary, dataPointColor: colours.primary }));
  const remainingData = sample(remainingArray).map(d => ({ ...d, color: colours.teal, dataPointColor: colours.teal }));

  if (totalData.length < 2) return null;

  return (
    <View style={styles.container}>
      <LineChart
        data={totalData}
        data2={interestData}
        data3={remainingData}
        width={width}
        height={180}
        areaChart
        areaChart2
        areaChart3
        startFillColor={colours.accent}
        startFillColor2={colours.primary}
        startFillColor3={colours.teal}
        startOpacity={0.3}
        startOpacity2={0.2}
        startOpacity3={0.2}
        endOpacity={0.01}
        endOpacity2={0.01}
        endOpacity3={0.01}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        noOfSections={4}
        formatYLabel={v => formatCurrencyCompact(+v, currency)}
        hideDataPoints
        curved
        isAnimated
      />
      <View style={styles.legend}>
        {[
          { label: 'Total Paid', color: colours.accent },
          { label: 'Interest', color: colours.primary },
          { label: 'Remaining', color: colours.teal },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  axisText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs - 1,
    color: colours.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
});
