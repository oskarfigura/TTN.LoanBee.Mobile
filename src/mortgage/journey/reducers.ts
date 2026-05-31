import { CurrencyCode } from '@/currency/currencies';
import {
  LOAN_GROUP_SCHEMA_VERSION,
  LoanDeal,
  LoanFormSnapshot,
  LoanGroup,
  LoanResultSnapshot,
  MortgageEvent,
} from '@/types/SavedLoan';
import {
  buildNextDealDraft,
  calculateDealMonthlyPayment,
  generateDefaultDealName,
  getChronologicalDeals,
  getCurrentDeal,
  getLaterDealIds,
  getLaterDeals,
  getRemainingMortgageTermInMonths,
  normaliseDealChain,
  projectDeal,
} from '@/mortgage/tracker';
import { buildMortgageProjection } from '@/mortgage/projection';
import { createLocalId } from '@/utils/id';
import { formatIsoDate, parseDateLabelValue } from '@/utils/date';
import { JourneyAnswer, JourneyStep } from './types';

const now = (): string => new Date().toISOString();

const splitMonths = (totalMonths: number) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});

const addMonthsIso = (dateString: string, totalMonths: number): string => {
  const date = parseDateLabelValue(dateString);
  if (!date) return dateString;
  date.setMonth(date.getMonth() + totalMonths);
  return formatIsoDate(date);
};

const dealDurationMonths = (deal: LoanDeal): number => {
  const start = parseDateLabelValue(deal.startDate);
  const end = parseDateLabelValue(deal.endDate);
  if (!start || !end) return 1;
  return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
};

// Recompute the auto-derived fields (remaining mortgage term + monthly payment)
// for a deal after its inputs or the chain ahead of it have shifted.
const withDerivedFields = (loan: LoanGroup, deal: LoanDeal): LoanDeal => {
  const remainingMonths = getRemainingMortgageTermInMonths(loan, deal.startDate);
  const { years, months } = splitMonths(remainingMonths);
  return {
    ...deal,
    remainingTermInYears: years,
    remainingTermInMonths: months,
    monthlyPayment: calculateDealMonthlyPayment(
      deal.openingBalance,
      deal.interestRate,
      remainingMonths,
      deal.repaymentType,
    ),
    updatedAt: now(),
  };
};

const mapDeal = (loan: LoanGroup, dealId: string, fn: (deal: LoanDeal) => LoanDeal): LoanGroup => ({
  ...loan,
  deals: loan.deals.map(deal => (deal.id === dealId ? fn(deal) : deal)),
  updatedAt: now(),
});

// Run the existing waterfall (opening balances of later deals derive from the
// previous deal's projected closing balance) and then recompute the auto-derived
// payment/term for every later deal off its new opening balance and start date.
const recalcChain = (loan: LoanGroup, fromDealId: string): LoanGroup => {
  const normalised = normaliseDealChain(loan, fromDealId);
  const laterIds = new Set(getLaterDealIds(normalised, fromDealId));
  if (laterIds.size === 0) return normalised;
  return {
    ...normalised,
    deals: normalised.deals.map(deal => (laterIds.has(deal.id) ? withDerivedFields(normalised, deal) : deal)),
  };
};

const replaceDealEvents = (
  loan: LoanGroup,
  dealId: string,
  keep: (event: MortgageEvent) => boolean,
  added: MortgageEvent[],
): LoanGroup => ({
  ...loan,
  events: [...loan.events.filter(event => event.dealId !== dealId || keep(event)), ...added],
  updatedAt: now(),
});

const projectedClosingBalance = (loan: LoanGroup, deal: LoanDeal): number => {
  const end = parseDateLabelValue(deal.endDate) ?? new Date();
  return projectDeal(deal, loan.events, end, true).balance;
};

export const createMortgageHistoryDraft = (currency: CurrencyCode): LoanGroup => {
  const timestamp = now();
  const startDate = formatIsoDate(new Date());
  const formSnapshot: LoanFormSnapshot = {
    loanAmount: 0,
    interest: 0,
    termInYears: 0,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: 'CASH',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: null,
    startDate,
    calculationType: 'TERM',
    currency,
  };
  const resultSnapshot: LoanResultSnapshot = {
    monthlyPayments: 0,
    totalAmountPaid: 0,
    totalInterestPaid: 0,
    totalInterestPaidBaseline: 0,
    termInYears: 0,
    termInMonths: 0,
    totalTermInMonths: 0,
  };

  return {
    schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
    id: createLocalId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    nickname: '',
    category: 'mortgage',
    currency,
    status: 'draft',
    pinnedToDashboard: false,
    deals: [],
    events: [],
    formSnapshot,
    resultSnapshot,
  };
};

