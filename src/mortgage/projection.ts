import {
  CURRENT_STATE_PROJECTION_DEAL_ID,
  getCurrentDeal,
  getDraftDeals,
  getProjectionDeals,
  getPublishedDeals,
} from '@/mortgage/tracker';
import { LoanDeal, LoanGroup, MortgageEvent } from '@/types/SavedLoan';
import { monthsBetween as sharedMonthsBetween } from '@/utils/date';

export interface MortgageProjectionPoint {
  itemNo: number;
  date: string;
  dealId: string;
  dealName: string;
  openingBalance: number;
  scheduledPayment: number;
  regularOverpayment: number;
  lumpOverpayment: number;
  totalPayment: number;
  principal: number;
  interest: number;
  closingBalance: number;
  isProjected: boolean;
}

export interface MortgageProjectionDealSegment {
  dealId: string;
  dealName: string;
  status: LoanDeal['status'];
  startDate: string;
  endDate: string;
  pointStart: number;
  pointEnd: number;
  pointCount: number;
  projectedPointCount: number;
  openingBalance: number;
  closingBalance: number;
  isCurrent: boolean;
}

export interface MortgageProjection {
  points: MortgageProjectionPoint[];
  tableItems: Array<{
    itemNo: number;
    date: string;
    dealId: string;
    dealName: string;
    dealStatus: LoanDeal['status'];
    isProjected: boolean;
    remaining: string;
    principal: string;
    interest: string;
    ending: string;
  }>;
  loanChartMonthlyArray: number[];
  loanChartInterestArray: number[];
  loanChartRemainingArray: number[];
  // Cumulative lump overpayments applied, parallel to the other chart arrays. Lets the
  // repayment chart break overpayments out of the principal so a single year's lump
  // doesn't read as a mystery spike.
  loanChartLumpArray: number[];
  loanChartLabelArray: string[];
  openingBalance: number;
  currentBalance: number;
  closingBalance: number;
  totalAmountPaid: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  additionalBorrowingTotal: number;
  overpaymentSavingsEstimate: number;
  projectedEndDate?: string;
  currentDealEndDate?: string;
  publishedDealCount: number;
  draftDealCount: number;
  dealSegments: MortgageProjectionDealSegment[];
}

const toMoney = (value: number): number => +Math.max(0, value).toFixed(2);

const parseDate = (dateString: string): Date => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    // eslint-disable-next-line no-console
    console.warn('[mortgage.projection] invalid date encountered, using today:', dateString);
    return new Date();
  }
  return date;
};

