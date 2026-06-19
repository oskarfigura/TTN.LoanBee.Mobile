import { CurrencyCode } from '@/shared/domain/currency/currencies';
import {
  LOAN_GROUP_SCHEMA_VERSION,
  LoanCategory,
  LoanDeal,
  LoanFormSnapshot,
  LoanGroup,
  LoanResultSnapshot,
  MortgageEvent,
  MortgageRepaymentType,
} from '@/shared/domain/types/SavedLoan';
import { buildMortgageProjection } from '@/shared/domain/mortgage/projection';
import {
  calculateDealMonthlyPayment,
  generateDefaultDealName,
  getChronologicalDeals,
  getCurrentDeal,
  getRemainingMortgageTermInMonths,
} from '@/shared/domain/mortgage/tracker';
import { createLocalId } from '@/shared/lib/utils/id';
import {
  addMonthsToIsoDate,
  formatIsoDate,
  isValidIsoDate,
  monthsBetween,
  parseDateLabelValue,
} from '@/shared/lib/utils/date';

// A single lump overpayment captured against the seeded deal.
export interface TrackOverpaymentInput {
  date: string;
  amount: number;
}

/**
 * Start-date-driven "track your borrowing" form values. The selected date is
 * the anchor: today means current state, a past date means the opening state of
 * that original deal, and a future date means a projected setup.
 */
export interface TrackMortgageFormValues {
  nickname: string;
  lender?: string;
  currency: CurrencyCode;
  category?: LoanCategory;
  /** Balance at the selected start date. */
  currentBalance: number;
  /**
   * Original purchase price, captured only when tracking a mortgage "from the
   * beginning". Recorded on the snapshot; the borrowed balance is derived as
   * `propertyValue - deposit` and passed as `currentBalance`.
   */
  propertyValue?: number;
  /** Cash deposit paid at purchase. Pairs with `propertyValue` in from-beginning mode. */
  deposit?: number;
  interestRate: number;
  repaymentType: MortgageRepaymentType;
  /** Months from the selected start date until the borrowing is fully repaid. */
  remainingTermInMonths: number;
  /** Lender-confirmed scheduled payment, when the user knows it. */
  monthlyPayment?: number;
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
 * Build a fully tracked loan or mortgage from start-date-driven form values.
 * Produces one active deal anchored at `startDate`, then runs the shared
 * projection to populate the result snapshot the dashboard reads.
 */
export const buildTrackedMortgageFromForm = (
  values: TrackMortgageFormValues,
  options: { id?: string; createdAt?: string } = {},
): LoanGroup => {
  const timestamp = new Date().toISOString();
  const category = values.category ?? 'mortgage';
  const isMortgage = category === 'mortgage';
  const startDate = values.startDate ?? formatIsoDate(new Date());
  const remainingTermInMonths = Math.max(1, Math.round(values.remainingTermInMonths));
  const term = splitMonths(remainingTermInMonths);
  const regularOverpayment = Math.max(0, values.regularOverpayment ?? 0);

  const dealDurationMonths = resolveDealDurationMonths(
    startDate,
    remainingTermInMonths,
    isMortgage ? values.dealEndDate : undefined,
  );
  const dealDuration = splitMonths(dealDurationMonths);
  const endDate = addMonthsToIsoDate(startDate, dealDurationMonths);
  const monthlyPayment = values.monthlyPayment && values.monthlyPayment > 0
    ? values.monthlyPayment
    : calculateDealMonthlyPayment(
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
    source: isMortgage ? 'userDeal' : undefined,
  };

  const events: MortgageEvent[] = (values.lumpOverpayments ?? [])
    .filter(row => isValidIsoDate(row.date) && row.amount > 0)
    .map(row => ({
      id: createLocalId('ev'),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(isMortgage ? { dealId } : {}),
      type: 'lumpOverpayment',
      date: row.date,
      amount: row.amount,
    }));

  // From-beginning mode supplies the original price + deposit so the snapshot
  // mirrors a calculator-saved mortgage (loanAmount = price, downPayment = deposit);
  // getEffectiveLoanAmount then resolves the borrowed balance. From-today and
  // loans omit both, leaving the balance as the loan amount and no deposit.
  const deposit = Math.max(0, values.deposit ?? 0);
  const formSnapshot: LoanFormSnapshot = {
    loanAmount: values.propertyValue ?? values.currentBalance,
    interest: values.interestRate,
    termInYears: term.years,
    termInMonths: term.months,
    downPayment: deposit,
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
    category,
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

/** Today-anchored seed values for the track form, derived from an existing loan. */
export interface TrackMortgageSeed {
  nickname: string;
  /** Empty string (not undefined) so it drops straight into the lender text input. */
  lender: string;
  currency: CurrencyCode;
  currentBalance: number;
  interestRate: number;
  repaymentType: MortgageRepaymentType;
  monthlyPayment: number;
  remainingTermInMonths: number;
  dealEndDate?: string;
  regularOverpayment: number;
  lumpOverpayments: TrackOverpaymentInput[];
}

/**
 * Derive today-anchored form seed values from an existing (legacy) loan when
 * resuming/finalising it in place.
 *
 * The new model anchors on *today*, so the current balance is read from the
 * loan's projection (its balance as of `asOfIso`) rather than the original
 * opening balance, and the deal-level fields come from the deal the user is on
 * now — the current deal, falling back to the most recent one — instead of the
 * chronologically first deal. The remaining term is likewise measured from today
 * to payoff, not the full original mortgage term.
 */
export const deriveTrackSeedFromLoan = (loan: LoanGroup, asOfIso: string): TrackMortgageSeed => {
  const deals = getChronologicalDeals(loan);
  const asOf = parseDateLabelValue(asOfIso) ?? new Date();
  const currentDeal = getCurrentDeal(loan, asOf) ?? deals[deals.length - 1];
  const hasDeals = deals.length > 0;

  // Current balance is the anchor of the new model. For a loan with deals it is
  // today's projected balance; a pristine draft (no deals) has nothing to
  // project, so fall back to whatever opening balance was captured.
  const currentBalance = hasDeals
    ? buildMortgageProjection(loan).currentBalance
    : loan.formSnapshot.loanAmount;

  const remainingTermInMonths = hasDeals
    ? getRemainingMortgageTermInMonths(loan, asOfIso)
    : (loan.mortgageTermInMonths ?? 0);

  // Past deals' overpayments are already baked into the projected balance, so
  // only carry forward the current deal's one-off overpayments.
  const lumpOverpayments = loan.events
    .filter(event => (
      event.type === 'lumpOverpayment'
      && (!currentDeal || event.dealId === currentDeal.id)
      && isValidIsoDate(event.date)
      && (event.amount ?? 0) > 0
    ))
    .map(event => ({ date: event.date, amount: event.amount ?? 0 }));

  return {
    nickname: loan.nickname,
    lender: loan.lender ?? '',
    currency: loan.currency,
    currentBalance,
    interestRate: currentDeal?.interestRate ?? loan.formSnapshot.interest,
    repaymentType: currentDeal?.repaymentType ?? 'repayment',
    monthlyPayment: currentDeal?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments,
    remainingTermInMonths,
    // Only surface a still-future deal end; a past one is no longer the current deal.
    dealEndDate: currentDeal && currentDeal.endDate > asOfIso ? currentDeal.endDate : undefined,
    regularOverpayment: currentDeal?.regularOverpayment ?? 0,
    lumpOverpayments,
  };
};
