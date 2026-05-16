import { getLoanCalculations } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { LoanFormSnapshot } from '@/types/SavedLoan';
import { monthsBetween, parseDateLabelValue } from '@/utils/date';

export type LumpSumEntry = { date: string; amount: number };

export type OverpaymentTotals = {
  totalInterestPaid: number;
  totalTermInMonths: number;
  monthlyPayments: number;
};

export type OverpaymentResult = {
  baseline: OverpaymentTotals;
  scenario: OverpaymentTotals;
  interestSaved: number;
  monthsSaved: number;
};

const toCalcType = (s: string): LoanCalculationType =>
  s.toLowerCase() as LoanCalculationType;

const toDpType = (s: string): DownPaymentType =>
  s.toLowerCase() as DownPaymentType;

const baselineTotals = (form: LoanFormSnapshot): OverpaymentTotals => {
  const result = getLoanCalculations(
    form.loanAmount, form.interest, form.termInYears, form.termInMonths,
    form.desiredMonthlyPayment ?? 0, toCalcType(form.calculationType),
    form.downPayment, toDpType(form.downPaymentType),
    0, form.startDate,
  );
  return {
    totalInterestPaid: result.totalInterestPaid,
    totalTermInMonths: result.tableItems.length,
    monthlyPayments: result.monthlyPayments,
  };
};

// Applies monthly overpayment + N sorted lump sums to the loan, returning totals.
const scenarioTotals = (
  form: LoanFormSnapshot,
  monthlyOverpayment: number,
  lumpSums: LumpSumEntry[],
): OverpaymentTotals => {
  const calcType = toCalcType(form.calculationType);
  const dpType = toDpType(form.downPaymentType);

  const withMonthly = getLoanCalculations(
    form.loanAmount, form.interest, form.termInYears, form.termInMonths,
    form.desiredMonthlyPayment ?? 0, calcType,
    form.downPayment, dpType,
    monthlyOverpayment, form.startDate,
  );

  const sorted = [...lumpSums]
    .filter(ls => ls.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return {
      totalInterestPaid: withMonthly.totalInterestPaid,
      totalTermInMonths: withMonthly.tableItems.length,
      monthlyPayments: withMonthly.monthlyPayments,
    };
  }

  // Multi-phase: each lump sum slices the amortisation table.
  // We carry a running total of interest and track a "current" calculation result
  // which starts as the monthly-overpayment schedule.
  let currentResult = withMonthly;
  let currentStartDate = form.startDate;
  let accumulatedInterest = 0;
  let accumulatedMonths = 0;

  for (const ls of sorted) {
    const lumpSumDate = parseDateLabelValue(ls.date) ?? new Date();
    const monthIndex = monthsBetween(currentStartDate, lumpSumDate);

    if (monthIndex <= 0 || monthIndex >= currentResult.tableItems.length) {
      continue;
    }

    // Interest accrued before this lump sum
    const phaseInterest = currentResult.tableItems
      .slice(0, monthIndex)
      .reduce((sum, row) => sum + parseFloat(row.interest), 0);

    accumulatedInterest += phaseInterest;
    accumulatedMonths += monthIndex;

    const balanceAtLumpSum = parseFloat(currentResult.tableItems[monthIndex - 1].ending);
    const newBalance = Math.max(0, balanceAtLumpSum - ls.amount);

    if (newBalance <= 0) {
      // Loan paid off by this lump sum
      return {
        totalInterestPaid: accumulatedInterest,
        totalTermInMonths: accumulatedMonths,
        monthlyPayments: withMonthly.monthlyPayments,
      };
    }

    // Recalculate remaining schedule from the new lower balance
    currentResult = getLoanCalculations(
      newBalance, form.interest, 0, 0,
      withMonthly.monthlyPayments, 'payment',
      0, 'percent',
      0, ls.date,
    );
    currentStartDate = ls.date;
  }

  return {
    totalInterestPaid: accumulatedInterest + currentResult.totalInterestPaid,
    totalTermInMonths: accumulatedMonths + currentResult.tableItems.length,
    monthlyPayments: withMonthly.monthlyPayments,
  };
};

// Builds the month-by-month remaining balance array for the scenario (with
// overpayments). Mirrors the phased logic of scenarioTotals but accumulates
// the loanChartRemainingArray instead of just the totals, so the result can
// be plotted directly against the baseline.
export const buildScenarioRemainingArray = (
  form: LoanFormSnapshot,
  monthlyOverpayment: number,
  lumpSums: LumpSumEntry[],
): number[] => {
  const calcType = toCalcType(form.calculationType);
  const dpType = toDpType(form.downPaymentType);

  const withMonthly = getLoanCalculations(
    form.loanAmount, form.interest, form.termInYears, form.termInMonths,
    form.desiredMonthlyPayment ?? 0, calcType,
    form.downPayment, dpType,
    monthlyOverpayment, form.startDate,
  );

  const sorted = [...lumpSums]
    .filter(ls => ls.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return [...withMonthly.loanChartRemainingArray];
  }

  let accumulated: number[] = [];
  let currentResult = withMonthly;
  let currentStartDate = form.startDate;

  for (const ls of sorted) {
    const lumpSumDate = parseDateLabelValue(ls.date) ?? new Date();
    const monthIndex = monthsBetween(currentStartDate, lumpSumDate);

    if (monthIndex <= 0 || monthIndex >= currentResult.tableItems.length) {
      continue;
    }

    // Collect this phase up to the lump-sum point.
    // loanChartRemainingArray[0] = initial balance, [n] = balance after n months.
    // On the first phase include [0]; on subsequent phases skip [0] as it
    // duplicates the last element we already pushed.
    if (accumulated.length === 0) {
      accumulated = [...currentResult.loanChartRemainingArray.slice(0, monthIndex + 1)];
    } else {
      accumulated.push(...currentResult.loanChartRemainingArray.slice(1, monthIndex + 1));
    }

    const balanceAtCut = accumulated[accumulated.length - 1];
    const newBalance = Math.max(0, balanceAtCut - ls.amount);
    accumulated[accumulated.length - 1] = newBalance;

    if (newBalance <= 0) {
      return accumulated;
    }

    currentResult = getLoanCalculations(
      newBalance, form.interest, 0, 0,
      withMonthly.monthlyPayments, 'payment',
      0, 'percent',
      0, ls.date,
    );
    currentStartDate = ls.date;
  }

  if (accumulated.length === 0) {
    return [...withMonthly.loanChartRemainingArray];
  }

  accumulated.push(...currentResult.loanChartRemainingArray.slice(1));
  return accumulated;
};

export const computeLoanOverpayments = (
  form: LoanFormSnapshot,
  monthlyOverpayment: number,
  lumpSums: LumpSumEntry[],
): OverpaymentResult => {
  const baseline = baselineTotals(form);
  const scenario = scenarioTotals(form, monthlyOverpayment, lumpSums);
  return {
    baseline,
    scenario,
    interestSaved: Math.max(0, baseline.totalInterestPaid - scenario.totalInterestPaid),
    monthsSaved: Math.max(0, baseline.totalTermInMonths - scenario.totalTermInMonths),
  };
};
