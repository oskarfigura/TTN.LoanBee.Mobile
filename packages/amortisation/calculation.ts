import {
  AmortisationTableItem,
  DownPaymentType,
  LoanCalculationInput,
  LoanCalculationResult,
  LoanCalculationType,
} from './types';
import { getOverallTermInMonths } from './dates';

export const MAX_AMORTISATION_ROWS = 110 * 12;

export const nFormatter = (num: number, digits: number) => {
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'B' },
    { value: 1e12, symbol: 't' },
    { value: 1e15, symbol: 'q' },
    { value: 1e18, symbol: 'Q' },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  const item = lookup
    .slice()
    .reverse()
    .find(entry => num >= entry.value);
  return item
    ? (num / item.value).toFixed(digits).replace(rx, '$1') + item.symbol
    : '0';
};

export const numberWithCommas = (value: string) => (
  value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
);

export const getBaseLog = (x: number, y: number) => (
  Math.log(y) / Math.log(x)
);

export const convertToWholeNumber = (value: string | number | undefined): number => {
  if (typeof value === 'string') {
    return Number.isNaN(Number.parseFloat(value)) ? 0 : Number.parseFloat(value);
  }

  if (typeof value === 'undefined') {
    return 0;
  }

  return value;
};

export const calculateDownPayment = (
  amount: number,
  downPayment: number,
  type: DownPaymentType | string,
) => {
  if (String(type).toLowerCase() === DownPaymentType.PERCENT) {
    return (downPayment / 100) * amount;
  }

  return downPayment;
};

export const calculateMinPayment = (amount: number, interest: number) => {
  const payment = (amount * (interest / 100)) / 12;
  return Math.ceil(payment + 1);
};

export const calculateMonthlyPayments = (
  monthlyInterest: number,
  termInYears: number,
  termInMonths: number,
  amount: number,
) => {
  const overallTermInMonths = getOverallTermInMonths(termInYears, termInMonths);
  const commonMultiplier = (1 + monthlyInterest) ** overallTermInMonths;

  return amount * ((monthlyInterest * commonMultiplier) / (commonMultiplier - 1));
};

export const calculateMinimumPaymentForTerm = (
  amount: number,
  interest: number,
  termInMonths = MAX_AMORTISATION_ROWS,
) => {
  const months = Math.max(1, Math.floor(termInMonths));
  const monthlyInterest = interest / 100 / 12;

  if (monthlyInterest === 0) {
    return Math.ceil(amount / months);
  }

  return Math.ceil(calculateMonthlyPayments(monthlyInterest, 0, months, amount));
};

export const calculateTerm = (
  monthlyInterest: number,
  desiredMonthlyPayments: number,
  amount: number,
) => {
  const base = 1 + monthlyInterest;
  const x = desiredMonthlyPayments / (amount * monthlyInterest);
  const y = desiredMonthlyPayments / (amount * monthlyInterest) - 1;
  const log = x / y;

  return getBaseLog(base, log);
};

