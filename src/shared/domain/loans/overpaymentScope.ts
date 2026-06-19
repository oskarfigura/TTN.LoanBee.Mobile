import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { CURRENCIES, CurrencyCode } from '@/shared/domain/currency/currencies';
import { buildResultSnapshot } from '@/shared/domain/loans/loanGroupFactory';
import {
  buildScenarioRemainingArray,
  computeLoanOverpayments,
  LumpSumEntry,
} from '@/shared/domain/loans/loanOverpaymentCalc';
import { removeMortgageEvent, upsertMortgageEvent } from '@/shared/domain/mortgage/events';
import { buildMortgageProjection } from '@/shared/domain/mortgage/projection';
import {
  getDealOverpaymentImpact,
  normaliseDealChain,
} from '@/shared/domain/mortgage/tracker';
import { LoanDeal, MortgageEvent, SavedLoan } from '@/shared/domain/types/SavedLoan';
import { advanceMonthsClamped, parseDateLabelValue } from '@/shared/lib/utils/date';
import { createLocalId } from '@/shared/lib/utils/id';

// The two overpayment surfaces (whole-loan and per-deal) share an identical screen
// but differ in three ways: where overpayments are read, which engine computes their
// impact, and how a change is persisted. This adapter captures exactly those
// differences so a single view can drive both. The underlying maths engines
// (loanOverpaymentCalc for loans, tracker for deals) are left untouched — they model
// genuinely different domains and are independently tested.

// The second savings metric differs per scope: a loan reports months shaved off the
// term; a deal reports extra principal repaid within the fixed deal window. The label
// and formatting follow from `kind`, so the view needs no scope-type branching.
export type OverpaymentImpact = {
  interestSaved: number;
  secondary:
    | { kind: 'monthsSaved'; value: number }
    | { kind: 'extraPrincipal'; value: number };
};

export interface OverpaymentScopeLabels {
  titleKey: string;
  subtitle?: string;
  monthlySectionKey: string;
  monthlyEditKey: string;
  lumpSectionKey: string;
  lumpEmptyKey: string;
  dateNoteKey?: string;
  monthlyPlaceholder?: string;
  lumpPlaceholder?: string;
  monthlyCurrencySymbol?: string;
}

export interface OverpaymentScope {
  labels: OverpaymentScopeLabels;
  currency: CurrencyCode;
  monthlyAmount: number;
  lumpEvents: MortgageEvent[];
  minDate: Date;
  maxDate: Date;
  /** Banner impact, or null when the scope's banner should be hidden. */
  bannerImpact: OverpaymentImpact | null;
  chartData: { baselineRemaining: number[]; scenarioRemaining: number[] } | null;
  computeMonthlyImpact: (amount: number) => OverpaymentImpact | null;
  computeLumpImpact: (amount: number, date: string, editingId?: string) => OverpaymentImpact | null;
  applySaveMonthly: (amount: number) => SavedLoan;
  applyRemoveMonthly: () => SavedLoan;
  applySaveLump: (date: string, amount: number, editing: MortgageEvent | null) => SavedLoan;
  applyDeleteLump: (eventId: string) => SavedLoan;
}

const sortByDate = (events: MortgageEvent[]): MortgageEvent[] =>
  [...events].sort((a, b) => a.date.localeCompare(b.date));

// ─── Loan scope ─────────────────────────────────────────────────────────────

