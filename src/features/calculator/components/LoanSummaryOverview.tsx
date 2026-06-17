import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoanInsightCard } from '@/features/tracker/components/dashboard/LoanInsightCard';
import { SavedLoanProgressBar } from '@/features/tracker/components/dashboard/SavedLoanProgressBar';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import {
  buildCalculationDisplayContract,
  buildSavedLoanDisplayContract,
} from '@/shared/domain/loans/loanDisplayContract';
import { LoanResult } from '@/shared/domain/results/loanResultRoute';
import { colours, fontFaces, fontSizes, spacing } from '@/shared/ui/theme';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

interface Props {
  result: LoanResult;
  startDate: string;
  currency: CurrencyCode;
  mode?: 'calculation' | 'saved';
  savedLoan?: SavedLoan;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  onShare?: () => void;
  shareLabel?: string;
  shareIcon?: React.ReactNode;
}

export const LoanSummaryOverview = ({
  result,
  startDate,
  currency,
  mode = 'calculation',
  savedLoan,
  title,
  subtitle,
  headerAction,
  onShare,
  shareLabel,
  shareIcon,
}: Props) => {
  const { t, i18n } = useTranslation();
  const summary = useMemo(() => (
    mode === 'saved' && savedLoan
      ? buildSavedLoanDisplayContract({
        loan: savedLoan,
        result,
        asOf: new Date(),
        locale: i18n.language,
      }).summary
      : buildCalculationDisplayContract({
        result,
        startDate,
        currency,
        locale: i18n.language,
      }).summary
  ), [currency, i18n.language, mode, result, savedLoan, startDate]);

  const shareAction = onShare ? (
    <TouchableOpacity
      style={styles.shareAction}
      onPress={onShare}
      activeOpacity={0.82}
      accessibilityRole="button"
    >
      {shareIcon ? <View style={styles.shareIcon}>{shareIcon}</View> : null}
      <Text style={styles.shareText} numberOfLines={1} adjustsFontSizeToFit>
        {shareLabel ?? t('share.short')}
      </Text>
    </TouchableOpacity>
  ) : null;

  return (
    <LoanInsightCard
      summary={summary}
      density="full"
      title={title}
      subtitle={subtitle}
      headerAction={headerAction ?? shareAction}
      showProgress={mode === 'saved'}
      progressContent={mode === 'saved' && savedLoan ? (
        <SavedLoanProgressBar loan={savedLoan} result={result} summary={summary} />
      ) : undefined}
      style={styles.card}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  shareAction: {
    minHeight: 32,
    maxWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  shareIcon: {
    marginRight: 5,
  },
  shareText: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xs,
    color: colours.primary,
  },
});