export const getTableItems = (
  amount: number,
  monthlyInterest: number,
  monthlyPayments: number,
  downPayment: number,
) => {
  const tableItemsArray: AmortisationTableItem[] = [];
  let remainingLoanAmount = amount;
  const loanChartMonthlyArray: number[] = [0];
  const loanChartInterestArray: number[] = [0];
  const loanChartRemainingArray: number[] = [amount];
  const loanChartLabelArray: string[] = [];
  let monthlyAccumulative = 0;
  let interestAccumulative = 0;

  let count = 1;
  while (remainingLoanAmount > 0 && count <= MAX_AMORTISATION_ROWS) {
    let itemNo = count;
    let interestPayment = remainingLoanAmount * monthlyInterest;
    let principal = monthlyPayments - interestPayment;
    let remaining = remainingLoanAmount;
    remainingLoanAmount -= principal;

    tableItemsArray.push({
      itemNo,
      remaining: remaining.toFixed(2),
      principal: principal.toFixed(2),
      interest: interestPayment.toFixed(2),
      ending: Math.abs(remainingLoanAmount).toFixed(2),
    });

    monthlyAccumulative += monthlyPayments;
    interestAccumulative += interestPayment;

    loanChartMonthlyArray.push(+monthlyAccumulative.toFixed(2));
    loanChartInterestArray.push(+interestAccumulative.toFixed(2));
    loanChartRemainingArray.push(+remainingLoanAmount.toFixed(2));
    loanChartLabelArray.push(count.toString());

    if (
      remainingLoanAmount < monthlyPayments
      && +Math.abs(remainingLoanAmount).toFixed(2) > 0
    ) {
      interestPayment = remainingLoanAmount * monthlyInterest;
      principal = remainingLoanAmount;
      remaining = remainingLoanAmount;
      monthlyAccumulative += remainingLoanAmount + interestPayment;
      interestAccumulative += interestPayment;
      loanChartMonthlyArray.push(+monthlyAccumulative.toFixed(2));
      loanChartInterestArray.push(+interestAccumulative.toFixed(2));
      remainingLoanAmount = 0;
      loanChartRemainingArray.push(+remainingLoanAmount.toFixed(2));
      itemNo = count + 1;
      tableItemsArray.push({
        itemNo,
        remaining: remaining.toFixed(2),
        principal: principal.toFixed(2),
        interest: interestPayment.toFixed(2),
        ending: Math.abs(remainingLoanAmount).toFixed(2),
      });
    }

    count++;
  }

  const remainingBalance = +Math.max(remainingLoanAmount, 0).toFixed(2);
  const isFullyAmortised = remainingBalance === 0;
  const years = Math.floor(tableItemsArray.length / 12);
  const months = tableItemsArray.length % 12;
  const totalInterestPaid = loanChartInterestArray[loanChartInterestArray.length - 1];
  const totalAmountPaid = isFullyAmortised
    ? amount + downPayment + totalInterestPaid
    : downPayment + monthlyAccumulative;

  return {
    tableItems: tableItemsArray,
    totalAmountPaid: +totalAmountPaid.toFixed(2),
    totalInterestPaid: +totalInterestPaid.toFixed(2),
    termInYears: years,
    termInMonths: months,
    loanChartMonthlyArray,
    loanChartInterestArray,
    loanChartRemainingArray,
    loanChartLabelArray,
    isFullyAmortised,
    remainingBalance,
  };
};

export const calculateLoan = ({
  loanAmount,
  interest,
  termInYears,
  termInMonths,
  desiredMonthlyPayment,
  calculationType,
  downPayment,
  downPaymentType,
  additionalMonthlyPayment,
  startDate,
}: LoanCalculationInput): LoanCalculationResult => {
  const initialAmount = +loanAmount;
  const interestRate = +interest;
  const years = +termInYears;
  const months = +termInMonths;
  const desiredPayment = +desiredMonthlyPayment;
  const additionalPayment = +additionalMonthlyPayment;
  const calculatedDownPayment = downPayment !== 0
    ? calculateDownPayment(initialAmount, +downPayment, downPaymentType)
    : +downPayment;
  const amount = initialAmount - calculatedDownPayment;
  const monthlyInterest = interestRate / 100 / 12;
  let monthlyPayments = 0;

  if (
    (years !== 0 || months !== 0)
    && String(calculationType).toLowerCase() === LoanCalculationType.TERM
  ) {
    monthlyPayments = calculateMonthlyPayments(
      monthlyInterest,
      years,
      months,
      amount,
    );

    if (additionalPayment !== 0) {
      monthlyPayments += additionalPayment;
    }
  } else {
    monthlyPayments = desiredPayment;
  }

  const result = getTableItems(
    amount,
    monthlyInterest,
    monthlyPayments,
    calculatedDownPayment,
  );

  return {
    ...result,
    monthlyPayments,
    downPayment: calculatedDownPayment,
    amount: initialAmount,
    interest: interestRate,
    startDate,
  };
};

export const getLoanCalculations = (
  initialAmount: number,
  interest: number,
  termInYears: number,
  termInMonths: number,
  desiredMonthlyPayments: number,
  calculationType: LoanCalculationType | string,
  downPayment: number,
  downPaymentType: DownPaymentType | string,
  additionalMonthlyPayment: number,
  startDate: string,
) => calculateLoan({
  loanAmount: initialAmount,
  interest,
  termInYears,
  termInMonths,
  desiredMonthlyPayment: desiredMonthlyPayments,
  calculationType,
  downPayment,
  downPaymentType,
  additionalMonthlyPayment,
  startDate,
});
