import React from 'react';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { MortgageBalanceChart } from './MortgageBalanceChart';

interface Props {
  baselineRemaining: number[];
  scenarioRemaining: number[];
  currency: CurrencyCode;
  height?: number;
}

export const OverpaymentsComparisonChart = ({
  baselineRemaining,
  scenarioRemaining,
  currency,
  height = 196,
}: Props) => {
  return (
    <MortgageBalanceChart
      baselineRemaining={baselineRemaining}
      scenarioRemaining={scenarioRemaining}
      currency={currency}
      height={height}
      comparisonLabelKeys={{
        baseline: 'overpayments.withoutOverpayments',
        scenario: 'overpayments.withOverpayments',
      }}
    />
  );
};
