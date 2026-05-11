import {
  LoanDeal,
  LoanGroup,
  MortgageEvent,
} from '@/types/SavedLoan';
import { calculateMonthlyPayments } from '@/core/amortisation';

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

const dateToLocalIso = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const minIsoDate = (dates: string[]): string => (
  dates.sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime())[0]
);

const monthsBetween = (startDate: string, endDate: string): number => {
  const start = monthStart(startDate);
  const end = monthStart(endDate);
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
};

const addDaysIso = (dateString: string, days: number): string => {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return dateToLocalIso(date);
};

const addMonthsIso = (dateString: string, months: number): string => {
  const date = parseDate(dateString);
  date.setMonth(date.getMonth() + months);
  return dateToLocalIso(date);
};

const splitMonths = (totalMonths: number) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});

const getOverallTermInMonths = (loan: Pick<LoanGroup, 'mortgageTermInMonths' | 'formSnapshot' | 'resultSnapshot'>): number => (
  loan.mortgageTermInMonths
  || loan.resultSnapshot.totalTermInMonths
  || (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths
  || 12
);

const getPlural = (value: number, singular: string, plural: string): string => (
  value === 1 ? singular : plural
);

const getPolishYearUnit = (years: number): string => {
  if (years === 1) return 'rok';
  if ([2, 3, 4].includes(years % 10) && ![12, 13, 14].includes(years % 100)) return 'lata';
  return 'lat';
};

const getPolishMonthUnit = (months: number): string => {
  if (months === 1) return 'miesiac';
  if ([2, 3, 4].includes(months % 10) && ![12, 13, 14].includes(months % 100)) return 'miesiace';
  return 'miesiecy';
};

const orderDeals = (deals: LoanDeal[]): LoanDeal[] => (
  [...deals].sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime())
);

export const getChronologicalDeals = (loan: LoanGroup): LoanDeal[] => (
  orderDeals(loan.deals)
);

export const getEffectiveDealEndDate = (deal: LoanDeal): string => (
  deal.completion?.completedAt ?? deal.endDate
);

export const getNextDealStartDate = (previousDeal?: LoanDeal, fallbackStartDate?: string): string => (
  previousDeal ? addDaysIso(getEffectiveDealEndDate(previousDeal), 1) : fallbackStartDate ?? dateToIso(new Date())
);

export const getDealDurationInMonths = (deal: LoanDeal): number => (
  Math.max(0, monthsBetween(deal.startDate, getEffectiveDealEndDate(deal)))
);

export const getMortgageTermInMonths = getOverallTermInMonths;

export const getRemainingMortgageTermInMonths = (
  loan: Pick<LoanGroup, 'mortgageTermInMonths' | 'formSnapshot' | 'resultSnapshot'>,
  dealStartDate: string,
): number => (
  Math.max(getOverallTermInMonths(loan) - monthsBetween(loan.formSnapshot.startDate, dealStartDate), 1)
);

export const formatDealDuration = (dealOrMonths: LoanDeal | number, locale?: string): string => {
  const totalMonths = typeof dealOrMonths === 'number'
    ? Math.max(0, dealOrMonths)
    : getDealDurationInMonths(dealOrMonths);
  const polish = locale?.startsWith('pl');

  if (totalMonths === 0) return polish ? '0 miesiecy' : '0 months';

  const { years, months } = splitMonths(totalMonths);

  if (years === 0) {
    return polish
      ? `${months} ${getPolishMonthUnit(months)}`
      : `${months} ${getPlural(months, 'month', 'months')}`;
  }

  if (months === 0) {
    return polish
      ? `${years} ${getPolishYearUnit(years)}`
      : `${years} ${getPlural(years, 'year', 'years')}`;
  }

  if (months === 6 && years >= 2) {
    return polish ? `${years},5 roku` : `${years}.5 years`;
  }

  if (years === 1 && months === 6) {
    return polish ? `18 ${getPolishMonthUnit(18)}` : '18 months';
  }

  return polish
    ? `${years} ${getPolishYearUnit(years)} ${months} ${getPolishMonthUnit(months)}`
    : `${years} ${getPlural(years, 'year', 'years')} ${months} ${getPlural(months, 'month', 'months')}`;
};

