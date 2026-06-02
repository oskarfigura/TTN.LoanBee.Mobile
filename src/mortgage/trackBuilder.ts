import { CurrencyCode } from '@/currency/currencies';
import {
  LOAN_GROUP_SCHEMA_VERSION,
  LoanDeal,
  LoanFormSnapshot,
  LoanGroup,
  LoanResultSnapshot,
  MortgageEvent,
  MortgageRepaymentType,
} from '@/types/SavedLoan';
import { buildMortgageProjection } from '@/mortgage/projection';
import { calculateDealMonthlyPayment, generateDefaultDealName } from '@/mortgage/tracker';
import { createLocalId } from '@/utils/id';
import { addMonthsToIsoDate, formatIsoDate, isValidIsoDate, monthsBetween } from '@/utils/date';

// A single lump overpayment the user has already made on the current deal.
export interface TrackOverpaymentInput {
  date: string;
  amount: number;
}

/**
 * Today-anchored "track your mortgage" form values. The model is deliberately
 * anchored on the present: the user enters what they owe *now* and the terms of
 * the deal they're on *now*, rather than reconstructing the original loan and
 * every past remortgage. Current balance is therefore an input, not a figure
 * derived (and compounded with error) from a historic chain.
 */
export interface TrackMortgageFormValues {
  nickname: string;
  lender?: string;
  currency: CurrencyCode;
  /** What you owe today — the anchor of the whole model. */
  currentBalance: number;
  interestRate: number;
  repaymentType: MortgageRepaymentType;
  /** Months from today until the mortgage is fully repaid. */
  remainingTermInMonths: number;
  /** When the current fixed/tracker deal ends. Optional; powers the remortgage reminder. */
  dealEndDate?: string;
  /** Optional enrichment: a recurring monthly overpayment already in place. */
  regularOverpayment?: number;
  /** Optional enrichment: one-off overpayments already made on this deal. */
  lumpOverpayments?: TrackOverpaymentInput[];
  /**
   * The anchor date. Defaults to today; accepting it as a param keeps the
   * builder pure and testable.
   */
  startDate?: string;
}

const splitMonths = (totalMonths: number) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});

// The fixed-deal period: from the anchor date to the deal-end date if the user
// gave one (and it's after the start), otherwise the deal simply runs to payoff.
const resolveDealDurationMonths = (
  startDate: string,
  remainingTermInMonths: number,
  dealEndDate?: string,
): number => {
  if (dealEndDate && isValidIsoDate(dealEndDate)) {
    const months = monthsBetween(startDate, dealEndDate);
    if (months >= 1) return Math.min(months, remainingTermInMonths);
  }
  return remainingTermInMonths;
};

/**
 * Build a fully-tracked mortgage from today-anchored form values. Produces one
 * active deal anchored at `startDate` with `openingBalance` set to the current
 * balance, then runs the shared projection to populate the result snapshot the
 * dashboard reads.
 */
export const buildTrackedMortgageFromForm = (
  values: TrackMortgageFormValues,
  options: { id?: string; createdAt?: string } = {},
): LoanGroup => {
  const timestamp = new Date().toISOString();
  const startDate = values.startDate ?? formatIsoDate(new Date());
  const remainingTermInMonths = Math.max(1, Math.round(values.remainingTermInMonths));
  const term = splitMonths(remainingTermInMonths);
  const regularOverpayment = Math.max(0, values.regularOverpayment ?? 0);

  const dealDurationMonths = resolveDealDurationMonths(
    startDate,
    remainingTermInMonths,
    values.dealEndDate,
  );
  const dealDuration = splitMonths(dealDurationMonths);
  const endDate = addMonthsToIsoDate(startDate, dealDurationMonths);
  const monthlyPayment = calculateDealMonthlyPayment(
    values.currentBalance,
    values.interestRate,
    remainingTermInMonths,
    values.repaymentType,
  );

  const dealId = createLocalId('deal');
  const deal: LoanDeal = {
    id: dealId,
    createdAt: timestamp,
    updatedAt: timestamp,
    name: generateDefaultDealName(dealDuration.years, dealDuration.months, values.repaymentType),
    lender: values.lender || undefined,
    status: 'active',
    startDate,
    endDate,
    openingBalance: values.currentBalance,
    interestRate: values.interestRate,
    repaymentType: values.repaymentType,
    monthlyPayment,
    regularOverpayment,
    additionalBorrowing: 0,
    remainingTermInYears: term.years,
    remainingTermInMonths: term.months,
    source: 'userDeal',
  };

  const events: MortgageEvent[] = (values.lumpOverpayments ?? [])
    .filter(row => isValidIsoDate(row.date) && row.amount > 0)
    .map(row => ({
      id: createLocalId('ev'),
      createdAt: timestamp,
      updatedAt: timestamp,
      dealId,
      type: 'lumpOverpayment',
      date: row.date,
      amount: row.amount,
    }));

  const formSnapshot: LoanFormSnapshot = {
    loanAmount: values.currentBalance,
    interest: values.interestRate,
    termInYears: term.years,
    termInMonths: term.months,
    downPayment: 0,
    downPaymentType: 'CASH',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: regularOverpayment || null,
    startDate,
    calculationType: 'TERM',
    currency: values.currency,
  };

  const base: LoanGroup = {
    schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
    id: options.id ?? createLocalId(),
    createdAt: options.createdAt ?? timestamp,
    updatedAt: timestamp,
    nickname: values.nickname.trim(),
    lender: values.lender || undefined,
    category: 'mortgage',
    currency: values.currency,
    mortgageTermInMonths: remainingTermInMonths,
    status: 'tracked',
    pinnedToDashboard: true,
    deals: [deal],
    events,
    formSnapshot,
    // Placeholder; replaced below once the projection runs over the seeded deal.
    resultSnapshot: {
      monthlyPayments: monthlyPayment,
      totalAmountPaid: 0,
      totalInterestPaid: 0,
      totalInterestPaidBaseline: 0,
      termInYears: term.years,
      termInMonths: term.months,
      totalTermInMonths: remainingTermInMonths,
    },
  };

  const projection = buildMortgageProjection(base);
  const resultSnapshot: LoanResultSnapshot = {
    monthlyPayments: monthlyPayment,
    totalAmountPaid: projection.totalAmountPaid,
    totalInterestPaid: projection.totalInterestPaid,
    totalInterestPaidBaseline: projection.totalInterestPaid + projection.overpaymentSavingsEstimate,
    termInYears: term.years,
    termInMonths: term.months,
    totalTermInMonths: remainingTermInMonths,
  };

  return { ...base, resultSnapshot };
};
