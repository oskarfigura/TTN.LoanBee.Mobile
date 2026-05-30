import { LoanGroup } from '@/types/SavedLoan';
import { getChronologicalDeals } from '@/mortgage/tracker';
import { JourneyStep } from './types';

const LOAN_STEPS: JourneyStep[] = [
  { id: 'intro', kind: 'intro', group: 'intro', inputType: 'intro' },
  { id: 'loan.currency', kind: 'loan.currency', group: 'loan', inputType: 'currency' },
  { id: 'loan.nickname', kind: 'loan.nickname', group: 'loan', inputType: 'text' },
  { id: 'loan.lender', kind: 'loan.lender', group: 'loan', inputType: 'text', optional: true },
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
    steps.push(
      { ...base, id: dealStepId(deal.id, 'rate'), kind: 'deal.rate', inputType: 'percent' },
      { ...base, id: dealStepId(deal.id, 'duration'), kind: 'deal.duration', inputType: 'duration' },
      { ...base, id: dealStepId(deal.id, 'repaymentType'), kind: 'deal.repaymentType', inputType: 'choice' },
      { ...base, id: dealStepId(deal.id, 'regularOverpayment'), kind: 'deal.regularOverpayment', inputType: 'money', optional: true },
      { ...base, id: dealStepId(deal.id, 'lumpOverpayments'), kind: 'deal.lumpOverpayments', inputType: 'overpaymentList', optional: true },
      { ...base, id: dealStepId(deal.id, 'missedPayments'), kind: 'deal.missedPayments', inputType: 'missedList', optional: true },
      { ...base, id: dealStepId(deal.id, 'outcome'), kind: 'deal.outcome', inputType: 'gate' },
    );

    if (deal.status === 'completed') {
      steps.push(
        { ...base, id: dealStepId(deal.id, 'closingBalance'), kind: 'deal.closingBalance', inputType: 'money' },
        { ...base, id: dealStepId(deal.id, 'fees'), kind: 'deal.fees', inputType: 'money', optional: true },
      );
    }
  });

  const latest = deals[deals.length - 1];
  if (latest && latest.status === 'active') {
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