// Seed the first deal once the loan-level basics are in place.
const seedFirstDeal = (loan: LoanGroup): LoanGroup => {
  if (loan.deals.length > 0) return loan;
  const deal = buildNextDealDraft(loan, createLocalId('deal'));
  return { ...loan, deals: [deal], updatedAt: now() };
};

const regenerateName = (deal: LoanDeal): string => {
  const { years, months } = splitMonths(dealDurationMonths(deal));
  return generateDefaultDealName(years, months, deal.repaymentType);
};

export const applyStep = (loan: LoanGroup, step: JourneyStep, answer: JourneyAnswer): LoanGroup => {
  switch (step.kind) {
    case 'intro':
    case 'review':
      return loan;

    case 'loan.currency': {
      if (answer.type !== 'currency') return loan;
      return {
        ...loan,
        currency: answer.currency,
        formSnapshot: { ...loan.formSnapshot, currency: answer.currency },
        updatedAt: now(),
      };
    }

    case 'loan.nickname': {
      if (answer.type !== 'text') return loan;
      return { ...loan, nickname: answer.text.trim(), updatedAt: now() };
    }

    case 'loan.lender': {
      if (answer.type !== 'text') return loan;
      const lender = answer.text.trim();
      return { ...loan, lender: lender || undefined, updatedAt: now() };
    }

    case 'loan.openingBalance': {
      if (answer.type !== 'number') return loan;
      const next: LoanGroup = {
        ...loan,
        formSnapshot: { ...loan.formSnapshot, loanAmount: answer.value, downPayment: 0 },
        updatedAt: now(),
      };
      const firstDeal = getChronologicalDeals(next)[0];
      if (!firstDeal) return next;
      const updated = mapDeal(next, firstDeal.id, deal =>
        withDerivedFields(next, { ...deal, openingBalance: answer.value }));
      return recalcChain(updated, firstDeal.id);
    }

    case 'loan.startDate': {
      if (answer.type !== 'date') return loan;
      const next: LoanGroup = {
        ...loan,
        formSnapshot: { ...loan.formSnapshot, startDate: answer.date },
        updatedAt: now(),
      };
      const firstDeal = getChronologicalDeals(next)[0];
      if (!firstDeal || firstDeal.status === 'completed') return next;
      const duration = dealDurationMonths(firstDeal);
      const updated = mapDeal(next, firstDeal.id, deal => withDerivedFields(next, {
        ...deal,
        startDate: answer.date,
        endDate: addMonthsIso(answer.date, duration),
      }));
      return recalcChain(updated, firstDeal.id);
    }

    case 'loan.totalTerm': {
      if (answer.type !== 'duration') return loan;
      const { years, months } = splitMonths(answer.months);
      const next: LoanGroup = {
        ...loan,
        mortgageTermInMonths: answer.months,
        formSnapshot: { ...loan.formSnapshot, termInYears: years, termInMonths: months },
        updatedAt: now(),
      };
      const seeded = seedFirstDeal(next);
      const firstDeal = getChronologicalDeals(seeded)[0];
      return firstDeal ? recalcChain(seeded, firstDeal.id) : seeded;
    }

    case 'deal.rate': {
      if (answer.type !== 'number' || !step.dealId) return loan;
      const updated = mapDeal(loan, step.dealId, deal =>
        withDerivedFields(loan, { ...deal, interestRate: answer.value }));
      return recalcChain(updated, step.dealId);
    }

    case 'deal.duration': {
      if (answer.type !== 'duration' || !step.dealId) return loan;
      const updated = mapDeal(loan, step.dealId, deal => {
        const withDates = { ...deal, endDate: addMonthsIso(deal.startDate, answer.months) };
        return { ...withDerivedFields(loan, withDates), name: regenerateName(withDates) };
      });
      return recalcChain(updated, step.dealId);
    }

    case 'deal.repaymentType': {
      if (answer.type !== 'choice' || !step.dealId) return loan;
      const repaymentType = answer.value === 'interestOnly' ? 'interestOnly' : 'repayment';
      const updated = mapDeal(loan, step.dealId, deal => {
        const withType = { ...deal, repaymentType: repaymentType as LoanDeal['repaymentType'] };
        return { ...withDerivedFields(loan, withType), name: regenerateName(withType) };
      });
      return recalcChain(updated, step.dealId);
    }

    case 'deal.regularOverpayment': {
      if (!step.dealId) return loan;
      const value = answer.type === 'number' ? answer.value : 0;
      const updated = mapDeal(loan, step.dealId, deal => ({ ...deal, regularOverpayment: value }));
      return recalcChain(updated, step.dealId);
    }

    case 'deal.lumpOverpayments': {
      if (!step.dealId) return loan;
      const rows = answer.type === 'overpayments' ? answer.rows : [];
      const timestamp = now();
      const events: MortgageEvent[] = rows.map(row => ({
        id: createLocalId('ev'),
        createdAt: timestamp,
        updatedAt: timestamp,
        dealId: step.dealId,
        type: 'lumpOverpayment',
        date: row.date,
        amount: row.amount,
      }));
      const next = replaceDealEvents(loan, step.dealId, event => event.type !== 'lumpOverpayment', events);
      return recalcChain(next, step.dealId);
    }

    case 'deal.missedPayments': {
      if (!step.dealId) return loan;
      const dates = answer.type === 'missed' ? answer.dates : [];
      const timestamp = now();
      const events: MortgageEvent[] = dates.map(date => ({
        id: createLocalId('ev'),
        createdAt: timestamp,
        updatedAt: timestamp,
        dealId: step.dealId,
        type: 'missedPayment',
        date,
      }));
      const next = replaceDealEvents(loan, step.dealId, event => event.type !== 'missedPayment', events);
      return recalcChain(next, step.dealId);
    }

    case 'deal.outcome': {
      if (answer.type !== 'gate' || !step.dealId) return loan;
      const dealId = step.dealId;
      const target = loan.deals.find(deal => deal.id === dealId);
      if (!target) return loan;

      if (answer.value === 'ongoing' || answer.value === 'paidOff') {
        // Both outcomes are terminal: the current ongoing deal, or the deal that
        // paid the mortgage off in full. Either way drop any later deals/events a
        // previous "ended" answer created.
        const laterIds = new Set(getLaterDealIds(loan, dealId));
        const pruned: LoanGroup = {
          ...loan,
          deals: loan.deals.filter(deal => !laterIds.has(deal.id)),
          events: loan.events.filter(event => !laterIds.has(event.dealId ?? '')),
          updatedAt: now(),
        };
        if (answer.value === 'ongoing') {
          return mapDeal(pruned, dealId, deal => ({ ...deal, status: 'active', completion: undefined }));
        }
        // Paid off: a completed, terminal deal with a zero closing balance and no
        // successor. The journey skips the closing-balance/fees questions and
        // goes straight to review.
        return mapDeal(pruned, dealId, deal => ({
          ...deal,
          status: 'completed',
          completion: { completedAt: deal.endDate, closingBalance: 0, feesAdded: 0, terminal: true },
        }));
      }

      // Ended: mark completed with a placeholder completion (the closing balance and
      // fees steps refine it next) and seed the successor deal if none exists yet.
      // A terminal completion left over from a previous "paid off" answer is
      // discarded so the closing balance is re-estimated rather than stuck at zero.
      const completed = mapDeal(loan, dealId, deal => ({
        ...deal,
        status: 'completed',
        completion: deal.completion && !deal.completion.terminal
          ? deal.completion
          : {
            completedAt: deal.endDate,
            closingBalance: projectedClosingBalance(loan, deal),
            feesAdded: 0,
          },
      }));
      const seeded = getLaterDeals(completed, dealId).length === 0
        ? { ...completed, deals: [...completed.deals, buildNextDealDraft(completed, createLocalId('deal'))], updatedAt: now() }
        : completed;
      return recalcChain(seeded, dealId);
    }

    case 'deal.closingBalance': {
      if (answer.type !== 'number' || !step.dealId) return loan;
      const updated = mapDeal(loan, step.dealId, deal => deal.completion
        ? { ...deal, completion: { ...deal.completion, closingBalance: answer.value } }
        : deal);
      return recalcChain(updated, step.dealId);
    }

    case 'deal.fees': {
      if (!step.dealId) return loan;
      const value = answer.type === 'number' ? answer.value : 0;
      const updated = mapDeal(loan, step.dealId, deal => deal.completion
        ? { ...deal, completion: { ...deal.completion, feesAdded: value } }
        : deal);
      return recalcChain(updated, step.dealId);
    }

    default:
      return loan;
  }
};

export const publishJourneyLoan = (loan: LoanGroup): LoanGroup => {
  const projection = buildMortgageProjection(loan);
  const totalMonths = loan.mortgageTermInMonths
    ?? loan.resultSnapshot.totalTermInMonths
    ?? 0;
  const currentDeal = getCurrentDeal(loan) ?? getChronologicalDeals(loan).slice(-1)[0];
  const { years, months } = splitMonths(totalMonths);

  const resultSnapshot: LoanResultSnapshot = {
    monthlyPayments: currentDeal?.monthlyPayment ?? 0,
    totalAmountPaid: projection.totalAmountPaid,
    totalInterestPaid: projection.totalInterestPaid,
    totalInterestPaidBaseline: projection.totalInterestPaid + projection.overpaymentSavingsEstimate,
    termInYears: years,
    termInMonths: months,
    totalTermInMonths: totalMonths,
  };

  return {
    ...loan,
    status: 'tracked',
    pinnedToDashboard: true,
    resultSnapshot,
    updatedAt: now(),
  };
};
