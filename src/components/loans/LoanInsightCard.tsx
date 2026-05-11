import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoanInsightSummary } from '@/loans/loanInsightSummary';
import { colours, fonts, fontSizes, fontWeights, radii, spacing } from '@/theme';

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
  const showHeader = title || subtitle || eyebrowContent || headerAction;
  const isOddMetricCount = summary.metrics.length % 2 === 1;

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
      <View style={[styles.inner, isCompact && styles.compactInner]}>
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
    borderColor: colours.borderSoft,
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
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  compactSubtitle: {
    fontSize: fontSizes.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    lineHeight: 36,
    color: colours.primary,
  },
  compactTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: 25,
  },
  hero: {
    paddingTop: spacing.xxs,
  },
  compactHero: {
    paddingTop: 0,
  },
  heroLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heroValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  compactHeroValue: {
    fontSize: fontSizes.xl,
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
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
  },
  compactMetric: {
    flexBasis: '47%',
  },
  metricWide: {
    flexBasis: '100%',
  },
  metricLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginBottom: spacing.xxs,
  },
  metricValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  compactMetricValue: {
    fontSize: fontSizes.md,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    textTransform: 'uppercase',
  },
  progressPercent: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.secondary,
  },
  progressCaption: {
    fontFamily: fonts.body,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
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
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.success,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingTop: spacing.sm,
  },
});
