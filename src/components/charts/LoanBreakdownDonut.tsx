import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';

interface Props {
  principal: number;
  totalInterest: number;
  currency: CurrencyCode;
}

export const LoanBreakdownDonut = ({ principal, totalInterest, currency }: Props) => {
  const { t } = useTranslation();
  const total = principal + totalInterest;
  const formatPct = (value: number) => {
    const rounded = Number(value.toFixed(1));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  };
  const principalPct = total > 0 ? formatPct((principal / total) * 100) : '0';
  const interestPct = total > 0 ? formatPct((totalInterest / total) * 100) : '0';

  const data = [
    { value: principal, color: colours.primary, gradientCenterColor: colours.primaryDark },
    { value: totalInterest, color: colours.accent, gradientCenterColor: colours.teal },
  ];

  return (
    <View style={styles.container}>
      <PieChart
        data={data}
        donut
        radius={88}
        innerRadius={58}
        innerCircleColor={colours.white}
        innerCircleBorderWidth={1}
        innerCircleBorderColor={colours.border}
        showGradient
        curvedStartEdges
        curvedEndEdges
        edgesRadius={8}
        centerLabelComponent={() => (
          <View style={styles.center}>
            <Text style={styles.centerPct}>{principalPct}/{interestPct}</Text>
            <Text style={styles.centerLabel}>{t('results.principal')}/{t('results.interest')}</Text>
          </View>
        )}
        strokeColor={colours.white}
        strokeWidth={4}
        isAnimated
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colours.primary }]} />
          <View style={styles.legendCopy}>
            <Text style={styles.legendLabel}>{t('results.principal')}</Text>
            <Text style={styles.legendValue}>
              {formatCurrency(principal, currency)} · <Text style={styles.legendPercent}>{principalPct}%</Text>
            </Text>
          </View>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colours.accent }]} />
          <View style={styles.legendCopy}>
            <Text style={styles.legendLabel}>{t('results.interest')}</Text>
            <Text style={styles.legendValue}>
              {formatCurrency(totalInterest, currency)} · <Text style={styles.legendPercent}>{interestPct}%</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 6, paddingBottom: 2 },
  center: { alignItems: 'center' },
  centerPct: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  centerLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.tiny,
    color: colours.textSecondary,
    marginTop: 2,
  },
  legend: {
    alignSelf: 'stretch',
    marginTop: 16,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 12,
    padding: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendCopy: {
    flex: 1,
  },
  legendLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  legendValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 2,
  },
  legendPercent: {
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
});