export const getSingleDraftDeal = (loan: LoanGroup): LoanDeal | undefined => (
  getDraftDeals(loan)[0]
);

export const getLatestDeal = (loan: LoanGroup): LoanDeal | undefined => {
  const deals = getChronologicalDeals(loan);
  return deals[deals.length - 1];
};

export const canDeleteDeal = (loan: LoanGroup, dealId: string): boolean => {
  const deals = getChronologicalDeals(loan);
  if (deals.length <= 1) return false;

  return deals[deals.length - 1]?.id === dealId;
};

const getEffectiveOpeningBalance = (loan: LoanGroup): number => {
  const form = loan.formSnapshot;
  const downPayment = form.downPaymentType === 'PERCENT'
    ? (form.downPayment / 100) * form.loanAmount
    : form.downPayment;

  return Math.max(0, form.loanAmount - downPayment);
};

export const calculateDealMonthlyPayment = (
  openingBalance: number,
  interestRate: number,
  remainingTermMonths: number,
  repaymentType: LoanDeal['repaymentType'],
): number => {
  if (openingBalance <= 0 || interestRate <= 0 || remainingTermMonths <= 0) return 0;
  if (repaymentType === 'interestOnly') return toMoney(openingBalance * (interestRate / 100 / 12));

  const { years, months } = splitMonths(remainingTermMonths);
  return toMoney(calculateMonthlyPayments(interestRate / 100 / 12, years, months, openingBalance));
};

export const buildNextDealDraft = (
  loan: LoanGroup,
  id: string,
  now = new Date().toISOString(),
): LoanDeal => {
  const existingDraft = getSingleDraftDeal(loan);
  if (existingDraft) return existingDraft;

  const deals = getChronologicalDeals(loan);
  const previousDeal = deals[deals.length - 1];

  if (!previousDeal) {
    const totalMonths = getOverallTermInMonths(loan);
    const startDate = loan.formSnapshot.startDate;
    const { years, months } = splitMonths(totalMonths);

    return {
      id,
      createdAt: now,
      updatedAt: now,
      name: loan.category === 'mortgage' ? 'Initial deal' : 'Fixed loan',
      lender: loan.lender,
      status: 'draft',
      startDate,
      endDate: addMonthsIso(startDate, totalMonths),
      openingBalance: getEffectiveOpeningBalance(loan),
      interestRate: loan.formSnapshot.interest,
      repaymentType: 'repayment',
      monthlyPayment: loan.resultSnapshot.monthlyPayments,
      regularOverpayment: loan.formSnapshot.additionalMonthlyPayment ?? 0,
      remainingTermInYears: years,
      remainingTermInMonths: months,
    };
  }

  const previousEndDate = getEffectiveDealEndDate(previousDeal);
  const startDate = getNextDealStartDate(previousDeal, loan.formSnapshot.startDate);
  const projectedPrevious = projectDeal(previousDeal, loan.events, parseDate(previousEndDate), true);
  const remainingTermMonths = getRemainingMortgageTermInMonths(loan, startDate);
  const { years, months } = splitMonths(remainingTermMonths);
  const defaultDealDurationMonths = Math.max(1, Math.min(60, remainingTermMonths));

  return {
    id,
    createdAt: now,
    updatedAt: now,
    name: defaultDealDurationMonths === 60 ? '5-year Fixed' : 'Next deal',
    lender: previousDeal.lender ?? loan.lender,
    status: 'draft',
    startDate,
    endDate: addMonthsIso(startDate, defaultDealDurationMonths),
    openingBalance: projectedPrevious.balance,
    interestRate: previousDeal.interestRate || loan.formSnapshot.interest,
    repaymentType: previousDeal.repaymentType,
    monthlyPayment: calculateDealMonthlyPayment(
      projectedPrevious.balance,
      previousDeal.interestRate || loan.formSnapshot.interest,
      remainingTermMonths,
      previousDeal.repaymentType,
    ),
    regularOverpayment: previousDeal.regularOverpayment,
    remainingTermInYears: years,
    remainingTermInMonths: months,
  };
};

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

