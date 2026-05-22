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

export const CURRENT_STATE_PROJECTION_DEAL_ID = 'current-state-projection';

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

const dateToIso = (date: Date): string => {
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
  return dateToIso(date);
};

const addMonthsIso = (dateString: string, months: number): string => {
  const date = parseDate(dateString);
  date.setMonth(date.getMonth() + months);
  return dateToIso(date);
};

const splitMonths = (totalMonths: number) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});

const repaymentTypeLabel = (repaymentType: LoanDeal['repaymentType']): string => (
  repaymentType === 'interestOnly' ? 'Interest Only' : 'Fixed'
);

export const generateDefaultDealName = (
  years: number,
  months: number,
  repaymentType: LoanDeal['repaymentType'],
): string => {
  const typeLabel = repaymentTypeLabel(repaymentType);
  const totalMonths = Math.max(0, Math.round(years) * 12 + Math.round(months));
  if (totalMonths === 0) return `${typeLabel} deal`;
  const wholeYears = Math.floor(totalMonths / 12);
  const remainderMonths = totalMonths % 12;
  if (wholeYears === 0) return `${remainderMonths}-month ${typeLabel}`;
  if (remainderMonths === 0) return `${wholeYears}-year ${typeLabel}`;
  return `${wholeYears}y ${remainderMonths}m ${typeLabel}`;
};

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

export const isEstimateBackedDeal = (loan: LoanGroup, deal: LoanDeal): boolean => {
  if (loan.category !== 'mortgage') return false;
  if (deal.source === 'estimate') return true;
  if (deal.source === 'userDeal') return false;

  const publishedDeals = getChronologicalDeals(loan).filter(item => item.status !== 'draft');
  if (publishedDeals.length !== 1 || publishedDeals[0]?.id !== deal.id) return false;

  const totalMonths = getOverallTermInMonths(loan);
  return (
    deal.status === 'active'
    && deal.startDate === loan.formSnapshot.startDate
    && getDealDurationInMonths(deal) >= totalMonths
  );
};

export const getEstimateBackedDeal = (loan: LoanGroup): LoanDeal | undefined => (
  getChronologicalDeals(loan).find(deal => isEstimateBackedDeal(loan, deal))
);

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

export const canEditDeal = (loan: LoanGroup, dealId: string): boolean => (
  getLatestDeal(loan)?.id === dealId
);

export const canDeleteDeal = (loan: LoanGroup, dealId: string): boolean => {
  const deals = getChronologicalDeals(loan);
  if (deals.length <= 1) return false;
  if (deals[0]?.id === dealId) return false;

  return deals[deals.length - 1]?.id === dealId;
};

const getEffectiveOpeningBalance = (loan: LoanGroup): number => {
  const form = loan.formSnapshot;
  const downPayment = form.downPaymentType === 'PERCENT'
    ? (form.downPayment / 100) * form.loanAmount
    : form.downPayment;

  return Math.max(0, form.loanAmount - downPayment);
};

export const buildCurrentStateProjectionDeal = (loan: LoanGroup): LoanDeal => {
  const totalMonths = getOverallTermInMonths(loan);
  const { years, months } = splitMonths(totalMonths);

  return {
    id: CURRENT_STATE_PROJECTION_DEAL_ID,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
    name: loan.nickname,
    lender: loan.lender,
    status: 'active',
    startDate: loan.formSnapshot.startDate,
    endDate: addMonthsIso(loan.formSnapshot.startDate, totalMonths),
    openingBalance: getEffectiveOpeningBalance(loan),
    interestRate: loan.formSnapshot.interest,
    repaymentType: 'repayment',
    monthlyPayment: loan.resultSnapshot.monthlyPayments,
    regularOverpayment: loan.formSnapshot.additionalMonthlyPayment ?? 0,
    remainingTermInYears: years,
    remainingTermInMonths: months,
    source: 'estimate',
  };
};

