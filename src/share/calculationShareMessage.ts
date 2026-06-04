import { CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { LoanResult } from '@/results/loanResultRoute';
import { getCalculationWebShareUrl, ShareableCalculationValues } from '@/share/calculationShareLink';
import { LoanCategory } from '@/types/SavedLoan';

export type ShareTranslate = (key: string, options?: Record<string, string>) => string;

export interface CalculationSharePayload {
  title: string;
  message: string;
  url: string;
}

export interface CalculationShareInput {
  result: LoanResult;
  formValues: Partial<ShareableCalculationValues>;
  currency: CurrencyCode;
  category?: LoanCategory;
  t: ShareTranslate;
}

const getCategoryShareKeys = (category?: LoanCategory) => {
  if (category === 'mortgage') {
    return {
      titleKey: 'share.titleMortgage',
      introKey: 'share.introMortgage',
    };
  }

  if (category === 'loan') {
    return {
      titleKey: 'share.titleLoan',
      introKey: 'share.introLoan',
    };
  }

  return {
    titleKey: 'share.title',
    introKey: 'share.intro',
  };
};

export const buildCalculationSharePayload = ({
  result,
  formValues,
  currency,
  category,
  t,
}: CalculationShareInput): CalculationSharePayload => {
  const shareValues = {
    ...formValues,
    currency,
  } as ShareableCalculationValues;
  const shareUrl = getCalculationWebShareUrl(shareValues);
  const monthlyPayment = formatCurrency(result.monthlyPayments, currency);
  const totalInterest = formatCurrency(result.totalInterestPaid, currency);
  const totalCost = formatCurrency(result.totalAmountPaid, currency);
  const { titleKey, introKey } = getCategoryShareKeys(category);

  return {
    title: t(titleKey),
    message: [
      t(introKey),
      '',
      t('share.monthlyPayment', { amount: monthlyPayment }),
      t('share.totalInterest', { amount: totalInterest }),
      t('share.totalCost', { amount: totalCost }),
      '',
      t('share.viewCalculation'),
      shareUrl,
    ].join('\n'),
    url: shareUrl,
  };
};
