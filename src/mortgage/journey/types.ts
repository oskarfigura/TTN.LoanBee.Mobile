import { CurrencyCode } from '@/currency/currencies';

// A guided journey lets a user narrate a pre-existing mortgage one question at a
// time. Steps are derived deterministically from the loan (deal count is dynamic),
// so resuming is just locating the cursor's stepId in the rebuilt list.

export type StepGroup = 'intro' | 'loan' | 'deal' | 'review';

export type JourneyInputType =
  | 'intro'
  | 'currency'
  | 'text'
  | 'money'
  | 'percent'
  | 'duration'
  | 'date'
  | 'choice'
  | 'gate'
  | 'overpaymentList'
  | 'missedList'
  | 'review';

export type StepKind =
  | 'intro'
  | 'loan.currency'
  | 'loan.nickname'
  | 'loan.lender'
  | 'loan.openingBalance'
  | 'loan.startDate'
  | 'loan.totalTerm'
  | 'deal.rate'
  | 'deal.duration'
  | 'deal.repaymentType'
  | 'deal.regularOverpayment'
  | 'deal.lumpOverpayments'
  | 'deal.missedPayments'
  | 'deal.outcome'
  | 'deal.closingBalance'
  | 'deal.fees'
  | 'review';

export interface JourneyStep {
  id: string;
  kind: StepKind;
  group: StepGroup;
  inputType: JourneyInputType;
  dealId?: string;
  // 0-based chronological position of the deal this step belongs to.
  dealIndex?: number;
  // Optional steps can be skipped (continue without entering a value).
  optional?: boolean;
}

// The answer the user gives for a step. Each reducer reads the variant it expects.
export type JourneyAnswer =
  | { type: 'none' }
  | { type: 'currency'; currency: CurrencyCode }
  | { type: 'text'; text: string }
  | { type: 'number'; value: number }
  | { type: 'duration'; months: number }
  | { type: 'date'; date: string }
  | { type: 'choice'; value: string }
  | { type: 'gate'; value: 'ongoing' | 'ended' | 'paidOff' }
  | { type: 'overpayments'; rows: Array<{ date: string; amount: number }> }
  | { type: 'missed'; dates: string[] };

// One later deal whose figures shifted as a result of a waterfall recalculation.
export interface DealChange {
  dealId: string;
  dealName: string;
  previousOpeningBalance: number;
  nextOpeningBalance: number;
  previousMonthlyPayment: number;
  nextMonthlyPayment: number;
}
