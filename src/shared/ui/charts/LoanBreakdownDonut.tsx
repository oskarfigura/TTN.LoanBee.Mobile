import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/shared/ui/theme';
import { formatCurrency } from '@/shared/domain/currency/format';
import { CurrencyCode } from '@/shared/domain/currency/currencies';

interface Props {
  principal: number;
  totalInterest: number;
  currency: CurrencyCode;
  radius?: number;
}

export const LoanBreakdownDonut = ({ principal, totalInterest, currency, radius = 88 }: Props) => {
  const { t } = useTranslation();
  const total = principal + totalInterest;
  const formatPct = (value: number) => String(Number(value.toFixed(1)));
  // Round the principal share, then derive interest as its complement so the two
  // displayed percentages always total 100 (rounding each independently can drift
  // to 100.1 when both shares land on a .x5 boundary, e.g. a 31.25/68.75 split).
  const principalPct = total > 0 ? formatPct((principal / total) * 100) : '0';
  const interestPct = total > 0 ? formatPct(100 - Number(principalPct)) : '0';

  const data = [
    { value: principal, color: colours.primary, gradientCenterColor: colours.primaryDark },
    { value: totalInterest, color: colours.accent, gradientCenterColor: colours.teal },
  ];

  return (
    <View style={styles.container}>
      <PieChart
        data={data}
        donut
        radius={radius}
        innerRadius={Math.max(44, radius - 30)}
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
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes.lg,
    color: colours.primary,
  },
  centerLabel: {
    ...fontFaces.body.regular,
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
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  legendValue: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    marginTop: 2,
  },
  legendPercent: {
    ...fontFaces.heading.extrabold,
    color: colours.primary,
  },
});