export const getProjectionDeals = (loan: LoanGroup): LoanDeal[] => {
  const publishedDeals = getPublishedDeals(loan);
  return publishedDeals.length > 0 ? publishedDeals : [buildCurrentStateProjectionDeal(loan)];
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

  const deals = getChronologicalDeals(loan).filter(deal => !isEstimateBackedDeal(loan, deal));
  const previousDeal = deals[deals.length - 1];

  if (!previousDeal) {
    const totalMonths = getOverallTermInMonths(loan);
    const defaultDealDurationMonths = Math.max(1, Math.min(60, totalMonths));
    const startDate = loan.formSnapshot.startDate;
    const { years, months } = splitMonths(totalMonths);
    const { years: defaultDurationYears, months: defaultDurationMonths } = splitMonths(defaultDealDurationMonths);

    return {
      id,
      createdAt: now,
      updatedAt: now,
      name: loan.category === 'mortgage'
        ? generateDefaultDealName(defaultDurationYears, defaultDurationMonths, 'repayment')
        : 'Fixed loan',
      lender: loan.lender,
      status: 'draft',
      startDate,
      endDate: addMonthsIso(startDate, defaultDealDurationMonths),
      openingBalance: getEffectiveOpeningBalance(loan),
      interestRate: loan.formSnapshot.interest,
      repaymentType: 'repayment',
      monthlyPayment: loan.resultSnapshot.monthlyPayments,
      regularOverpayment: loan.formSnapshot.additionalMonthlyPayment ?? 0,
      additionalBorrowing: 0,
      remainingTermInYears: years,
      remainingTermInMonths: months,
      source: 'userDeal',
    };
  }

  const previousEndDate = getEffectiveDealEndDate(previousDeal);
  const startDate = getNextDealStartDate(previousDeal, loan.formSnapshot.startDate);
  const projectedPrevious = projectDeal(previousDeal, loan.events, parseDate(previousEndDate), true);
  const remainingTermMonths = getRemainingMortgageTermInMonths(loan, startDate);
  const { years, months } = splitMonths(remainingTermMonths);
  const defaultDealDurationMonths = Math.max(1, Math.min(60, remainingTermMonths));
  const { years: defaultDurationYears, months: defaultDurationMonths } = splitMonths(defaultDealDurationMonths);

  return {
    id,
    createdAt: now,
    updatedAt: now,
    name: generateDefaultDealName(defaultDurationYears, defaultDurationMonths, previousDeal.repaymentType),
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
    additionalBorrowing: 0,
    remainingTermInYears: years,
    remainingTermInMonths: months,
    source: 'userDeal',
  };
};

export const canEditInitialDeal = (loan: LoanGroup): boolean => (
  loan.deals.length <= 1
);