export const createLoanOverpaymentScope = (loan: SavedLoan): OverpaymentScope => {
  const form = loan.formSnapshot;
  const currency = loan.currency;
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';
  const monthlyAmount = form.additionalMonthlyPayment ?? 0;

  const calcType = form.calculationType.toLowerCase() as LoanCalculationType;
  const dpType = form.downPaymentType.toLowerCase() as DownPaymentType;
  const runCalc = (monthlyOverpayment: number) => getLoanCalculations(
    form.loanAmount, form.interest, form.termInYears, form.termInMonths,
    form.desiredMonthlyPayment ?? 0, calcType, form.downPayment, dpType,
    monthlyOverpayment, form.startDate,
  );

  const lumpEvents = sortByDate(
    loan.events.filter(e => e.type === 'lumpOverpayment' && !e.dealId),
  );
  const lumpEntries: LumpSumEntry[] = lumpEvents.map(e => ({ date: e.date, amount: e.amount ?? 0 }));
  const hasOverpayments = monthlyAmount > 0 || lumpEntries.length > 0;

  const baselineCalc = runCalc(0);
  const start = parseDateLabelValue(form.startDate) ?? new Date();
  const maxDate = new Date(start);
  advanceMonthsClamped(maxDate, baselineCalc.tableItems.length - 1);
  // Lump sums need at least one elapsed payment period (monthIndex must be >= 1).
  const minDate = new Date(start);
  advanceMonthsClamped(minDate, 1);

  const toImpact = (monthly: number, lumps: LumpSumEntry[]): OverpaymentImpact | null => {
    const result = computeLoanOverpayments(form, monthly, lumps);
    if (result.interestSaved <= 0) return null;
    return {
      interestSaved: result.interestSaved,
      secondary: { kind: 'monthsSaved', value: result.monthsSaved },
    };
  };

  const rebuildSnapshot = (monthly: number, lumps: LumpSumEntry[]) => {
    const withMonthly = runCalc(monthly);
    const combined = computeLoanOverpayments(form, monthly, lumps);
    return {
      ...buildResultSnapshot(withMonthly, baselineCalc.totalInterestPaid),
      totalInterestPaid: combined.scenario.totalInterestPaid,
      totalTermInMonths: combined.scenario.totalTermInMonths,
    };
  };

  const lumpEntriesFrom = (events: MortgageEvent[]): LumpSumEntry[] => events
    .filter(e => e.type === 'lumpOverpayment' && !e.dealId)
    .map(e => ({ date: e.date, amount: e.amount ?? 0 }));

  return {
    labels: {
      titleKey: 'overpayments.title',
      monthlySectionKey: 'overpayments.monthlySection',
      monthlyEditKey: 'overpayments.monthlyEdit',
      lumpSectionKey: 'overpayments.lumpSumSection',
      lumpEmptyKey: 'overpayments.lumpSumEmpty',
      monthlyCurrencySymbol: currencySymbol,
    },
    currency,
    monthlyAmount,
    lumpEvents,
    minDate,
    maxDate,
    bannerImpact: hasOverpayments ? toImpact(monthlyAmount, lumpEntries) : null,
    chartData: hasOverpayments
      ? {
        baselineRemaining: baselineCalc.loanChartRemainingArray,
        scenarioRemaining: buildScenarioRemainingArray(form, monthlyAmount, lumpEntries),
      }
      : null,
    computeMonthlyImpact: amount => toImpact(amount, lumpEntries),
    // Preview the combined impact of every overpayment once this lump lands: the
    // current monthly figure plus all existing lumps, with the edited one swapped
    // for its prospective value. Mirrors the deal scope so both surfaces report a
    // total (matching the banner) rather than an isolated, understated figure.
    computeLumpImpact: (amount, date, editingId) => toImpact(monthlyAmount, [
      ...lumpEvents
        .filter(e => e.id !== editingId)
        .map(e => ({ date: e.date, amount: e.amount ?? 0 })),
      { date, amount },
    ]),
    applySaveMonthly: amount => ({
      ...loan,
      formSnapshot: { ...form, additionalMonthlyPayment: amount },
      resultSnapshot: rebuildSnapshot(amount, lumpEntries),
    }),
    applyRemoveMonthly: () => ({
      ...loan,
      formSnapshot: { ...form, additionalMonthlyPayment: null },
      resultSnapshot: rebuildSnapshot(0, lumpEntries),
    }),
    applySaveLump: (date, amount, editing) => {
      const now = new Date().toISOString();
      const updatedEvents: MortgageEvent[] = editing
        ? loan.events.map(e => (e.id === editing.id ? { ...editing, date, amount, updatedAt: now } : e))
        : [...loan.events, {
          id: createLocalId('op'),
          createdAt: now,
          updatedAt: now,
          type: 'lumpOverpayment',
          date,
          amount,
        }];
      return {
        ...loan,
        events: updatedEvents,
        resultSnapshot: rebuildSnapshot(monthlyAmount, lumpEntriesFrom(updatedEvents)),
      };
    },
    applyDeleteLump: eventId => {
      const updatedEvents = loan.events.filter(e => e.id !== eventId);
      return {
        ...loan,
        events: updatedEvents,
        resultSnapshot: rebuildSnapshot(monthlyAmount, lumpEntriesFrom(updatedEvents)),
      };
    },
  };
};

// ─── Deal scope ─────────────────────────────────────────────────────────────

