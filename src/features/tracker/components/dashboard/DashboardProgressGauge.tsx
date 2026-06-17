import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { LoanDashboardProgress } from '@/shared/domain/loans/loanInsightSummary';
import { colours, fontFaces, fontSizes, spacing } from '@/shared/ui/theme';

interface Props {
  progress: LoanDashboardProgress[];
  style?: StyleProp<ViewStyle>;
}

const GAUGE_SIZE = 150;
const GAUGE_HEIGHT = 128;
const GAUGE_STROKE = 18;
const GAUGE_START_ANGLE = 245;
const GAUGE_END_ANGLE = 475;

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? '0' : '1';

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
};

export const DashboardProgressGauge = ({ progress, style }: Props) => {
  const { t } = useTranslation();
  const valueRepaidProgress = progress.find(item => item.labelKey === 'mortgage.moneyProgress')
    ?? progress[0];
  const clampedValue = Math.max(0, Math.min(valueRepaidProgress?.value ?? 0, 1));
  const progressEndAngle = GAUGE_START_ANGLE
    + ((GAUGE_END_ANGLE - GAUGE_START_ANGLE) * clampedValue);
  const radius = (GAUGE_SIZE - GAUGE_STROKE) / 2;
  const center = GAUGE_SIZE / 2;
  const trackPath = describeArc(center, center, radius, GAUGE_START_ANGLE, GAUGE_END_ANGLE);
  const fillPath = describeArc(center, center, radius, GAUGE_START_ANGLE, progressEndAngle);

  return (
    <View style={[styles.progressGaugeBlock, style]}>
      <View style={styles.gaugeShell}>
        <Svg width={GAUGE_SIZE} height={GAUGE_HEIGHT} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_HEIGHT}`}>
          <Path
            d={trackPath}
            fill="none"
            stroke={colours.surfaceStrong}
            strokeWidth={GAUGE_STROKE}
            strokeLinecap="round"
          />
          {clampedValue > 0 ? (
            <Path
              d={fillPath}
              fill="none"
              stroke={colours.accent}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
        <View style={styles.gaugeCenter}>
          <View style={styles.gaugePercentRow}>
            <Text style={styles.gaugePercent}>{Math.round(clampedValue * 100)}</Text>
            <Text style={styles.gaugePercentSign}>%</Text>
          </View>
        </View>
      </View>
      <Text style={styles.gaugeLabel} numberOfLines={1}>
        {valueRepaidProgress ? t(valueRepaidProgress.labelKey) : null}
      </Text>
      {valueRepaidProgress ? (
        <Text style={styles.gaugeCaption} numberOfLines={1} adjustsFontSizeToFit>
          {t(valueRepaidProgress.caption.key, valueRepaidProgress.caption.values)}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  progressGaugeBlock: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  gaugeShell: {
    width: GAUGE_SIZE,
    height: GAUGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gaugePercentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gaugePercent: {
    ...fontFaces.heading.extrabold,
    fontSize: 38,
    lineHeight: 44,
    color: colours.primary,
  },
  gaugePercentSign: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 30,
    color: colours.primary,
  },
  gaugeLabel: {
    ...fontFaces.body.regular,
    maxWidth: 160,
    marginTop: spacing.xxs,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  gaugeCaption: {
    ...fontFaces.body.medium,
    maxWidth: '92%',
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colours.textMuted,
  },
});
