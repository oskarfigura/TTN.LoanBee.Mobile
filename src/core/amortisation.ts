import { DownPaymentType } from './DownPaymentType';
import { LoanCalculationType } from './LoanCalculationType';
import { getBaseLog, getOverallTermInMonths } from './loanHelper';

// Hard upper bound on table rows produced by getTableItems. The engine has no
// other termination guard — if a caller bypasses validation and supplies a
// payment <= interest, the while-loop never converges and the app OOMs. This
// cap is sized at ~110 years of monthly payments, well above any realistic
// amortisation. Hitting it means the inputs were invalid.
const MAX_AMORTISATION_ROWS = 110 * 12;

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
    startDate: string
) => {
    initialAmount = +initialAmount;
    interest = +interest;
    termInYears = +termInYears;
    termInMonths = +termInMonths;
    desiredMonthlyPayments = +desiredMonthlyPayments;
    additionalMonthlyPayment = +additionalMonthlyPayment;

    if (downPayment !== 0) {
        downPayment = calculateDownPayment(
            initialAmount,
            downPayment,
            downPaymentType
        );
    }

    downPayment = +downPayment;

    let amount = initialAmount - downPayment;

    var monthlyInterest = interest / 100 / 12;
    var monthlyPayments = 0;

    if (
        (termInYears !== 0 || termInMonths !== 0) &&
        calculationType === LoanCalculationType.TERM
    ) {
        monthlyPayments = calculateMonthlyPayments(
            monthlyInterest,
            termInYears,
            termInMonths,
            amount
        );

        if (additionalMonthlyPayment !== 0) {
            monthlyPayments = monthlyPayments + additionalMonthlyPayment;
        }
    } else {
        monthlyPayments = desiredMonthlyPayments;
    }

    let result = getTableItems(
        amount,
        monthlyInterest,
        monthlyPayments,
        downPayment
    );

    return {
        ...result,
        monthlyPayments: monthlyPayments,
        downPayment: downPayment,
        amount: initialAmount,
        interest: interest,
        startDate: startDate,
    };
};

export const calculateDownPayment = (amount: number, downPayment: number, type: DownPaymentType | string) => {
    let downPaymentCalculated = downPayment;
    if (type === DownPaymentType.PERCENT) {
        downPaymentCalculated = (downPayment / 100) * amount;
    }

    return downPaymentCalculated;
};

export const calculateMinPayment = (amount: number, interest: number) => {
    let payment = (amount * (interest / 100)) / 12;
    // Buffer = 0.1% of the interest portion + £10 so principal is always
    // meaningful. The previous +£1 buffer was thin enough at large balances
    // that the engine still produced 200+ row tables at the validated minimum.
    const buffer = Math.max(10, payment * 0.001);
    return Math.ceil(payment + buffer);
};

export const calculateMonthlyPayments = (
    monthlyInterest: number,
    termInYears: number,
    termInMonths: number,
    amount: number
) => {
    var overallTermInMonths = getOverallTermInMonths(termInYears, termInMonths);

    if (overallTermInMonths <= 0) return 0;
    // Without this guard the annuity formula divides by zero and returns NaN,
    // which then propagates through getTableItems and produces garbage rows.
    if (monthlyInterest <= 0) return amount / overallTermInMonths;

    var commonMultiplier = (1 + monthlyInterest) ** overallTermInMonths;
    var monthlyPayments =
        amount * ((monthlyInterest * commonMultiplier) / (commonMultiplier - 1));

    return monthlyPayments;
};

export const calculateTerm = (
    monthlyInterest: number,
    desiredMonthlyPayments: number,
    amount: number
) => {
    var base = 1 + monthlyInterest;
    var x = desiredMonthlyPayments / (amount * monthlyInterest);
    var y = desiredMonthlyPayments / (amount * monthlyInterest) - 1;
    var log = x / y;

    return getBaseLog(base, log);
};

export const getTableItems = (
    amount: number,
    monthlyInterest: number,
    monthlyPayments: number,
    downPayment: number
) => {
    let tableItemsArray: Array<{
        itemNo: number;
        remaining: string;
        principal: string;
        interest: string;
        ending: string;
    }> = [];

    var remainingLoanAmount = amount;

    let totalAmountPaid = 0;
    let totalInterestPaid = 0;

    var loanChartMonthlyArray: number[] = [0];
    var loanChartInterestArray: number[] = [0];
    var loanChartRemainingArray: number[] = [amount];
    var loanChartLabelArray: string[] = [];
    var monthlyAccumulative = 0;
    var interestAccumulative = 0;

    // Reject inputs the loop cannot converge on. Any of these would either
    // produce NaN-filled rows or run until the heap is exhausted.
    if (
        !Number.isFinite(amount) ||
        !Number.isFinite(monthlyInterest) ||
        !Number.isFinite(monthlyPayments) ||
        amount <= 0 ||
        monthlyPayments <= 0 ||
        monthlyPayments <= amount * monthlyInterest
    ) {
        return {
            tableItems: [],
            totalAmountPaid: 0,
            totalInterestPaid: 0,
            termInYears: 0,
            termInMonths: 0,
            loanChartMonthlyArray: [0],
            loanChartInterestArray: [0],
            loanChartRemainingArray: [Number.isFinite(amount) ? amount : 0],
            loanChartLabelArray: [],
        };
    }

    let count = 1;
    while (remainingLoanAmount > 0 && count <= MAX_AMORTISATION_ROWS) {
        var itemNo = count;
        let interestPayment = remainingLoanAmount * monthlyInterest;
        var principal = monthlyPayments - interestPayment;
        var remaining = remainingLoanAmount;
        remainingLoanAmount = remainingLoanAmount - principal;

        tableItemsArray.push({
            itemNo: itemNo,
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
            remainingLoanAmount < monthlyPayments &&
            +Math.abs(remainingLoanAmount).toFixed(2) > 0
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
                itemNo: itemNo,
                remaining: remaining.toFixed(2),
                principal: principal.toFixed(2),
                interest: interestPayment.toFixed(2),
                ending: Math.abs(remainingLoanAmount).toFixed(2),
            });
        }

        count++;
    }

    let years = Math.floor(tableItemsArray.length / 12);
    let months = tableItemsArray.length % 12;
    totalInterestPaid = loanChartInterestArray[loanChartInterestArray.length - 1];
    totalAmountPaid = amount + downPayment + totalInterestPaid;
    return {
        tableItems: tableItemsArray,
        totalAmountPaid: +totalAmountPaid.toFixed(2),
        totalInterestPaid: +totalInterestPaid.toFixed(2),
        termInYears: years,
        termInMonths: months,
        loanChartMonthlyArray: loanChartMonthlyArray,
        loanChartInterestArray: loanChartInterestArray,
        loanChartRemainingArray: loanChartRemainingArray,
        loanChartLabelArray: loanChartLabelArray,
    };
};
