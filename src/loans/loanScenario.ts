import { getLoanCalculations } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { SavedLoan } from '@/types/SavedLoan';
import { monthsBetween, parseDateLabelValue } from '@/utils/date';

export type LoanScenarioResult = {
  totalInterestPaid: number;
  totalTermInMonths: number;
  monthlyPayments: number;
};

export const computeLoanWithEvents = (
  loan: SavedLoan,
  monthlyOverpayment?: number,
): LoanScenarioResult => {
  const form = loan.formSnapshot;
  const calcType = form.calculationType.toLowerCase() as LoanCalculationType;
  const dpType = form.downPaymentType.toLowerCase() as DownPaymentType;
  const overpayment = monthlyOverpayment ?? (form.additionalMonthlyPayment ?? 0);

  const lumpSums = loan.events
    .filter(e => e.type === 'lumpOverpayment' && (e.amount ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const base = getLoanCalculations(
    form.loanAmount, form.interest, form.termInYears, form.termInMonths,
    form.desiredMonthlyPayment ?? 0, calcType, form.downPayment, dpType,
    overpayment, form.startDate,
  );

  if (lumpSums.length === 0) {
    return {
      totalInterestPaid: base.totalInterestPaid,
      totalTermInMonths: base.tableItems.length,
      monthlyPayments: base.monthlyPayments,
    };
  }

  let accumulatedInterest = 0;
  let accumulatedMonths = 0;
  let currentResult = base;
  let currentStartDate = form.startDate;

  for (const event of lumpSums) {
    const relativeIndex = monthsBetween(currentStartDate, parseDateLabelValue(event.date) ?? new Date());

    if (relativeIndex >= currentResult.tableItems.length) continue;

    accumulatedInterest += currentResult.tableItems
      .slice(0, relativeIndex)
      .reduce((sum, row) => sum + parseFloat(row.interest), 0);

    const balanceAtEvent = relativeIndex === 0
      ? currentResult.loanChartRemainingArray[0]
      : parseFloat(currentResult.tableItems[relativeIndex - 1].ending);
    const newBalance = Math.max(0, balanceAtEvent - (event.amount ?? 0));

    if (newBalance <= 0) {
      return {
        totalInterestPaid: accumulatedInterest,
        totalTermInMonths: accumulatedMonths + relativeIndex,
        monthlyPayments: base.monthlyPayments,
      };
    }

    currentResult = getLoanCalculations(
      newBalance, form.interest, 0, 0,
      base.monthlyPayments, 'payment', 0, 'percent',
      0, event.date,
    );
    accumulatedMonths += relativeIndex;
    currentStartDate = event.date;
  }

  return {
    totalInterestPaid: accumulatedInterest + currentResult.totalInterestPaid,
    totalTermInMonths: accumulatedMonths + currentResult.tableItems.length,
    monthlyPayments: base.monthlyPayments,
  };
};
