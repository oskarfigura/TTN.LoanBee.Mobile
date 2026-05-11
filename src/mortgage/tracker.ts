import {
  LoanDeal,
  LoanGroup,
  MortgageEvent,
} from '@/types/SavedLoan';

export interface DealProjection {
  dealId: string;
  monthsProjected: number;
  balance: number;
  interestPaid: number;
  totalPaid: number;
  principalPaid: number;
}

export interface MortgageTrackerSummary {
  originalBalance: number;
  currentBalance: number;
  principalPaid: number;
  interestPaidEstimate: number;
  interestRemainingEstimate: number;
  overpaymentSavingsEstimate: number;
  balanceProgress: number;
  currentDeal?: LoanDeal;
  nextDraftDeal?: LoanDeal;
  recentEvents: MortgageEvent[];
}

export type TimelineWarningType =
  | 'gap'
  | 'overlap'
  | 'incompleteActiveDeal'
  | 'draftBlocked';

export interface TimelineWarning {
  type: TimelineWarningType;
  title: string;
  message: string;
  dealId?: string;
}

const toMoney = (value: number): number => +Math.max(0, value).toFixed(2);

const parseDate = (dateString: string): Date => {
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const monthKey = (dateString: string): string => dateString.slice(0, 7);

const monthStart = (dateString: string): Date => {
  const date = parseDate(dateString);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const addMonths = (date: Date, months: number): Date => (
  new Date(date.getFullYear(), date.getMonth() + months, 1)
);

const dateToIso = (date: Date): string => date.toISOString().split('T')[0];

const minIsoDate = (dates: string[]): string => (
  dates.sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime())[0]
);

const monthsBetween = (startDate: string, endDate: string): number => {
  const start = monthStart(startDate);
  const end = monthStart(endDate);
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
};

const orderDeals = (deals: LoanDeal[]): LoanDeal[] => (
  [...deals].sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime())
);

export const getChronologicalDeals = (loan: LoanGroup): LoanDeal[] => (
  orderDeals(loan.deals)
);

export const getLaterDeals = (loan: LoanGroup, dealId: string): LoanDeal[] => {
  const deals = getChronologicalDeals(loan);
  const dealIndex = deals.findIndex(deal => deal.id === dealId);

  return dealIndex === -1 ? [] : deals.slice(dealIndex + 1);
};

const getDealEvents = (events: MortgageEvent[], dealId: string): MortgageEvent[] => (
  events
    .filter(event => event.dealId === dealId)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
);

const getProjectionEndDate = (deal: LoanDeal, asOf: Date): string => {
  if (deal.status === 'completed' && deal.completion) return deal.completion.completedAt;
  return minIsoDate([dateToIso(asOf), deal.endDate]);
};

export const getPublishedDeals = (loan: LoanGroup): LoanDeal[] => (
  orderDeals(loan.deals.filter(deal => deal.status !== 'draft'))
);

export const getDraftDeals = (loan: LoanGroup): LoanDeal[] => (
  orderDeals(loan.deals.filter(deal => deal.status === 'draft'))
);

export const getCurrentDeal = (loan: LoanGroup, asOf = new Date()): LoanDeal | undefined => {
  const today = dateToIso(asOf);
  return getPublishedDeals(loan).find(deal => (
    deal.status === 'active'
    || (deal.startDate <= today && deal.endDate >= today && deal.status !== 'completed')
  ));
};

