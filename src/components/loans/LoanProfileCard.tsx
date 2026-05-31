import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ChevronRightIcon, LoanCategoryIcon, MortgageIcon, PinIcon } from '@/components/loans/LoanIcons';
import { SavedLoanProgressBar } from '@/components/loans/SavedLoanProgressBar';
import { buildSavedLoanDisplayDetails, buildSavedLoanSummary, LoanInsightMetric } from '@/loans/loanInsightSummary';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { SavedLoan } from '@/types/SavedLoan';
import { colours, radii, spacing } from '@/theme';
import { formatFriendlyDate } from '@/utils/date';

interface Props {
  loan: SavedLoan;
  onPress: () => void;
  onTogglePinned: () => void;
}

export const LoanProfileCard = ({ loan, onPress, onTogglePinned }: Props) => {
  const { t, i18n } = useTranslation();
  const isDraft = loan.status === 'draft';
  // Draft loans built via the guided journey hold partial data, so skip the
  // insight computation (which assumes a complete loan) and render a resume card.
  const insight = useMemo(() => {
    if (isDraft) return null;
    const result = getResultForSavedLoan(loan);
    const asOf = new Date();
    return {
      displayDetails: buildSavedLoanDisplayDetails(loan, asOf),
      result,
      summary: buildSavedLoanSummary(loan, result, asOf, i18n.language),
    };
  }, [i18n.language, loan, isDraft]);
  const CategoryIcon = loan.category === 'mortgage' ? MortgageIcon : LoanCategoryIcon;

  if (isDraft || !insight) {
    const draftLabel = `${loan.nickname.trim() || t('journey.draftUntitled')}. ${t('saved.draftA11y')}`;
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={draftLabel}
      >
        <Card padding={0} style={styles.card}>
          <View style={[styles.inner, styles.draftInner]}>
            <View style={styles.identity}>
              <View style={styles.iconTile}>
                <CategoryIcon color={colours.primary} size={18} />
              </View>
              <View style={styles.titleBlock}>
                <AppText variant="title3" tone="default" numberOfLines={1}>
                  {loan.nickname.trim() || t('journey.draftUntitled')}
                </AppText>
                <View style={styles.draftBadge}>
                  <AppText variant="labelSm" tone="accent" numberOfLines={1}>
                    {t('journey.draftBadge')}
                  </AppText>
                </View>
              </View>
            </View>
            <View style={styles.detailsCue}>
              <ChevronRightIcon color={colours.primary} size={18} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  const { displayDetails, result, summary } = insight;
  const currentBalance = summary.progress?.metrics.find(metric => metric.labelKey === 'mortgage.currentBalance');
  const monthlyPayment = summary.metrics.find(metric => metric.labelKey === 'results.monthlyPayment');
  const interestRate = summary.metrics.find(metric => metric.labelKey === 'calculator.interestRate');
  const payoffDate = summary.metrics.find(metric => metric.labelKey === 'results.payoffDate')
    ?? (summary.hero.labelKey === 'results.payoffDate' ? summary.hero : undefined);
  const primaryMetric = currentBalance ?? summary.hero;
  const supportingMetrics = [monthlyPayment, interestRate, payoffDate]
    .filter((metric): metric is LoanInsightMetric => Boolean(metric))
    .slice(0, 3);
  // Overpayment savings are already gated on "is the user overpaying" inside the
  // summary builder: loans expose a formatted `savingsAmount`, mortgages surface an
  // `estimatedSavings` metric. Either presence means we should show the badge.
  const overpaymentSavings = summary.progress?.savingsAmount
    ?? summary.progress?.metrics.find(metric => metric.labelKey === 'mortgage.estimatedSavings')?.value;
  const startedDate = formatFriendlyDate(loan.formSnapshot.startDate, i18n.language);
  // Without this the card (an accessible group) reads every child string as one
  // run-on announcement. Build a concise spoken summary of the key facts instead.
  const accessibilityLabel = [
    loan.nickname,
    t(`saved.category.${loan.category}`),
    `${t(primaryMetric.labelKey)}: ${primaryMetric.value}`,
    summary.progress
      ? t('saved.balancePaidWithPercent', { percent: Math.round((summary.progress.value ?? 0) * 100) })
      : undefined,
    overpaymentSavings ? t('saved.savedInterestBadge', { amount: overpaymentSavings }) : undefined,
    loan.pinnedToDashboard ? t('saved.pinnedA11y') : undefined,
  ].filter(Boolean).join('. ');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // The card is an accessible group, so the nested pin button isn't reachable
      // on its own. Expose the toggle as a rotor action so screen-reader users can
      // still pin/unpin without a focusable inner control.
      accessibilityActions={[{
        name: 'togglePin',
        label: loan.pinnedToDashboard ? t('mortgage.unpinHint') : t('mortgage.pinToDashboard'),
      }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'togglePin') {
          onTogglePinned();
        }
      }}
    >
      <Card padding={0} style={styles.card}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <View style={styles.iconTile}>
                <CategoryIcon color={colours.primary} size={18} />
              </View>
              <View style={styles.titleBlock}>
                <AppText variant="title3" tone="default" numberOfLines={1} adjustsFontSizeToFit>
                  {loan.nickname}
                </AppText>
                <View style={styles.metaRow}>
                  <View style={styles.categoryLabel}>
                    <AppText variant="labelSm" tone="accent" numberOfLines={1}>
                      {t(`saved.category.${loan.category}`)}
                    </AppText>
                  </View>
                  {displayDetails.lender ? (
                    <AppText variant="helper" tone="muted" numberOfLines={1} style={styles.metaText}>
                      {displayDetails.lender}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={event => {
                event.stopPropagation();
                onTogglePinned();
              }}
              accessibilityRole="button"
              accessibilityLabel={loan.pinnedToDashboard ? t('mortgage.unpinHint') : t('mortgage.pinToDashboard')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.pinButton, loan.pinnedToDashboard && styles.pinButtonActive]}
              activeOpacity={0.84}
            >
              <PinIcon color={loan.pinnedToDashboard ? colours.secondary : colours.primary} size={16} />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceBlock}>
            <View style={styles.balanceCopy}>
              <AppText variant="helper" tone="muted" numberOfLines={1}>
                {t(primaryMetric.labelKey)}
              </AppText>
              <AppText variant="metricMd" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
                {primaryMetric.value}
              </AppText>
            </View>
          </View>

          {summary.progress ? (
            <SavedLoanProgressBar loan={loan} result={result} summary={summary} />
          ) : null}

          <View style={styles.metricRow}>
            {supportingMetrics.map(metric => (
              <View key={metric.labelKey} style={styles.metricPill}>
                <AppText variant="helper" tone="muted" numberOfLines={1}>
                  {t(metric.labelKey)}
                </AppText>
                <AppText variant="labelMd" tone="default" numberOfLines={1} adjustsFontSizeToFit>
                  {metric.value}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <AppText variant="helper" tone="muted" numberOfLines={1} style={styles.footerMeta}>
              {t('saved.startedOn', { date: startedDate })}
            </AppText>
            {overpaymentSavings ? (
              <View style={styles.savingsBadge}>
                <AppText variant="labelSm" tone="success" numberOfLines={1} adjustsFontSizeToFit>
                  {t('saved.savedInterestBadge', { amount: overpaymentSavings })}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  inner: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  draftInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceAccent,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
    marginTop: spacing.xxs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
  },
  categoryLabel: {
    alignSelf: 'flex-start',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
  },
  pinButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.border,
  },
  pinButtonActive: {
    backgroundColor: colours.successSurface,
    borderColor: colours.successBorder,
  },
  balanceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    backgroundColor: colours.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  balanceCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  detailsCue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.border,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricPill: {
    flex: 1,
    flexBasis: '30%',
    minWidth: 96,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.backgroundCanvas,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footerMeta: {
    flex: 1,
    minWidth: 0,
  },
  savingsBadge: {
    flexShrink: 1,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colours.successBorder,
    backgroundColor: colours.successSurface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
  },
});
