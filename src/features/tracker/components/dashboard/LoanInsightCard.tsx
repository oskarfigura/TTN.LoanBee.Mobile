import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@oskarfigura/ui-native';
import { ProgressBar } from '@oskarfigura/ui-native';
import { LoanInsightSummary } from '@/shared/domain/loans/loanInsightSummary';
import { colours, fontFaces, fontSizes, radii, spacing } from '@/shared/ui/theme';

type InsightDensity = 'full' | 'compact';

interface Props {
  summary: LoanInsightSummary;
  density?: InsightDensity;
  title?: string;
  subtitle?: string;
  eyebrowContent?: React.ReactNode;
  headerAction?: React.ReactNode;
  footerContent?: React.ReactNode;
  showProgress?: boolean;
  progressContent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const LoanInsightCard = ({
  summary,
  density = 'full',
  title,
  subtitle,
  eyebrowContent,
  headerAction,
  footerContent,
  showProgress = false,
  progressContent,
  style,
}: Props) => {
  const { t } = useTranslation();
  const isCompact = density === 'compact';
  const isCalculationSummary = summary.context === 'calculation' && !isCompact;
  const headerActionInHero = isCalculationSummary && !title && !subtitle && !eyebrowContent
    ? headerAction
    : null;
  const showHeader = title || subtitle || eyebrowContent || (headerAction && !headerActionInHero);
  const isOddMetricCount = summary.metrics.length % 2 === 1;
  const [
    loanAmountMetric,
    payoffDateMetric,
    interestRateMetric,
    totalInterestMetric,
    totalCostMetric,
  ] = isCalculationSummary ? summary.metrics : [];

  return (
    <Card
      padding={0}
      style={[
        styles.card,
        summary.context === 'saved' ? styles.savedCard : styles.calculationCard,
        isCompact && styles.compactCard,
        style,
      ]}
    >
      <View style={[styles.inner, isCompact && styles.compactInner, isCalculationSummary && styles.calculationInner]}>
        {showHeader ? (
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              {eyebrowContent ? (
                <View style={styles.eyebrow}>
                  {eyebrowContent}
                </View>
              ) : null}
              {subtitle ? (
                <Text style={[styles.subtitle, isCompact && styles.compactSubtitle]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              {title ? (
                <Text
                  style={[styles.title, isCompact && styles.compactTitle]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {title}
                </Text>
              ) : null}
            </View>
            {headerAction}
          </View>
        ) : null}

        {isCalculationSummary ? (
          <>
            <View style={styles.calculationHero}>
              <View style={styles.calculationHeroHeader}>
                <Text style={styles.calculationHeroLabel} numberOfLines={1}>
                  {t(summary.hero.labelKey)}
                </Text>
                {headerActionInHero ? (
                  <View style={styles.heroAction}>
                    {headerActionInHero}
                  </View>
                ) : null}
              </View>
              <Text style={styles.calculationHeroValue} numberOfLines={1} adjustsFontSizeToFit>
                {summary.hero.value}
              </Text>
            </View>

            <View style={styles.calculationDetails}>
              <View style={styles.calculationPrimaryRow}>
                {loanAmountMetric ? (
                  <View style={styles.calculationPrimaryMetric}>
                    <Text style={styles.calculationMetricLabel} numberOfLines={1}>
                      {t(loanAmountMetric.labelKey)}
                    </Text>
                    <Text style={styles.calculationPrimaryValue} numberOfLines={1} adjustsFontSizeToFit>
                      {loanAmountMetric.value}
                    </Text>
                  </View>
                ) : null}
                {payoffDateMetric ? (
                  <View style={styles.calculationPrimaryMetric}>
                    <Text style={styles.calculationMetricLabel} numberOfLines={1}>
                      {t(payoffDateMetric.labelKey)}
                    </Text>
                    <Text style={styles.calculationPrimaryValue} numberOfLines={1} adjustsFontSizeToFit>
                      {payoffDateMetric.value}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.calculationSecondaryRow}>
                {interestRateMetric ? (
                  <View style={styles.calculationSecondaryMetric}>
                    <Text style={styles.calculationMetricLabel} numberOfLines={1}>
                      {t(interestRateMetric.labelKey)}
                    </Text>
                    <Text style={styles.calculationSecondaryValue} numberOfLines={1} adjustsFontSizeToFit>
                      {interestRateMetric.value}
                    </Text>
                  </View>
                ) : null}
                {totalInterestMetric ? (
                  <View style={styles.calculationSecondaryMetric}>
                    <Text style={styles.calculationMetricLabel} numberOfLines={1}>
                      {t(totalInterestMetric.labelKey)}
                    </Text>
                    <Text style={styles.calculationSecondaryValue} numberOfLines={1} adjustsFontSizeToFit>
                      {totalInterestMetric.value}
                    </Text>
                  </View>
                ) : null}
              </View>

              {totalCostMetric ? (
                <View style={styles.calculationTotalRow}>
                  <Text style={styles.calculationMetricLabel} numberOfLines={1}>
                    {t(totalCostMetric.labelKey)}
                  </Text>
                  <Text style={styles.calculationTotalValue} numberOfLines={1} adjustsFontSizeToFit>
                    {totalCostMetric.value}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.hero, isCompact && styles.compactHero]}>
              <Text style={styles.heroLabel} numberOfLines={1}>
                {t(summary.hero.labelKey)}
              </Text>
              <Text style={[styles.heroValue, isCompact && styles.compactHeroValue]} numberOfLines={1} adjustsFontSizeToFit>
                {summary.hero.value}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.metricGrid, isCompact && styles.compactMetricGrid]}>
              {summary.metrics.map((metric, index) => (
                <View
                  key={`${metric.labelKey}-${index}`}
                  style={[
                    styles.metric,
                    isCompact && styles.compactMetric,
                    isOddMetricCount && index === summary.metrics.length - 1 && styles.metricWide,
                  ]}
                >
                  <Text style={styles.metricLabel} numberOfLines={1}>
                    {t(metric.labelKey)}
                  </Text>
                  <Text style={[styles.metricValue, isCompact && styles.compactMetricValue]} numberOfLines={1} adjustsFontSizeToFit>
                    {metric.value}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {showProgress && summary.progress ? (
          <View style={styles.progressSection}>
            {progressContent ?? (
              <>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>{t(summary.progress.labelKey)}</Text>
                  <Text style={styles.progressPercent}>{Math.round(summary.progress.value * 100)}%</Text>
                </View>
                <ProgressBar progress={summary.progress.value} color={colours.teal} />
                {summary.progress.startCaption || summary.progress.endCaption ? (
                  <View style={styles.progressCaptions}>
                    <Text style={styles.progressCaption} numberOfLines={1} adjustsFontSizeToFit>
                      {summary.progress.startCaption
                        ? t(summary.progress.startCaption.key, summary.progress.startCaption.values)
                        : t(summary.progress.caption.key, summary.progress.caption.values)}
                    </Text>
                    <Text style={styles.progressCaption} numberOfLines={1} adjustsFontSizeToFit>
                      {summary.progress.endCaption
                        ? t(summary.progress.endCaption.key, summary.progress.endCaption.values)
                        : null}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.progressCaption}>
                    {t(summary.progress.caption.key, summary.progress.caption.values)}
                  </Text>
                )}
              </>
            )}
            {summary.progress.metrics.length > 0 ? (
              <View style={styles.progressMetricGrid}>
                {summary.progress.metrics.map(metric => (
                  <View key={metric.labelKey} style={styles.progressMetric}>
                    <Text style={styles.metricLabel} numberOfLines={1}>
                      {t(metric.labelKey)}
                    </Text>
                    <Text style={styles.progressMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                      {metric.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {summary.progress.savingsAmount ? (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText} numberOfLines={2}>
                  {t('saved.overpaymentSaving', { amount: summary.progress.savingsAmount })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {footerContent ? (
          <View style={styles.footer}>
            {footerContent}
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  savedCard: {
    borderColor: colours.borderSoft,
  },
  calculationCard: {
    borderColor: 'transparent',
  },
  compactCard: {
    marginBottom: spacing.sm,
  },
  inner: {
    padding: spacing.md,
    gap: spacing.md,
  },
  compactInner: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  calculationInner: {
    padding: 0,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  eyebrow: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  compactSubtitle: {
    fontSize: fontSizes.sm,
  },
  title: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes['2xl'],
    lineHeight: 36,
    color: colours.primary,
  },
  compactTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
  },
  hero: {
    paddingTop: spacing.xxs,
  },
  compactHero: {
    paddingTop: 0,
  },
  calculationHero: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colours.surfaceRaised,
  },
  calculationHeroHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroAction: {
    flexShrink: 0,
  },
  heroLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  calculationHeroLabel: {
    ...fontFaces.heading.semibold,
    flex: 1,
    fontSize: fontSizes.xs,
    color: colours.textMuted,
    textTransform: 'uppercase',
    marginBottom: 0,
  },
  heroValue: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes['3xl'],
    color: colours.primary,
  },
  compactHeroValue: {
    fontSize: fontSizes.xl,
  },
  calculationHeroValue: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes['3xl'],
    color: colours.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colours.border,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    columnGap: spacing.md,
  },
  compactMetricGrid: {
    rowGap: spacing.sm,
    columnGap: spacing.sm,
  },
  calculationDetails: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
  },
  compactMetric: {
    flexBasis: '47%',
  },
  calculationPrimaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  calculationPrimaryMetric: {
    flex: 1,
    minWidth: 0,
  },
  calculationSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  calculationSecondaryMetric: {
    flex: 1,
    minWidth: 0,
  },
  calculationTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  metricWide: {
    flexBasis: '100%',
  },
  metricLabel: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 17,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  metricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    color: colours.textPrimary,
  },
  compactMetricValue: {
    fontSize: fontSizes.md,
  },
  calculationMetricLabel: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.sm,
    lineHeight: 17,
    color: colours.textMuted,
    marginBottom: spacing.xxxs,
  },
  calculationPrimaryValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
  },
  calculationSecondaryValue: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  calculationTotalValue: {
    ...fontFaces.heading.bold,
    flexShrink: 1,
    fontSize: fontSizes.lg,
    textAlign: 'right',
    color: colours.primary,
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    textTransform: 'uppercase',
  },
  progressPercent: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    color: colours.secondary,
  },
  progressCaption: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  progressCaptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressMetricGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  progressMetric: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
  },
  progressMetricValue: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.md,
    color: colours.primary,
  },
  savingsBadge: {
    borderWidth: 1,
    borderColor: colours.successBorder,
    borderRadius: radii.input,
    backgroundColor: colours.successSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  savingsText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.success,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.sm,
  },
});
