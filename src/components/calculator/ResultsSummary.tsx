import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';

interface Props {
  monthlyPayments: number;
  totalInterestPaid: number;
  totalAmountPaid: number;
  termInYears: number;
  termInMonths: number;
  currency: CurrencyCode;
}

export const ResultsSummary = ({
  monthlyPayments,
  totalInterestPaid,
  totalAmountPaid,
  termInYears,
  termInMonths,
  currency,
}: Props) => {
  const { t } = useTranslation();

  const termLabel = [
    termInYears > 0 ? `${termInYears} ${t('results.years')}` : '',
    termInMonths > 0 ? `${termInMonths} ${t('results.months')}` : '',
  ].filter(Boolean).join(` ${t('results.and')} `) || '—';

  return (
    <View>
      <View style={styles.row}>
        <SummaryCard
          label={t('results.monthlyPayment')}
          value={formatCurrency(monthlyPayments, currency)}
          accent
        />
      </View>
      <View style={styles.row}>
        <SummaryCard
          label={t('results.totalInterest')}
          value={formatCurrency(totalInterestPaid, currency)}
        />
        <View style={styles.spacer} />
        <SummaryCard
          label={t('results.totalCost')}
          value={formatCurrency(totalAmountPaid, currency)}
        />
      </View>
      <View style={styles.row}>
        <SummaryCard
          label={t('results.loanTerm')}
          value={termLabel}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  spacer: { width: 10 },
});