export const normaliseDealChain = (loan: LoanGroup, fromDealId?: string): LoanGroup => {
  const deals = getChronologicalDeals(loan);
  if (deals.length < 2) return loan;

  const fromIndex = fromDealId
    ? deals.findIndex(deal => deal.id === fromDealId)
    : 0;
  const normaliseFromIndex = Math.max(fromIndex, 0);
  const updatedAt = new Date().toISOString();
  const normalisedById = new Map<string, LoanDeal>();

  let previousDeal = deals[0];
  for (let index = 1; index < deals.length; index += 1) {
    const deal = deals[index];
    if (index <= normaliseFromIndex) {
      previousDeal = normalisedById.get(deal.id) ?? deal;
      continue;
    }

    const nextStartDate = getNextDealStartDate(previousDeal, loan.formSnapshot.startDate);
    const durationMonths = Math.max(getDealDurationInMonths(deal), 1);
    const projectionDate = parseDate(getEffectiveDealEndDate(previousDeal));
    const projectedPrevious = projectDeal(previousDeal, loan.events, projectionDate, true);
    const openingBalance = projectedPrevious.balance;
    const shouldRebaseDates = deal.status !== 'completed';
    const nextDeal: LoanDeal = {
      ...deal,
      startDate: shouldRebaseDates ? nextStartDate : deal.startDate,
      endDate: shouldRebaseDates ? addMonthsIso(nextStartDate, durationMonths) : deal.endDate,
      openingBalance,
      updatedAt,
    };

    normalisedById.set(deal.id, nextDeal);
    previousDeal = nextDeal;
  }

  if (normalisedById.size === 0) return loan;

  return {
    ...loan,
    deals: loan.deals.map(deal => normalisedById.get(deal.id) ?? deal),
  };
};

export const recalculateLaterDealOpeningBalances = (
  loan: LoanGroup,
  dealId: string,
): LoanGroup => {
  return normaliseDealChain(loan, dealId);
};

export const removeDealAndRecalculateLater = (
  loan: LoanGroup,
  dealId: string,
): LoanGroup => {
  if (!canDeleteDeal(loan, dealId)) return loan;

  return {
    ...loan,
    deals: loan.deals.filter(deal => deal.id !== dealId),
    events: loan.events.filter(event => event.dealId !== dealId),
  };
};

export const removeLatestDealAndEvents = removeDealAndRecalculateLater;

export const getLaterDealIds = (loan: LoanGroup, dealId: string): string[] => (
  getLaterDeals(loan, dealId).map(deal => deal.id)
);

export const removeLaterDealsAndEvents = (
  loan: LoanGroup,
  dealId: string,
): LoanGroup => {
  const laterDealIds = new Set(getLaterDealIds(loan, dealId));
  if (laterDealIds.size === 0) return loan;

  return {
    ...loan,
    deals: loan.deals.filter(deal => !laterDealIds.has(deal.id)),
    events: loan.events.filter(event => !laterDealIds.has(event.dealId)),
  };
};

export const getMortgageTrackerSummary = (
  loan: LoanGroup,
  asOf = new Date(),
): MortgageTrackerSummary => {
  const publishedDeals = getPublishedDeals(loan);
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
    nextDraftDeal: getSingleDraftDeal(loan),
    recentEvents: [...loan.events]
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()),
  };
};

export const getTimelineWarnings = (loan: LoanGroup, asOf = new Date()): TimelineWarning[] => {
  const warnings: TimelineWarning[] = [];
  const publishedDeals = getPublishedDeals(loan);

  publishedDeals.forEach((deal, index) => {
    const next = publishedDeals[index + 1];
    if (!next) return;

    const expectedStartDate = getNextDealStartDate(deal);
    const expectedStart = parseDate(expectedStartDate).getTime();
    const start = parseDate(next.startDate).getTime();

    if (start > expectedStart) {
      warnings.push({
        type: 'gap',
        title: 'Date gap detected',
        message: 'There is a gap between one deal ending and the next deal starting.',
        dealId: next.id,
      });
    }

    if (start < expectedStart) {
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

  const draftDeal = getSingleDraftDeal(loan);
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
