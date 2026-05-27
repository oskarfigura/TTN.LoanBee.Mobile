import { calculateMinPayment } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';

// Accepts both stored ('PERCENT'/'CASH') and form ('percent'/'cash') casings so
// callers do not need to remember which boundary they are at.
export const isPercentDownPayment = (downPaymentType: DownPaymentType | string): boolean => (
  String(downPaymentType).toLowerCase() === DownPaymentType.PERCENT
);

export const getEffectiveLoanAmount = (
  loanAmount: number,
  downPayment: number,
  downPaymentType: DownPaymentType | string,
) => {
  const reduction = isPercentDownPayment(downPaymentType)
    ? (downPayment / 100) * loanAmount
    : downPayment;
  return Math.max(0, loanAmount - reduction);
};

export const getMinimumAmortisingPayment = (
  loanAmount: number,
  interest: number,
  downPayment: number,
  downPaymentType: DownPaymentType | string,
) => {
  const effectiveLoanAmount = getEffectiveLoanAmount(loanAmount, downPayment, downPaymentType);
  return calculateMinPayment(effectiveLoanAmount, interest);
};
