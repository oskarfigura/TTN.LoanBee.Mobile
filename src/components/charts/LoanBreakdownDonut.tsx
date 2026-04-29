import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';

interface Props {
  principal: number;
  totalInterest: number;
  currency: CurrencyCode;
}

export const LoanBreakdownDonut = ({ principal, totalInterest, currency }: Props) => {
  const total = principal + totalInterest;
  const interestPct = total > 0 ? ((totalInterest / total) * 100).toFixed(1) : '0';

  const data = [
    { value: principal, color: colours.primary, text: 'Principal' },
    { value: totalInterest, color: colours.accent, text: 'Interest' },
  ];

  return (
    <View style={styles.container}>
      <PieChart
        data={data}
        donut
        radius={80}
        innerRadius={52}
        centerLabelComponent={() => (
          <View style={styles.center}>
            <Text style={styles.centerPct}>{interestPct}%</Text>
            <Text style={styles.centerLabel}>Interest</Text>
          </View>
        )}
        strokeColor={colours.background}
        strokeWidth={2}
        isAnimated
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colours.primary }]} />
          <View>
            <Text style={styles.legendLabel}>Principal</Text>
            <Text style={styles.legendValue}>{formatCurrency(principal, currency)}</Text>
          </View>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colours.accent }]} />
          <View>
            <Text style={styles.legendLabel}>Interest</Text>
            <Text style={styles.legendValue}>{formatCurrency(totalInterest, currency)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
  center: { alignItems: 'center' },
  centerPct: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  centerLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
  },
  legendValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
  },
});
