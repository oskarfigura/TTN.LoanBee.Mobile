import { LoanGroup } from '@/types/SavedLoan';
import { getChronologicalDeals } from '@/mortgage/tracker';
import { JourneyStep } from './types';

// Lead with the warm, concrete nickname question rather than a dry currency
// picker. Currency still precedes the opening balance so the money input shows
// the right symbol.
const LOAN_STEPS: JourneyStep[] = [
  { id: 'intro', kind: 'intro', group: 'intro', inputType: 'intro' },
  { id: 'loan.nickname', kind: 'loan.nickname', group: 'loan', inputType: 'text' },
  { id: 'loan.lender', kind: 'loan.lender', group: 'loan', inputType: 'text', optional: true },
  { id: 'loan.currency', kind: 'loan.currency', group: 'loan', inputType: 'currency' },
  { id: 'loan.openingBalance', kind: 'loan.openingBalance', group: 'loan', inputType: 'money' },
  { id: 'loan.startDate', kind: 'loan.startDate', group: 'loan', inputType: 'date' },
  { id: 'loan.totalTerm', kind: 'loan.totalTerm', group: 'loan', inputType: 'duration' },
];

const dealStepId = (dealId: string, suffix: string): string => `deal:${dealId}:${suffix}`;

/**
 * Deterministically derive the ordered list of journey steps from the loan's
 * current state. The per-deal closing steps only appear once a deal is marked
 * completed; the final review only appears once the latest deal is ongoing
 * (status 'active'), which is the journey's terminal state.
 */
export const buildJourneySteps = (loan: LoanGroup): JourneyStep[] => {
  const steps: JourneyStep[] = [...LOAN_STEPS];
  const deals = getChronologicalDeals(loan);

  deals.forEach((deal, index) => {
    const base = { dealId: deal.id, dealIndex: index, group: 'deal' as const };
    // The outcome gate sits after every attribute and activity question so the
    // closing-balance estimate (frozen when a deal is marked "ended") already
    // reflects the overpayments/missed payments entered above. Only an "ended"
    // deal goes on to closing balance + fees, so someone tracking just their
    // current mortgage never sees completion questions.
    steps.push(
      { ...base, id: dealStepId(deal.id, 'rate'), kind: 'deal.rate', inputType: 'percent' },
      { ...base, id: dealStepId(deal.id, 'duration'), kind: 'deal.duration', inputType: 'duration' },
      { ...base, id: dealStepId(deal.id, 'repaymentType'), kind: 'deal.repaymentType', inputType: 'choice' },
      { ...base, id: dealStepId(deal.id, 'regularOverpayment'), kind: 'deal.regularOverpayment', inputType: 'money', optional: true },
      { ...base, id: dealStepId(deal.id, 'lumpOverpayments'), kind: 'deal.lumpOverpayments', inputType: 'overpaymentList', optional: true },
      { ...base, id: dealStepId(deal.id, 'missedPayments'), kind: 'deal.missedPayments', inputType: 'missedList', optional: true },
      { ...base, id: dealStepId(deal.id, 'outcome'), kind: 'deal.outcome', inputType: 'gate' },
    );

    // A "paid off" deal is terminal: its closing balance is zero by definition,
    // so it skips the closing-balance/fees questions a remortgaged deal asks.
    if (deal.status === 'completed' && !deal.completion?.terminal) {
      steps.push(
        { ...base, id: dealStepId(deal.id, 'closingBalance'), kind: 'deal.closingBalance', inputType: 'money' },
        { ...base, id: dealStepId(deal.id, 'fees'), kind: 'deal.fees', inputType: 'money', optional: true },
      );
    }
  });

  // The journey terminates either on the current ongoing deal or on a deal the
  // user marked as fully paid off — both lead to the review.
  const latest = deals[deals.length - 1];
  if (latest && (latest.status === 'active' || latest.completion?.terminal)) {
    steps.push({ id: 'review', kind: 'review', group: 'review', inputType: 'review' });
  }

  return steps;
};

export const findStep = (loan: LoanGroup, stepId: string): JourneyStep | undefined =>
  buildJourneySteps(loan).find(step => step.id === stepId);

export const getNextStep = (loan: LoanGroup, stepId: string): JourneyStep | undefined => {
  const steps = buildJourneySteps(loan);
  const index = steps.findIndex(step => step.id === stepId);
  return index === -1 ? undefined : steps[index + 1];
};

export const getPrevStep = (loan: LoanGroup, stepId: string): JourneyStep | undefined => {
  const steps = buildJourneySteps(loan);
  const index = steps.findIndex(step => step.id === stepId);
  return index <= 0 ? undefined : steps[index - 1];
};

export const getStepProgress = (loan: LoanGroup, stepId: string): { index: number; total: number } => {
  const steps = buildJourneySteps(loan);
  const index = steps.findIndex(step => step.id === stepId);
  return { index: index === -1 ? 0 : index, total: steps.length };
};

export interface JourneyPhase {
  /** 0-based macro phase: 0 intro, 1 your mortgage, 2 deals, 3 review. */
  index: number;
  total: number;
  /** Monotonic 0..1 value for the progress bar. */
  fraction: number;
}

const LOAN_STEPS_ONLY = LOAN_STEPS.filter(step => step.group === 'loan');

/**
 * Coarse, always-forward progress. The raw step count expands when the user
 * reveals past deals ("It ended"), which makes a precise "Step N of M" lurch
 * backwards. Mapping every step onto four stable macro phases keeps the bar
 * monotonic: the deals phase simply climbs with each additional deal rather
 * than re-denominating the whole journey.
 */
export const getJourneyPhase = (loan: LoanGroup, stepId: string): JourneyPhase => {
  const step = findStep(loan, stepId);
  if (!step) return { index: 0, total: 4, fraction: 0 };

  switch (step.group) {
    case 'intro':
      return { index: 0, total: 4, fraction: 0.05 };
    case 'loan': {
      const pos = Math.max(0, LOAN_STEPS_ONLY.findIndex(s => s.id === step.id));
      const span = Math.max(1, LOAN_STEPS_ONLY.length - 1);
      return { index: 1, total: 4, fraction: 0.1 + 0.35 * (pos / span) };
    }
    case 'deal': {
      const dealIndex = step.dealIndex ?? 0;
      return { index: 2, total: 4, fraction: 0.5 + 0.35 * (dealIndex / (dealIndex + 1)) };
    }
    case 'review':
    default:
      return { index: 3, total: 4, fraction: 1 };
  }
};

/**
 * Best-effort resume target when a stored cursor no longer maps to a step
 * (e.g. a deal was removed). Normal operation uses the persisted cursor; this
 * only runs as a fallback.
 */
export const firstUnansweredStep = (loan: LoanGroup): JourneyStep => {
  const steps = buildJourneySteps(loan);
  const deals = getChronologicalDeals(loan);
  const latest = deals[deals.length - 1];

  if (!latest) {
    // Fresh draft (or basics part-done but no deal yet): begin at the welcome intro.
    return steps[0];
  }

  if (latest.status === 'active') {
    return findStep(loan, 'review') ?? steps[steps.length - 1];
  }

  const suffix = latest.status === 'completed' ? 'closingBalance' : 'rate';
  return findStep(loan, `deal:${latest.id}:${suffix}`) ?? steps[steps.length - 1];
};