export const withMortgageTermInMonths = (loan: LoanGroup, totalMonths: number): LoanGroup => {
  const sanitised = Math.max(1, Math.round(totalMonths));
  if (sanitised === loan.mortgageTermInMonths) return loan;

  return {
    ...loan,
    mortgageTermInMonths: sanitised,
    updatedAt: new Date().toISOString(),
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
  orderDeals(loan.deals.filter(deal => (
    deal.status !== 'draft'
    && !isEstimateBackedDeal(loan, deal)
  )))
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
  const asOfIso = dateToIso(asOf);
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

      balance = Math.max(0, balance + interest - scheduledPayment - regularOverpayment);
      interestPaid += interest;
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

  // Apply lump-sum events in the current partial month (the period after the last
  // complete-month projection). This handles the case where asOf is mid-month or
  // the deal started in the same calendar month as asOf (monthsToProject = 0).
  if (includeOverpayments) {
    const partialMonthCursor = addMonths(monthStart(deal.startDate), monthsToProject);
    const partialKey = `${partialMonthCursor.getFullYear()}-${String(partialMonthCursor.getMonth() + 1).padStart(2, '0')}`;
    dealEvents
      .filter(e => (
        e.type === 'lumpOverpayment'
        && typeof e.amount === 'number'
        && monthKey(e.date) === partialKey
        && e.date >= deal.startDate
        && e.date <= asOfIso
      ))
      .forEach(e => {
        const amount = e.amount ?? 0;
        balance = Math.max(0, balance - amount);
        totalPaid += amount;
      });
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

export interface DealOverpaymentImpact {
  interestSaved: number;
  extraPrincipalRepaid: number;
  totalOverpayments: number;
  hasOverpayments: boolean;
}

export const getDealOverpaymentImpact = (
  deal: LoanDeal,
  events: MortgageEvent[],
): DealOverpaymentImpact => {
  // For completed deals, the completion block in projectDeal overrides interestPaid via
  // bank-confirmed reconciliation, which breaks like-for-like comparison. Strip the
  // completion on both runs and clamp duration to the completion date so the impact
  // comparison reflects scheduled vs overpayment behaviour at the model level.
  const dealForImpact: LoanDeal = deal.status === 'completed' && deal.completion
    ? { ...deal, status: 'active', endDate: deal.completion.completedAt, completion: undefined }
    : deal;

  // Project to deal end so impact is visible even for new deals — matches how
  // the loan calculator shows full-term savings rather than "so far" savings.
  const projectionEnd = parseDate(dealForImpact.endDate);
  const actual = projectDeal(dealForImpact, events, projectionEnd, true);
  const baseline = projectDeal(dealForImpact, events, projectionEnd, false);

  const dealEvents = events.filter(event => event.dealId === deal.id);
  const lumpOverpaymentTotal = dealEvents
    .filter(event => event.type === 'lumpOverpayment')
    .reduce((sum, event) => sum + (event.amount ?? 0), 0);
  // projectDeal skips regularOverpayment for any month with a missedPayment or
  // paymentHoliday event, so the regular total must reflect the same exclusion.
  const skippedMonthKeys = new Set(
    dealEvents
      .filter(event => event.type === 'missedPayment' || event.type === 'paymentHoliday')
      .map(event => event.date.slice(0, 7)),
  );
  const effectiveRegularMonths = Math.max(0, actual.monthsProjected - skippedMonthKeys.size);
  const regularOverpaymentTotal = deal.regularOverpayment > 0
    ? deal.regularOverpayment * effectiveRegularMonths
    : 0;
  const totalOverpayments = toMoney(lumpOverpaymentTotal + regularOverpaymentTotal);

  return {
    interestSaved: toMoney(Math.max(0, baseline.interestPaid - actual.interestPaid)),
    extraPrincipalRepaid: toMoney(Math.max(0, baseline.balance - actual.balance)),
    totalOverpayments,
    hasOverpayments: totalOverpayments > 0,
  };
};

export const buildDealBalanceArrays = (
  deal: LoanDeal,
  events: MortgageEvent[],
): { baseline: number[]; scenario: number[] } => {
  const dealForChart: LoanDeal = deal.status === 'completed' && deal.completion
    ? { ...deal, status: 'active', endDate: deal.completion.completedAt, completion: undefined }
    : deal;

  const dealEvents = getDealEvents(events, dealForChart.id);
  const monthsToProject = monthsBetween(dealForChart.startDate, dealForChart.endDate);
  const monthlyInterestRate = dealForChart.interestRate / 100 / 12;

  const buildArray = (includeOverpayments: boolean): number[] => {
    let balance = dealForChart.openingBalance;
    const arr: number[] = [];

    for (let month = 0; month < monthsToProject; month++) {
      const cursor = addMonths(monthStart(dealForChart.startDate), month);
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const eventsInMonth = dealEvents.filter(event => monthKey(event.date) === key);
      const hasSkippedPayment = eventsInMonth.some(event => (
        event.type === 'missedPayment' || event.type === 'paymentHoliday'
      ));

      eventsInMonth
        .filter(event => event.type === 'balanceCheckpoint' && typeof event.balance === 'number')
        .forEach(event => { balance = event.balance ?? balance; });

      const interest = balance * monthlyInterestRate;
      const scheduledPayment = hasSkippedPayment ? 0 : dealForChart.monthlyPayment;
      const regularOverpayment = includeOverpayments && !hasSkippedPayment ? dealForChart.regularOverpayment : 0;

      balance = Math.max(0, balance + interest - scheduledPayment - regularOverpayment);

      if (includeOverpayments) {
        eventsInMonth
          .filter(event => event.type === 'lumpOverpayment' && typeof event.amount === 'number')
          .forEach(event => { balance = Math.max(0, balance - (event.amount ?? 0)); });
      }

      arr.push(toMoney(balance));
    }

    return arr;
  };

  return { baseline: buildArray(false), scenario: buildArray(true) };
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
    const openingBalance = toMoney(projectedPrevious.balance + (deal.additionalBorrowing ?? 0));
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
    events: loan.events.filter(event => !laterDealIds.has(event.dealId ?? '')),
  };
};

export const getMortgageTrackerSummary = (
  loan: LoanGroup,
  asOf = new Date(),
): MortgageTrackerSummary => {
  const todayIso = dateToIso(asOf);
  const publishedDeals = getPublishedDeals(loan);
  const projectionDeals = publishedDeals.length > 0 ? publishedDeals : [buildCurrentStateProjectionDeal(loan)];
  const originalBalance = projectionDeals[0]?.openingBalance ?? getEffectiveOpeningBalance(loan);
  const originatedDeals = publishedDeals.filter(deal => deal.startDate <= todayIso);
  const additionalBorrowingTotal = originatedDeals
    .slice(1)
    .reduce((sum, deal) => sum + Math.max(0, deal.additionalBorrowing ?? 0), 0);
  // When no published deals exist we project via buildCurrentStateProjectionDeal (id =
  // CURRENT_STATE_PROJECTION_DEAL_ID). getDealEvents filters by dealId, so loan-level
  // events (dealId = undefined) would be silently dropped. Remap them to the projection
  // deal's id so they are included.
  const eventsForProjection = publishedDeals.length > 0
    ? loan.events
    : loan.events.map(e => (!e.dealId ? { ...e, dealId: CURRENT_STATE_PROJECTION_DEAL_ID } : e));

  const projections = projectionDeals.map(deal => projectDeal(deal, eventsForProjection, asOf, true));
  const baselineProjections = projectionDeals.map(deal => projectDeal(deal, eventsForProjection, asOf, false));
  const interestPaidEstimate = projections.reduce((sum, projection) => sum + projection.interestPaid, 0);
  const baselineInterestEstimate = baselineProjections.reduce((sum, projection) => sum + projection.interestPaid, 0);
  const currentDeal = getCurrentDeal(loan, asOf) ?? publishedDeals[publishedDeals.length - 1];
  const currentProjectionDeal = currentDeal
    ?? originatedDeals[originatedDeals.length - 1]
    ?? projectionDeals[projectionDeals.length - 1];
  const currentBalance = projections.find(
    projection => projection.dealId === currentProjectionDeal?.id,
  )?.balance ?? originalBalance;
  const interestRemainingEstimate = currentProjectionDeal
    ? projectDeal(
      {
        ...currentProjectionDeal,
        id: `${currentProjectionDeal.id}-remaining`,
        startDate: dateToIso(asOf),
        openingBalance: currentBalance,
        status: 'active',
        completion: undefined,
      },
      [],
      parseDate(currentProjectionDeal.endDate),
      true,
    ).interestPaid
    : 0;

  const totalOriginatedBalance = originalBalance + additionalBorrowingTotal;
  const publishedDealIds = new Set(publishedDeals.map(deal => deal.id));

  return {
    originalBalance: toMoney(originalBalance),
    currentBalance: toMoney(currentBalance),
    principalPaid: toMoney(Math.max(0, totalOriginatedBalance - currentBalance)),
    interestPaidEstimate: toMoney(interestPaidEstimate),
    interestRemainingEstimate: toMoney(interestRemainingEstimate),
    overpaymentSavingsEstimate: toMoney(baselineInterestEstimate - interestPaidEstimate),
    balanceProgress: totalOriginatedBalance > 0
      ? Math.min(Math.max((totalOriginatedBalance - currentBalance) / totalOriginatedBalance, 0), 1)
      : 0,
    currentDeal,
    nextDraftDeal: getSingleDraftDeal(loan),
    recentEvents: loan.events
      .filter(event => event.dealId != null && publishedDealIds.has(event.dealId))
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
