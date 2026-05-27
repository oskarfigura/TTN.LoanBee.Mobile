import { getLoanCalculations } from '@/core/amortisation';
import { monthsBetween, parseDateLabelValue } from '@/utils/date';

export type LumpSumEntry = { date: string; amount: number };

export type PhasedAmortisationResult = {
  totalInterestPaid: number;
  totalTermInMonths: number;
  monthlyPayments: number;
};

type PhasedInputs = {
  baseResult: ReturnType<typeof getLoanCalculations>;
  interest: number;
  startDate: string;
  lumpSums: LumpSumEntry[];
};

const sortByDate = (lumpSums: LumpSumEntry[]): LumpSumEntry[] => (
  [...lumpSums]
    .filter(ls => ls.amount > 0 && parseDateLabelValue(ls.date) !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
);

// Applies a sorted list of lump sums to an amortisation schedule. After each
// lump sum the remaining schedule is recalculated against the new lower
// balance, with the monthly payment frozen at the base result's value.
export const computePhasedTotals = ({
  baseResult,
  interest,
  startDate,
  lumpSums,
}: PhasedInputs): PhasedAmortisationResult => {
  const sorted = sortByDate(lumpSums);

  if (sorted.length === 0) {
    return {
      totalInterestPaid: baseResult.totalInterestPaid,
      totalTermInMonths: baseResult.tableItems.length,
      monthlyPayments: baseResult.monthlyPayments,
    };
  }

  let currentResult = baseResult;
  let currentStartDate = startDate;
  let accumulatedInterest = 0;
  let accumulatedMonths = 0;

  for (const ls of sorted) {
    const lumpSumDate = parseDateLabelValue(ls.date);
    if (!lumpSumDate) continue;
    const monthIndex = monthsBetween(currentStartDate, lumpSumDate);
    if (monthIndex >= currentResult.tableItems.length) continue;

    const phaseInterest = currentResult.tableItems
      .slice(0, monthIndex)
      .reduce((sum, row) => sum + parseFloat(row.interest), 0);

    accumulatedInterest += phaseInterest;
    accumulatedMonths += monthIndex;

    const balanceAtLumpSum = monthIndex === 0
      ? currentResult.loanChartRemainingArray[0]
      : parseFloat(currentResult.tableItems[monthIndex - 1].ending);
    const newBalance = Math.max(0, balanceAtLumpSum - ls.amount);

    if (newBalance <= 0) {
      return {
        totalInterestPaid: accumulatedInterest,
        totalTermInMonths: accumulatedMonths,
        monthlyPayments: baseResult.monthlyPayments,
      };
    }

    currentResult = getLoanCalculations(
      newBalance, interest, 0, 0,
      baseResult.monthlyPayments, 'payment',
      0, 'percent',
      0, ls.date,
    );
    currentStartDate = ls.date;
  }

  return {
    totalInterestPaid: accumulatedInterest + currentResult.totalInterestPaid,
    totalTermInMonths: accumulatedMonths + currentResult.tableItems.length,
    monthlyPayments: baseResult.monthlyPayments,
  };
};

// Builds the running remaining-balance array across all phases. Mirrors the
// totals loop but accumulates the chart values so the result can be plotted
// against the baseline.
export const computePhasedRemainingArray = ({
  baseResult,
  interest,
  startDate,
  lumpSums,
}: PhasedInputs): number[] => {
  const sorted = sortByDate(lumpSums);

  if (sorted.length === 0) return [...baseResult.loanChartRemainingArray];

  let accumulated: number[] = [];
  let currentResult = baseResult;
  let currentStartDate = startDate;

  for (const ls of sorted) {
    const lumpSumDate = parseDateLabelValue(ls.date);
    if (!lumpSumDate) continue;
    const monthIndex = monthsBetween(currentStartDate, lumpSumDate);
    if (monthIndex >= currentResult.tableItems.length) continue;

    if (accumulated.length === 0) {
      accumulated = [...currentResult.loanChartRemainingArray.slice(0, monthIndex + 1)];
    } else {
      accumulated.push(...currentResult.loanChartRemainingArray.slice(1, monthIndex + 1));
    }

    const balanceAtCut = accumulated[accumulated.length - 1];
    const newBalance = Math.max(0, balanceAtCut - ls.amount);
    accumulated[accumulated.length - 1] = newBalance;

    if (newBalance <= 0) return accumulated;

    currentResult = getLoanCalculations(
      newBalance, interest, 0, 0,
      baseResult.monthlyPayments, 'payment',
      0, 'percent',
      0, ls.date,
    );
    currentStartDate = ls.date;
  }

  if (accumulated.length === 0) return [...baseResult.loanChartRemainingArray];

  accumulated.push(...currentResult.loanChartRemainingArray.slice(1));
  return accumulated;
};
