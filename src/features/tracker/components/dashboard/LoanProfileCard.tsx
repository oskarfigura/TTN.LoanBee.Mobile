import React, { memo, useMemo, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { Card } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { LoanPurposeIconTile } from '@/features/tracker/components/editing/LoanPurposePicker';
import { LoanCategoryTag } from '@/features/tracker/components/LoanCategoryTag';
import { SavedLoanProgressBar } from '@/features/tracker/components/dashboard/SavedLoanProgressBar';
import { buildSavedLoanDisplayDetails, buildSavedLoanSummary, LoanInsightMetric } from '@/shared/domain/loans/loanInsightSummary';
import { getLoanPurpose } from '@/shared/domain/loans/loanPurpose';
import { getResultForSavedLoan } from '@/shared/domain/results/loanResultRoute';
import { usePinFeedback } from '@/shared/lib/hooks/usePinFeedback';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';
import { colours, fontSizes, radii, spacing } from '@/shared/ui/theme';
import { formatFriendlyDate } from '@/shared/lib/utils/date';

interface Props {
  loan: SavedLoan;
  // Callbacks receive the loan / id so the parent can pass a single stable
  // reference per handler (instead of an inline closure per row). That keeps the
  // `memo` wrapper below effective — rows only re-render when their own props
  // change, so e.g. typing in the search box no longer re-renders every card.
  onPress: (loan: SavedLoan) => void;
  onTogglePinned: (id: string) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onLongPress?: (id: string) => void;
  onToggleSelected?: (id: string) => void;
}

const SelectionCheckbox = ({ selected }: { selected: boolean }) => (
  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
    {selected ? <Icon icon={IconName.CheckIcon} size={14} color={colours.white} strokeWidth={2.4} /> : null}
  </View>
);

const IdentityIcon = ({ loan }: { loan: SavedLoan }) => {
  const purpose = getLoanPurpose(loan);
  if (purpose) return <LoanPurposeIconTile purpose={purpose} size={40} />;

  // Match LoanPurposeIconTile's chrome (size 40 → radius 14, icon 22) so the mortgage
  // avatar reads identically to the loan-purpose avatars in the same list.
  return (
    <View style={styles.iconTile}>
      <Icon icon={IconName.MortgageIcon} color={colours.primary} size={22} strokeWidth={1.85} />
    </View>
  );
};

const LoanProfileCardComponent = ({
  loan,
  onPress,
  onTogglePinned,
  selectionMode = false,
  selected = false,
  onLongPress,
  onToggleSelected,
}: Props) => {
  const { t, i18n } = useTranslation();
  const pinAnimatedStyle = usePinFeedback(loan.pinnedToDashboard);
  const isDraft = loan.status === 'draft';
  const suppressPressRef = useRef(false);
  const handleLongPress = () => {
    suppressPressRef.current = true;
    onLongPress?.(loan.id);
    setTimeout(() => {
      suppressPressRef.current = false;
    }, 0);
  };
  const handleCardPress = () => {
    if (suppressPressRef.current) return;
    if (selectionMode && onToggleSelected) {
      onToggleSelected(loan.id);
      return;
    }
    onPress(loan);
  };
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
  const purpose = getLoanPurpose(loan);
  const categoryLabel = purpose ? t(`loanPurpose.${purpose}`) : t(`saved.category.${loan.category}`);

  if (isDraft || !insight) {
    const draftLabel = `${loan.nickname.trim() || t('track.draftUntitled')}. ${t('saved.draftA11y')}`;
    return (
      <TouchableOpacity
        onPress={handleCardPress}
        onLongPress={handleLongPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={draftLabel}
      >
        <Card padding={0} style={[styles.card, selected && styles.cardSelected]}>
          <View style={[styles.inner, styles.draftInner]}>
            <View style={styles.identity}>
              <IdentityIcon loan={loan} />
              <View style={styles.titleBlock}>
                <AppText variant="title3" tone="default" numberOfLines={1}>
                  {loan.nickname.trim() || t('track.draftUntitled')}
                </AppText>
                <View style={styles.draftBadge}>
                  <AppText variant="labelSm" tone="accent" numberOfLines={1}>
                    {t('track.draftBadge')}
                  </AppText>
                </View>
              </View>
            </View>
            {selectionMode ? (
              <SelectionCheckbox selected={selected} />
            ) : (
              <View style={styles.detailsCue}>
                <Icon icon={IconName.ChevronRightIcon} color={colours.primary} size={18} strokeWidth={1.8} />
              </View>
            )}
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
    categoryLabel,
    `${t(primaryMetric.labelKey)}: ${primaryMetric.value}`,
    summary.progress
      ? t('saved.balancePaidWithPercent', { percent: Math.round((summary.progress.value ?? 0) * 100) })
      : undefined,
    overpaymentSavings ? t('saved.savedInterestBadge', { amount: overpaymentSavings }) : undefined,
    loan.pinnedToDashboard ? t('saved.pinnedA11y') : undefined,
  ].filter(Boolean).join('. ');

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      onLongPress={handleLongPress}
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
          onTogglePinned(loan.id);
        }
      }}
    >
      <Card padding={0} style={[styles.card, selected && styles.cardSelected]}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <IdentityIcon loan={loan} />
              <View style={styles.titleBlock}>
                <AppText variant="title3" tone="default" numberOfLines={1} adjustsFontSizeToFit>
                  {loan.nickname}
                </AppText>
                <View style={styles.metaRow}>
                  <LoanCategoryTag
                    loan={loan}
                    color={colours.primary}
                    iconSize={12}
                    style={styles.categoryLabel}
                  />
                  {displayDetails.lender ? (
                    <AppText variant="helper" tone="muted" numberOfLines={1} style={[styles.metaText, styles.smallLabel]}>
                      {displayDetails.lender}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </View>
            {selectionMode ? (
              <SelectionCheckbox selected={selected} />
            ) : (
              <TouchableOpacity
                onPress={event => {
                  event.stopPropagation();
                  onTogglePinned(loan.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={loan.pinnedToDashboard ? t('mortgage.unpinHint') : t('mortgage.pinToDashboard')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.pinButton, loan.pinnedToDashboard && styles.pinButtonActive]}
                activeOpacity={0.84}
              >
                <Animated.View style={pinAnimatedStyle}>
                  <Icon
                    icon={IconName.PinIcon}
                    color={loan.pinnedToDashboard ? colours.secondary : colours.primary}
                    fill={loan.pinnedToDashboard ? colours.secondary : undefined}
                    size={16}
                    strokeWidth={1.8}
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.balanceBlock}>
            <View style={styles.balanceCopy}>
              <AppText variant="helper" tone="muted" numberOfLines={1} style={styles.smallLabel}>
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
                <AppText variant="helper" tone="muted" numberOfLines={1} style={styles.smallLabel}>
                  {t(metric.labelKey)}
                </AppText>
                <AppText variant="labelMd" tone="default" numberOfLines={1} adjustsFontSizeToFit>
                  {metric.value}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <AppText variant="helper" tone="muted" numberOfLines={1} style={[styles.footerMeta, styles.smallLabel]}>
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

// Memoised: the saved list re-renders on search keystrokes, focus refreshes and
// selection changes. Without this every row (each running a full amortisation in
// its `useMemo`) re-rendered on each of those. Rows now re-render only when their
// own `loan`, `selected` or `selectionMode` actually change.
export const LoanProfileCard = memo(LoanProfileCardComponent);
LoanProfileCard.displayName = 'LoanProfileCard';

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: colours.primary,
    backgroundColor: colours.surfaceAccent,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colours.borderStrong,
    backgroundColor: colours.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colours.primary,
    backgroundColor: colours.primary,
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
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.borderSoft,
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
  // Nudge the muted descriptor labels (helper variant is 11px in the shared
  // package) up a touch without changing the package that the web app shares.
  smallLabel: {
    fontSize: fontSizes.sm,
    lineHeight: 17,
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
