import { calculateMinPayment } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';

export const getEffectiveLoanAmount = (
  loanAmount: number,
  downPayment: number,
  downPaymentType: DownPaymentType | string,
) => {
  if (downPaymentType === DownPaymentType.PERCENT) {
    return loanAmount - ((downPayment / 100) * loanAmount);
  }

  return loanAmount - downPayment;
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
