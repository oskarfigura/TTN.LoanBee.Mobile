import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { LoanInsightCard } from '@/components/loans/LoanInsightCard';
import { LoanCategoryIcon, MortgageIcon, PinIcon } from '@/components/loans/LoanIcons';
import { buildSavedLoanSummary } from '@/loans/loanInsightSummary';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { SavedLoan } from '@/types/SavedLoan';
import { colours, spacing } from '@/theme';

interface Props {
  loan: SavedLoan;
  onPress: () => void;
  onTogglePinned: () => void;
}

export const LoanProfileCard = ({ loan, onPress, onTogglePinned }: Props) => {
  const { t, i18n } = useTranslation();
  const summary = useMemo(() => {
    const result = getResultForSavedLoan(loan);
    return buildSavedLoanSummary(loan, result, new Date(), i18n.language);
  }, [i18n.language, loan]);
  const CategoryIcon = loan.category === 'mortgage' ? MortgageIcon : LoanCategoryIcon;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LoanInsightCard
        summary={summary}
        density="compact"
        title={loan.nickname}
        subtitle={loan.lender || t(`saved.category.${loan.category}`)}
        eyebrowContent={(
          <View style={styles.categoryLabel}>
            <CategoryIcon color={colours.primary} size={14} />
            <AppText variant="labelSm" tone="accent">
              {t(`saved.category.${loan.category}`)}
            </AppText>
          </View>
        )}
        headerAction={(
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
        )}
        footerContent={(
          <View style={styles.footer}>
            <AppText variant="helper" tone="muted">
              {t('saved.startedOn', { date: loan.formSnapshot.startDate })}
            </AppText>
          </View>
        )}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  footer: {
    gap: spacing.xs,
  },
  categoryLabel: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
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
});
