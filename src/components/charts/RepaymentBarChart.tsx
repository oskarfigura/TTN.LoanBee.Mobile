import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colours, fonts, fontSizes } from '@/theme';
import { formatCurrencyCompact } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';

interface Props {
  monthlyArray: number[];
  interestArray: number[];
  labelArray: string[];
  currency: CurrencyCode;
}

const SAMPLE_STEP = 12;

export const RepaymentBarChart = ({ monthlyArray, interestArray, labelArray, currency }: Props) => {
  const width = Dimensions.get('window').width - 64;

  const yearlyData = [];
  for (let i = SAMPLE_STEP; i < monthlyArray.length; i += SAMPLE_STEP) {
    const totalPaid = monthlyArray[i] - monthlyArray[i - SAMPLE_STEP];
    const interestPaid = interestArray[i] - interestArray[i - SAMPLE_STEP];
    const principalPaid = totalPaid - interestPaid;
    const year = Math.ceil(i / SAMPLE_STEP);
    yearlyData.push({
      stacks: [
        { value: principalPaid, color: colours.primary },
        { value: interestPaid, color: colours.accent },
      ],
      label: `Y${year}`,
    });
  }

  if (yearlyData.length === 0) return null;

  return (
    <View style={styles.container}>
      <BarChart
        data={yearlyData}
        stackData={yearlyData}
        width={width}
        height={180}
        barWidth={Math.max(8, Math.min(24, width / yearlyData.length - 4))}
        noOfSections={4}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        yAxisLabelTexts={[]}
        hideRules
        showYAxisIndices={false}
        formatYLabel={v => formatCurrencyCompact(+v, currency)}
        isAnimated
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colours.primary }]} />
          <Text style={styles.legendText}>Principal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colours.accent }]} />
          <Text style={styles.legendText}>Interest</Text>
        </View>
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
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
});
