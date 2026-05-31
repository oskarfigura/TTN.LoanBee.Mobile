import { LoanGroup } from '@/types/SavedLoan';
import { DealChange } from './types';

const CENTS = 0.01;

/**
 * Compare two snapshots of a loan and report the later deals whose opening
 * balance or monthly payment shifted — the user-facing result of a waterfall
 * recalculation triggered by editing an earlier deal.
 *
 * When `laterDealIds` is supplied, only those deals are considered. This keeps
 * the diff to deals genuinely downstream of the one being edited, so editing
 * the first/only deal (which recomputes its own derived fields) never registers
 * as a "later deals updated" change.
 */
export const summariseDealChainChanges = (
  before: LoanGroup,
  after: LoanGroup,
  laterDealIds?: Set<string>,
): DealChange[] => {
  const beforeById = new Map(before.deals.map(deal => [deal.id, deal]));
  const changes: DealChange[] = [];

  after.deals.forEach(nextDeal => {
    if (laterDealIds && !laterDealIds.has(nextDeal.id)) return;
    const prevDeal = beforeById.get(nextDeal.id);
    if (!prevDeal) return;

    const openingChanged = Math.abs(prevDeal.openingBalance - nextDeal.openingBalance) >= CENTS;
    const paymentChanged = Math.abs(prevDeal.monthlyPayment - nextDeal.monthlyPayment) >= CENTS;
    if (!openingChanged && !paymentChanged) return;

    changes.push({
      dealId: nextDeal.id,
      dealName: nextDeal.name,
      previousOpeningBalance: prevDeal.openingBalance,
      nextOpeningBalance: nextDeal.openingBalance,
      previousMonthlyPayment: prevDeal.monthlyPayment,
      nextMonthlyPayment: nextDeal.monthlyPayment,
    });
  });

  return changes;
};