// Returns a copy of the loan with this deal's overpayments removed (regular set to
// zero, lump events dropped) and the deal chain re-normalised so later deals' opening
// balances reflect the higher running balance. Projecting this alongside the saved
// loan isolates exactly this deal's overpayment impact across the whole mortgage
// timeline — every other deal keeps its own overpayments in both runs.
const stripDealOverpayments = (loan: SavedLoan, deal: LoanDeal): SavedLoan => {
  const deals = loan.deals.map(d => (d.id === deal.id ? { ...d, regularOverpayment: 0 } : d));
  const events = loan.events.filter(e => !(e.dealId === deal.id && e.type === 'lumpOverpayment'));
  return normaliseDealChain({ ...loan, deals, events }, deal.id);
};

export const createDealOverpaymentScope = (loan: SavedLoan, deal: LoanDeal): OverpaymentScope => {
  const currency = loan.currency;
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const lumpEvents = sortByDate(
    loan.events.filter(e => e.type === 'lumpOverpayment' && e.dealId === deal.id),
  );

  const toImpact = (result: ReturnType<typeof getDealOverpaymentImpact>): OverpaymentImpact | null => (
    result.hasOverpayments
      ? {
        interestSaved: result.interestSaved,
        secondary: { kind: 'extraPrincipal', value: result.extraPrincipalRepaid },
      }
      : null
  );

  const currentImpact = getDealOverpaymentImpact(deal, loan.events);

  return {
    labels: {
      titleKey: 'mortgage.dealOverpaymentsTitle',
      subtitle: deal.name,
      monthlySectionKey: 'mortgage.dealMonthlyOverpayment',
      monthlyEditKey: 'mortgage.dealMonthlyOverpaymentEdit',
      lumpSectionKey: 'mortgage.dealLumpSums',
      lumpEmptyKey: 'mortgage.dealLumpSumsEmpty',
      dateNoteKey: 'mortgage.dealOverpaymentDateNote',
      monthlyPlaceholder: '150',
      lumpPlaceholder: '5000',
      monthlyCurrencySymbol: currencySymbol,
    },
    currency,
    monthlyAmount: deal.regularOverpayment,
    lumpEvents,
    minDate: parseDateLabelValue(deal.startDate) ?? new Date(),
    maxDate: parseDateLabelValue(deal.endDate) ?? new Date(),
    bannerImpact: toImpact(currentImpact),
    // Plot the whole-mortgage balance over time, not just this deal's window: the
    // scenario is the loan as saved, the baseline is the same loan with this deal's
    // overpayments stripped. The gap between the two curves is this deal's impact,
    // carried forward through every later deal.
    chartData: currentImpact.hasOverpayments
      ? {
        baselineRemaining: buildMortgageProjection(stripDealOverpayments(loan, deal)).loanChartRemainingArray,
        scenarioRemaining: buildMortgageProjection(loan).loanChartRemainingArray,
      }
      : null,
    computeMonthlyImpact: amount => toImpact(
      getDealOverpaymentImpact({ ...deal, regularOverpayment: amount }, loan.events),
    ),
    computeLumpImpact: (amount, date, editingId) => {
      const tempEvent: MortgageEvent = {
        id: editingId ?? 'preview',
        createdAt: '',
        updatedAt: '',
        dealId: deal.id,
        type: 'lumpOverpayment',
        date,
        amount,
      };
      const tempEvents = [...loan.events.filter(e => e.id !== editingId), tempEvent];
      return toImpact(getDealOverpaymentImpact(deal, tempEvents));
    },
    applySaveMonthly: amount => {
      const updatedDeal: LoanDeal = { ...deal, regularOverpayment: amount, updatedAt: new Date().toISOString() };
      const updatedLoan = { ...loan, deals: loan.deals.map(d => (d.id === deal.id ? updatedDeal : d)) };
      return normaliseDealChain(updatedLoan, deal.id);
    },
    applyRemoveMonthly: () => {
      const updatedDeal: LoanDeal = { ...deal, regularOverpayment: 0, updatedAt: new Date().toISOString() };
      const updatedLoan = { ...loan, deals: loan.deals.map(d => (d.id === deal.id ? updatedDeal : d)) };
      return normaliseDealChain(updatedLoan, deal.id);
    },
    applySaveLump: (date, amount, editing) => {
      const now = new Date().toISOString();
      const event: MortgageEvent = editing
        ? { ...editing, date, amount, updatedAt: now }
        : {
          id: createLocalId('ev'),
          createdAt: now,
          updatedAt: now,
          dealId: deal.id,
          type: 'lumpOverpayment',
          date,
          amount,
        };
      return upsertMortgageEvent(loan, event);
    },
    applyDeleteLump: eventId => removeMortgageEvent(loan, eventId),
  };
};
