import { LoanDeal, MortgageEvent } from '@/shared/domain/types/SavedLoan';
import { projectDeal } from '@/shared/domain/mortgage/tracker';
import { isValidIsoDate, parseDateLabelValue } from '@/shared/lib/utils/date';
import {
  NumericValidation,
  validateDurationText,
  validateMoneyText,
} from '@/shared/lib/utils/formValidation';

export type CompletionOverpaymentRowInput = {
  date: string;
  amount: string;
};

export type CompletionOverpaymentRowValidation = {
  amount: NumericValidation;
  dateErrorKey?: string;
  projectedBalance: number;
  isValid: boolean;
};

export const validateCurrentDealDurationText = (
  yearsRaw: string,
  monthsRaw: string,
  mortgageTermInMonths: number,
) => validateDurationText(yearsRaw, monthsRaw, { maxTotalMonths: mortgageTermInMonths });

export const validateCompletionAmounts = (
  closingBalance: string,
  feesAdded: string,
) => ({
  closingBalance: validateMoneyText(closingBalance, { allowZero: true }),
  feesAdded: validateMoneyText(feesAdded, { allowZero: true }),
});

// Delegate to the shared projection engine rather than re-deriving the
// amortisation here. The previous bespoke loop omitted the payment cap and
// ignored logged events, so the "overpayment too large" guard could disagree
// with the balance the projection actually shows. projectDeal applies the deal's
// scheduled payment plus its regular overpayment, and any `events` passed, up to
// the event date. Callers must exclude the lump events the form rows themselves
// represent, otherwise those would be double-counted against the running total.
export const getProjectedDealBalanceAtDate = (
  deal: LoanDeal,
  eventDate: string,
  events: MortgageEvent[] = [],
): number => {
  const asOf = parseDateLabelValue(eventDate);
  if (!asOf) return +deal.openingBalance.toFixed(2);

  // For a completed deal projectDeal would override the balance with the
  // bank-confirmed closing figure for every date; strip the completion so the
  // guard sees the scheduled balance at the event date, as the original did.
  const dealForProjection: LoanDeal = deal.status === 'completed' && deal.completion
    ? { ...deal, status: 'active', completion: undefined, endDate: deal.completion.completedAt }
    : deal;

  return projectDeal(dealForProjection, events, asOf, true).balance;
};

export const validateCompletionOverpaymentRow = (
  row: CompletionOverpaymentRowInput,
  deal: LoanDeal,
  completedAt: string,
  events: MortgageEvent[] = [],
): CompletionOverpaymentRowValidation => {
  const amount = validateMoneyText(row.amount);
  let dateErrorKey: string | undefined;

  if (!isValidIsoDate(row.date)) {
    dateErrorKey = 'mortgage.invalidEventDate';
  } else if (row.date < deal.startDate || row.date > completedAt) {
    dateErrorKey = 'mortgage.eventOutsideDealDates';
  }

  const projectedBalance = isValidIsoDate(row.date)
    ? getProjectedDealBalanceAtDate(deal, row.date, events)
    : deal.openingBalance;

  if (!dateErrorKey && amount.isValid && amount.numeric > projectedBalance) {
    return {
      amount: {
        ...amount,
        errorKey: 'mortgage.overpaymentTooLarge',
        isValid: false,
      },
      projectedBalance,
      isValid: false,
    };
  }

  return {
    amount,
    dateErrorKey,
    projectedBalance,
    isValid: amount.isValid && !dateErrorKey,
  };
};

// Validate a whole set of completion overpayment rows together. Each row on its
// own is checked against the projected balance at its date, but two rows can
// each be under that balance while collectively exceeding it. Process in date
// order, tracking the running total, so a later lump can only draw on the
// balance an earlier one left behind.
export const validateCompletionOverpaymentRows = (
  rows: Array<CompletionOverpaymentRowInput & { id: string }>,
  deal: LoanDeal,
  completedAt: string,
  events: MortgageEvent[] = [],
): Map<string, CompletionOverpaymentRowValidation> => {
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<string, CompletionOverpaymentRowValidation>();
  let cumulative = 0;

  for (const row of ordered) {
    const base = validateCompletionOverpaymentRow(row, deal, completedAt, events);

    if (base.isValid) {
      const available = Math.max(0, base.projectedBalance - cumulative);
      if (base.amount.numeric > available) {
        result.set(row.id, {
          ...base,
          amount: { ...base.amount, errorKey: 'mortgage.overpaymentTooLarge', isValid: false },
          isValid: false,
        });
        continue;
      }
      cumulative += base.amount.numeric;
    }

    result.set(row.id, base);
  }

  return result;
};

export type TrackLumpRowInput = {
  id: string;
  date: string;
  amount: string;
};

export type TrackLumpRowValidation = {
  id: string;
  amount: NumericValidation;
  dateErrorKey?: string;
  amountErrorKey?: string;
  // A row with a blank amount is incomplete, not invalid: it is ignored on save
  // and never blocks it (mirrors the add-then-leave-empty UX of the calculator).
  ignored: boolean;
  isValid: boolean;
};

// Validate the track form's lump overpayment rows. Previously these were only
// filtered by valid-date and amount>0, so a date before the start clamped to
// month 0, a date after payoff was silently dropped, and an oversized amount was
// silently absorbed. Surface those instead of producing a wrong projection.
// Amounts are accumulated so a set of lumps cannot collectively exceed the
// opening balance (total principal ever repaid can never exceed it).
export const validateTrackLumpRows = (
  rows: TrackLumpRowInput[],
  startDate: string,
  payoffDate: string | undefined,
  openingBalance: number,
): TrackLumpRowValidation[] => {
  let cumulative = 0;

  return rows.map(row => {
    const amount = validateMoneyText(row.amount, { required: false });

    if (amount.isEmpty) {
      return { id: row.id, amount, ignored: true, isValid: true };
    }

    let dateErrorKey: string | undefined;
    if (!isValidIsoDate(row.date)) {
      dateErrorKey = 'mortgage.invalidEventDate';
    } else if (row.date < startDate || (payoffDate !== undefined && row.date > payoffDate)) {
      dateErrorKey = 'mortgage.eventOutsideTerm';
    }

    let amountErrorKey = amount.isValid ? undefined : amount.errorKey;
    if (amount.isValid) {
      cumulative += amount.numeric;
      if (openingBalance > 0 && cumulative > openingBalance) {
        amountErrorKey = 'mortgage.overpaymentTooLarge';
      }
    }

    return {
      id: row.id,
      amount,
      dateErrorKey,
      amountErrorKey,
      ignored: false,
      isValid: !dateErrorKey && !amountErrorKey,
    };
  });
};
