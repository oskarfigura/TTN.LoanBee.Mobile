export const nFormatter = (num: number, digits: number) => {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "B" },
        { value: 1e12, symbol: "t" },
        { value: 1e15, symbol: "q" },
        { value: 1e18, symbol: "Q" },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var item = lookup
        .slice()
        .reverse()
        .find(function (item) {
            return num >= item.value;
        });
    return item
        ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
        : "0";
};

export const numberWithCommas = (x: string) => {
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const getBaseLog = (x: number, y: number) => {
    return Math.log(y) / Math.log(x);
};

export const getOverallTermInMonths = (
    termInYears: number,
    termInMonths: number
) => {
    let overallTermInMonths = termInMonths;
    if (termInYears > 0) {
        overallTermInMonths = overallTermInMonths + termInYears * 12;
    }
    return overallTermInMonths;
};

export const getLoanEndDate = (
    startDate: string,
    timeInYears: number,
    timeInMonths: number
) => {
    let date = new Date(startDate);
    let overallTimeInMonths = getOverallTermInMonths(timeInYears, timeInMonths);
    let endDate = new Date(date.setMonth(date.getMonth() + overallTimeInMonths));
    return endDate;
};

export const convertToWholeNumber = (value: string | number | undefined): number => {
    let numericValue = 0;

    if (typeof value === "string") {
        numericValue = isNaN(Number.parseFloat(value)) ? 0 : Number.parseFloat(value);
    } else if (typeof value === "undefined") {
        numericValue = 0;
    } else {
        numericValue = value;
    }

    return numericValue;
};