const monthStart = (dateString: string): Date => {
  const date = parseDate(dateString);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const dateToIso = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const monthKey = (dateString: string): string => dateString.slice(0, 7);

const addMonths = (date: Date, months: number): Date => (
  new Date(date.getFullYear(), date.getMonth() + months, 1)
);

const addMonthsIso = (dateString: string, months: number): string => (
  dateToIso(addMonths(monthStart(dateString), months))
);

const monthsBetween = (startDate: string, endDate: string): number => (
  sharedMonthsBetween(startDate, endDate)
);

const getDealEvents = (events: MortgageEvent[], dealId: string): MortgageEvent[] => (
  events
    .filter(event => event.dealId === dealId)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
);

const getDealProjectionMonths = (deal: LoanDeal): number => {
  if (deal.status === 'completed' && deal.completion) {
    return monthsBetween(deal.startDate, deal.completion.completedAt);
  }

  const remainingTermMonths = (deal.remainingTermInYears * 12) + deal.remainingTermInMonths;
  const dealTermMonths = monthsBetween(deal.startDate, deal.endDate);

  return Math.max(remainingTermMonths, dealTermMonths, 1);
};

const buildEmptyProjection = (loan: LoanGroup): MortgageProjection => {
  const openingBalance = loan.formSnapshot.loanAmount;

  return {
    points: [],
    tableItems: [],
    loanChartMonthlyArray: [0],
    loanChartInterestArray: [0],
    loanChartRemainingArray: [openingBalance],
    loanChartLumpArray: [0],
    loanChartLabelArray: [],
    openingBalance,
    currentBalance: openingBalance,
    closingBalance: openingBalance,
    totalAmountPaid: 0,
    totalInterestPaid: 0,
    totalPrincipalPaid: 0,
    overpaymentSavingsEstimate: 0,
    additionalBorrowingTotal: 0,
    currentDealEndDate: getCurrentDeal(loan)?.endDate,
    publishedDealCount: 0,
    draftDealCount: getDraftDeals(loan).length,
    dealSegments: [],
  };
};

const buildProjection = (
  loan: LoanGroup,
  asOf: Date,
  includeOverpayments: boolean,
): Omit<MortgageProjection, 'overpaymentSavingsEstimate'> => {
  const publishedDeals = getPublishedDeals(loan);
  const deals = getProjectionDeals(loan);
  if (deals.length === 0) return buildEmptyProjection(loan);

  const openingBalance = deals[0].openingBalance;
  const asOfMonth = monthStart(dateToIso(asOf)).getTime();
  const asOfIso = dateToIso(asOf);
  const points: MortgageProjectionPoint[] = [];
  const loanChartMonthlyArray: number[] = [0];
  const loanChartInterestArray: number[] = [0];
  const loanChartRemainingArray: number[] = [openingBalance];
  const loanChartLumpArray: number[] = [0];
  const loanChartLabelArray: string[] = [];

  let runningPaid = 0;
  let runningInterest = 0;
  let runningLump = 0;
  let currentBalance = openingBalance;
  let currentBalanceCaptured = false;
  let closingBalance = openingBalance;
  let projectedEndDate: string | undefined;
  let additionalBorrowingTotal = 0;

  deals.forEach((deal, dealIndex) => {
    if (dealIndex > 0 && (deal.additionalBorrowing ?? 0) > 0) {
      additionalBorrowingTotal += deal.additionalBorrowing ?? 0;
    }
  });

  additionalBorrowingTotal = toMoney(additionalBorrowingTotal);

  deals.forEach(deal => {
    const dealEvents = getDealEvents(loan.events, deal.id);
    const monthlyRate = deal.interestRate / 100 / 12;
    const maxMonths = getDealProjectionMonths(deal);
    let balance = deal.openingBalance;
    let endedByPayoff = false;

    for (let month = 0; month < maxMonths && !endedByPayoff; month += 1) {
      const cursor = addMonths(monthStart(deal.startDate), month);
      const cursorIso = dateToIso(cursor);
      const key = monthKey(cursorIso);
      const eventsInMonth = dealEvents.filter(event => (
        monthKey(event.date) === key
        && (cursor.getTime() > asOfMonth || event.date <= asOfIso)
      ));
      const checkpoints = eventsInMonth
        .filter(event => event.type === 'balanceCheckpoint' && typeof event.balance === 'number');
      const checkpoint = checkpoints[checkpoints.length - 1];

      if (checkpoint?.balance !== undefined) {
        balance = checkpoint.balance;
      }

      const opening = balance;
      const interest = toMoney(opening * monthlyRate);
      const hasSkippedPayment = eventsInMonth.some(event => (
        event.type === 'missedPayment' || event.type === 'paymentHoliday'
      ));
      const scheduledPayment = hasSkippedPayment ? 0 : deal.monthlyPayment;
      const regularOverpayment = includeOverpayments && !hasSkippedPayment ? deal.regularOverpayment : 0;
      const lumpOverpayment = includeOverpayments
        ? eventsInMonth
          .filter(event => event.type === 'lumpOverpayment' && typeof event.amount === 'number')
          .reduce((sum, event) => sum + (event.amount ?? 0), 0)
        : 0;
      const requestedPayment = Math.max(0, scheduledPayment + regularOverpayment + lumpOverpayment);
      const maxPayment = Math.max(0, opening + interest);
      const totalPayment = toMoney(Math.min(requestedPayment, maxPayment));
      const closing = toMoney(opening + interest - totalPayment);
      const principal = toMoney(Math.max(0, opening - closing));
      const point: MortgageProjectionPoint = {
        itemNo: points.length + 1,
        date: cursorIso,
        dealId: deal.id,
        dealName: deal.name,
        openingBalance: toMoney(opening),
        scheduledPayment: toMoney(Math.min(scheduledPayment, totalPayment)),
        regularOverpayment: toMoney(Math.min(regularOverpayment, Math.max(totalPayment - scheduledPayment, 0))),
        lumpOverpayment: toMoney(Math.min(lumpOverpayment, Math.max(totalPayment - scheduledPayment - regularOverpayment, 0))),
        totalPayment,
        principal,
        interest,
        closingBalance: closing,
        isProjected: cursor.getTime() > asOfMonth,
      };

      points.push(point);
      runningPaid = toMoney(runningPaid + totalPayment);
      runningInterest = toMoney(runningInterest + interest);
      runningLump = toMoney(runningLump + point.lumpOverpayment);
      loanChartMonthlyArray.push(runningPaid);
      loanChartInterestArray.push(runningInterest);
      loanChartRemainingArray.push(closing);
      loanChartLumpArray.push(runningLump);
      loanChartLabelArray.push(String(point.itemNo));
      projectedEndDate = cursorIso;

      if (cursor.getTime() <= asOfMonth) {
        currentBalance = closing;
        currentBalanceCaptured = true;
      }

      balance = closing;
      closingBalance = closing;
      endedByPayoff = closing <= 0;
    }

    if (deal.status === 'completed' && deal.completion) {
      const bankClosingBalance = toMoney(deal.completion.closingBalance);
      const feesAdded = toMoney(deal.completion.feesAdded ?? 0);
      const dealPoints = points.filter(point => point.dealId === deal.id);
      const lastPoint = dealPoints[dealPoints.length - 1];

      if (lastPoint) {
        const principalAdjustment = Math.max(0, lastPoint.closingBalance - bankClosingBalance);
        // Fees rolled into the closing balance grow the balance without being paid yet —
        // they must not be attributed to interest paid.
        const balanceShortfall = Math.max(0, bankClosingBalance - lastPoint.closingBalance);
        const interestAdjustment = Math.max(0, balanceShortfall - feesAdded);

        lastPoint.principal = toMoney(lastPoint.principal + principalAdjustment);
        lastPoint.interest = toMoney(lastPoint.interest + interestAdjustment);
        lastPoint.closingBalance = bankClosingBalance;
        loanChartRemainingArray[loanChartRemainingArray.length - 1] = bankClosingBalance;
        runningInterest = toMoney(runningInterest + interestAdjustment);
        loanChartInterestArray[loanChartInterestArray.length - 1] = runningInterest;
      } else {
        points.push({
          itemNo: points.length + 1,
          date: deal.completion.completedAt,
          dealId: deal.id,
          dealName: deal.name,
          openingBalance: toMoney(deal.openingBalance),
          scheduledPayment: 0,
          regularOverpayment: 0,
          lumpOverpayment: 0,
          totalPayment: 0,
          principal: toMoney(Math.max(0, deal.openingBalance - bankClosingBalance)),
          interest: 0,
          closingBalance: bankClosingBalance,
          isProjected: parseDate(deal.completion.completedAt).getTime() > asOfMonth,
        });
        loanChartMonthlyArray.push(runningPaid);
        loanChartInterestArray.push(runningInterest);
        loanChartRemainingArray.push(bankClosingBalance);
        loanChartLumpArray.push(runningLump);
        loanChartLabelArray.push(String(points.length));
      }

      const completionMonth = monthStart(deal.completion.completedAt).getTime();
      if (completionMonth <= asOfMonth) {
        currentBalance = bankClosingBalance;
        currentBalanceCaptured = true;
      }
      closingBalance = bankClosingBalance;
      projectedEndDate = deal.completion.completedAt;
    }
  });

  if (!currentBalanceCaptured) currentBalance = openingBalance;

  const tableItems = points.map(point => {
    const deal = deals.find(item => item.id === point.dealId);

    return {
      itemNo: point.itemNo,
      date: point.date,
      dealId: point.dealId,
      dealName: point.dealName,
      dealStatus: deal?.status ?? 'active',
      isProjected: point.isProjected,
      remaining: point.openingBalance.toFixed(2),
      principal: point.principal.toFixed(2),
      interest: point.interest.toFixed(2),
      ending: point.closingBalance.toFixed(2),
    };
  });
  const currentDeal = getCurrentDeal(loan, asOf);
  const dealSegments: MortgageProjectionDealSegment[] = deals.map(deal => {
    const dealPoints = points.filter(point => point.dealId === deal.id);
    const firstPoint = dealPoints[0];
    const lastPoint = dealPoints[dealPoints.length - 1];

    return {
      dealId: deal.id,
      dealName: deal.name,
      status: deal.status,
      startDate: deal.startDate,
      endDate: deal.completion?.completedAt ?? deal.endDate,
      pointStart: firstPoint?.itemNo ?? 0,
      pointEnd: lastPoint?.itemNo ?? 0,
      pointCount: dealPoints.length,
      projectedPointCount: dealPoints.filter(point => point.isProjected).length,
      openingBalance: toMoney(firstPoint?.openingBalance ?? deal.openingBalance),
      closingBalance: toMoney(lastPoint?.closingBalance ?? deal.completion?.closingBalance ?? deal.openingBalance),
      isCurrent: currentDeal?.id === deal.id || (!currentDeal && deal.id === CURRENT_STATE_PROJECTION_DEAL_ID),
    };
  });

  return {
    points,
    tableItems,
    loanChartMonthlyArray,
    loanChartInterestArray,
    loanChartRemainingArray,
    loanChartLumpArray,
    loanChartLabelArray,
    openingBalance: toMoney(openingBalance),
    currentBalance: toMoney(currentBalance),
    closingBalance: toMoney(closingBalance),
    totalAmountPaid: toMoney(runningPaid),
    totalInterestPaid: toMoney(runningInterest),
    totalPrincipalPaid: toMoney(Math.max(0, openingBalance + additionalBorrowingTotal - currentBalance)),
    additionalBorrowingTotal,
    projectedEndDate,
    currentDealEndDate: currentDeal?.endDate,
    publishedDealCount: publishedDeals.length,
    draftDealCount: getDraftDeals(loan).length,
    dealSegments,
  };
};

export const buildMortgageProjection = (
  loan: LoanGroup,
  asOf = new Date(),
): MortgageProjection => {
  const projection = buildProjection(loan, asOf, true);
  const baselineProjection = buildProjection(loan, asOf, false);

  return {
    ...projection,
    overpaymentSavingsEstimate: toMoney(baselineProjection.totalInterestPaid - projection.totalInterestPaid),
  };
};

export const getProjectedDealEndDate = (deal: LoanDeal): string => (
  addMonthsIso(deal.startDate, getDealProjectionMonths(deal))
);
