import { LoanDeal } from '@/types/SavedLoan';
import { isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import {
  NumericValidation,
  validateDurationText,
  validateMoneyText,
} from '@/utils/formValidation';

export type CompletionOverpaymentRowInput = {
  date: string;
  amount: string;
};

export type CompletionOverpaymentRowValidation = {
  amount: NumericValidation;
  dateErrorKey?: string;
  projectedBalance: number;
  isValid: boolean;
};

export const validateCurrentDealDurationText = (
  yearsRaw: string,
  monthsRaw: string,
  mortgageTermInMonths: number,
) => validateDurationText(yearsRaw, monthsRaw, { maxTotalMonths: mortgageTermInMonths });

export const validateCompletionAmounts = (
  closingBalance: string,
  feesAdded: string,
) => ({
  closingBalance: validateMoneyText(closingBalance, { allowZero: true }),
  feesAdded: validateMoneyText(feesAdded, { allowZero: true }),
});

const monthsBetweenDates = (startDate: string, endDate: string): number => {
  const start = parseDateLabelValue(startDate);
  const end = parseDateLabelValue(endDate);
  if (!start || !end) return 0;

  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
};

export const getProjectedDealBalanceAtDate = (
  deal: LoanDeal,
  eventDate: string,
): number => {
  const months = monthsBetweenDates(deal.startDate, eventDate);
  const monthlyRate = deal.interestRate / 100 / 12;
  let balance = deal.openingBalance;

  for (let month = 0; month < months; month += 1) {
    const interest = balance * monthlyRate;
    balance = Math.max(0, balance + interest - deal.monthlyPayment - deal.regularOverpayment);
  }

  return +balance.toFixed(2);
};

export const validateCompletionOverpaymentRow = (
  row: CompletionOverpaymentRowInput,
  deal: LoanDeal,
  completedAt: string,
): CompletionOverpaymentRowValidation => {
  const amount = validateMoneyText(row.amount);
  let dateErrorKey: string | undefined;

  if (!isValidIsoDate(row.date)) {
    dateErrorKey = 'mortgage.invalidEventDate';
  } else if (row.date < deal.startDate || row.date > completedAt) {
    dateErrorKey = 'mortgage.eventOutsideDealDates';
  }

  const projectedBalance = isValidIsoDate(row.date)
    ? getProjectedDealBalanceAtDate(deal, row.date)
    : deal.openingBalance;

  if (!dateErrorKey && amount.isValid && amount.numeric > projectedBalance) {
    return {
      amount: {
        ...amount,
        errorKey: 'mortgage.overpaymentTooLarge',
        isValid: false,
      },
      projectedBalance,
      isValid: false,
    };
  }

  return {
    amount,
    dateErrorKey,
    projectedBalance,
    isValid: amount.isValid && !dateErrorKey,
  };
};
