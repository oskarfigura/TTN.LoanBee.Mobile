import { DownPaymentType } from './DownPaymentType';
import { LoanCalculationType } from './LoanCalculationType';
import { getBaseLog, getOverallTermInMonths } from './loanHelper';

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
        interest,
        monthlyInterest,
        termInYears,
        termInMonths,
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
    return Math.ceil(payment + 1);
};

export const calculateMonthlyPayments = (
    monthlyInterest: number,
    termInYears: number,
    termInMonths: number,
    amount: number
) => {
    var overallTermInMonths = getOverallTermInMonths(termInYears, termInMonths);

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
    interest: number,
    monthlyInterest: number,
    termInYears: number,
    termInMonths: number,
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

    let count = 1;
    while (remainingLoanAmount > 0) {
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