export const projectDeal = (
  deal: LoanDeal,
  events: MortgageEvent[],
  asOf = new Date(),
  includeOverpayments = true,
): DealProjection => {
  const dealEvents = getDealEvents(events, deal.id);
  const endDate = getProjectionEndDate(deal, asOf);
  const monthsToProject = monthsBetween(deal.startDate, endDate);
  const monthlyInterestRate = deal.interestRate / 100 / 12;

  let balance = deal.openingBalance;
  let interestPaid = 0;
  let totalPaid = 0;

  for (let month = 0; month < monthsToProject; month++) {
    const cursor = addMonths(monthStart(deal.startDate), month);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    const eventsInMonth = dealEvents.filter(event => monthKey(event.date) === key);
    const hasSkippedPayment = eventsInMonth.some(event => (
      event.type === 'missedPayment' || event.type === 'paymentHoliday'
    ));

    eventsInMonth
      .filter(event => event.type === 'balanceCheckpoint' && typeof event.balance === 'number')
      .forEach(event => {
        balance = event.balance ?? balance;
      });

    const interest = balance * monthlyInterestRate;
    const scheduledPayment = hasSkippedPayment ? 0 : deal.monthlyPayment;
    const regularOverpayment = includeOverpayments && !hasSkippedPayment ? deal.regularOverpayment : 0;
    const interestCovered = Math.min(scheduledPayment, interest);

    balance = Math.max(0, balance + interest - scheduledPayment - regularOverpayment);
    interestPaid += interestCovered;
    totalPaid += scheduledPayment + regularOverpayment;

    if (includeOverpayments) {
      eventsInMonth
        .filter(event => event.type === 'lumpOverpayment' && typeof event.amount === 'number')
        .forEach(event => {
          const amount = event.amount ?? 0;
          balance = Math.max(0, balance - amount);
          totalPaid += amount;
        });
    }
  }

  if (deal.status === 'completed' && deal.completion) {
    const closingBalance = deal.completion.closingBalance;
    const principalPaid = Math.max(0, deal.openingBalance + deal.completion.feesAdded - closingBalance);
    interestPaid = Math.max(0, totalPaid - principalPaid);
    balance = closingBalance;
  }

  return {
    dealId: deal.id,
    monthsProjected: monthsToProject,
    balance: toMoney(balance),
    interestPaid: toMoney(interestPaid),
    totalPaid: toMoney(totalPaid),
    principalPaid: toMoney(deal.openingBalance - balance),
  };
};

export const recalculateLaterDealOpeningBalances = (
  loan: LoanGroup,
  dealId: string,
): LoanGroup => {
  const deals = getChronologicalDeals(loan);
  const dealIndex = deals.findIndex(deal => deal.id === dealId);
  if (dealIndex === -1 || dealIndex === deals.length - 1) return loan;

  const updatedAt = new Date().toISOString();
  const recalculatedById = new Map<string, LoanDeal>();
  let previousDeal = deals[dealIndex];

  deals.slice(dealIndex + 1).forEach(deal => {
    const projectionDate = parseDate(previousDeal.completion?.completedAt ?? previousDeal.endDate);
    const projectedPrevious = projectDeal(previousDeal, loan.events, projectionDate, true);
    const openingBalance = projectedPrevious.balance;
    const nextDeal = deal.openingBalance === openingBalance
      ? deal
      : {
        ...deal,
        openingBalance,
        updatedAt,
      };

    recalculatedById.set(deal.id, nextDeal);
    previousDeal = nextDeal;
  });

  return {
    ...loan,
    deals: loan.deals.map(deal => recalculatedById.get(deal.id) ?? deal),
  };
};

export const removeDealAndRecalculateLater = (
  loan: LoanGroup,
  dealId: string,
): LoanGroup => {
  const deals = getChronologicalDeals(loan);
  const dealIndex = deals.findIndex(deal => deal.id === dealId);
  if (dealIndex === -1) return loan;

  const previousDeal = dealIndex > 0 ? deals[dealIndex - 1] : undefined;
  const nextLoan = {
    ...loan,
    deals: loan.deals.filter(deal => deal.id !== dealId),
    events: loan.events.filter(event => event.dealId !== dealId),
  };

  return previousDeal
    ? recalculateLaterDealOpeningBalances(nextLoan, previousDeal.id)
    : nextLoan;
};

export const getMortgageTrackerSummary = (
  loan: LoanGroup,
  asOf = new Date(),
): MortgageTrackerSummary => {
  const publishedDeals = getPublishedDeals(loan);
  const draftDeals = getDraftDeals(loan);
  const originalBalance = publishedDeals[0]?.openingBalance ?? loan.formSnapshot.loanAmount;
  const projections = publishedDeals.map(deal => projectDeal(deal, loan.events, asOf, true));
  const baselineProjections = publishedDeals.map(deal => projectDeal(deal, loan.events, asOf, false));
  const lastProjection = projections[projections.length - 1];
  const currentBalance = lastProjection?.balance ?? originalBalance;
  const interestPaidEstimate = projections.reduce((sum, projection) => sum + projection.interestPaid, 0);
  const baselineInterestEstimate = baselineProjections.reduce((sum, projection) => sum + projection.interestPaid, 0);
  const currentDeal = getCurrentDeal(loan, asOf) ?? publishedDeals[publishedDeals.length - 1];
  const interestRemainingEstimate = currentDeal
    ? projectDeal(
      {
        ...currentDeal,
        id: `${currentDeal.id}-remaining`,
        startDate: dateToIso(asOf),
        openingBalance: currentBalance,
        status: 'active',
        completion: undefined,
      },
      [],
      parseDate(currentDeal.endDate),
      true,
    ).interestPaid
    : 0;

  return {
    originalBalance: toMoney(originalBalance),
    currentBalance: toMoney(currentBalance),
    principalPaid: toMoney(originalBalance - currentBalance),
    interestPaidEstimate: toMoney(interestPaidEstimate),
    interestRemainingEstimate: toMoney(interestRemainingEstimate),
    overpaymentSavingsEstimate: toMoney(baselineInterestEstimate - interestPaidEstimate),
    balanceProgress: originalBalance > 0 ? Math.min(Math.max((originalBalance - currentBalance) / originalBalance, 0), 1) : 0,
    currentDeal,
    nextDraftDeal: draftDeals[0],
    recentEvents: [...loan.events]
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
      .slice(0, 3),
  };
};

export const getTimelineWarnings = (loan: LoanGroup, asOf = new Date()): TimelineWarning[] => {
  const warnings: TimelineWarning[] = [];
  const publishedDeals = getPublishedDeals(loan);

  publishedDeals.forEach((deal, index) => {
    const next = publishedDeals[index + 1];
    if (!next) return;

    const end = parseDate(deal.endDate).getTime();
    const start = parseDate(next.startDate).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (start > end + oneDay) {
      warnings.push({
        type: 'gap',
        title: 'Date gap detected',
        message: 'There is a gap between one deal ending and the next deal starting.',
        dealId: next.id,
      });
    }

    if (start < end) {
      warnings.push({
        type: 'overlap',
        title: 'Deal dates overlap',
        message: 'Two mortgage deals overlap. Adjust the start or end dates before publishing.',
        dealId: next.id,
      });
    }
  });

  const currentDeal = getCurrentDeal(loan, asOf);
  if (currentDeal && currentDeal.endDate < dateToIso(asOf) && !currentDeal.completion) {
    warnings.push({
      type: 'incompleteActiveDeal',
      title: 'Complete current deal',
      message: 'Enter your bank-confirmed closing balance before starting the next deal.',
      dealId: currentDeal.id,
    });
  }

  const draftDeal = getDraftDeals(loan)[0];
  if (draftDeal && currentDeal && !currentDeal.completion) {
    warnings.push({
      type: 'draftBlocked',
      title: 'Draft deal is inactive',
      message: 'Complete the current deal with lender figures before this draft can become active.',
      dealId: draftDeal.id,
    });
  }

  return warnings;
};

export const canActivateDeal = (loan: LoanGroup, dealId: string): boolean => {
  const target = loan.deals.find(deal => deal.id === dealId);
  if (!target || target.status !== 'draft') return false;

  const deals = getChronologicalDeals(loan);
  const targetIndex = deals.findIndex(deal => deal.id === target.id);
  const previousDeal = targetIndex > 0 ? deals[targetIndex - 1] : undefined;

  return !previousDeal || previousDeal.status === 'completed';
};
