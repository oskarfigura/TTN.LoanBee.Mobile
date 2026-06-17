import { LoanGroup } from '@/shared/domain/types/SavedLoan';
import { getPublishedDeals } from './tracker';

export type ProjectionHighlightKind =
  | 'dealChanges'
  | 'regularOverpayments'
  | 'lumpOverpayments'
  | 'checkpoints'
  | 'paymentPauses';

export interface ProjectionHighlight {
  kind: ProjectionHighlightKind;
  count: number;
  labelKey:
    | 'mortgage.projectionDealChanges'
    | 'mortgage.projectionRegularOverpayments'
    | 'mortgage.projectionLumpOverpayments'
    | 'mortgage.projectionCheckpoints'
    | 'mortgage.projectionPaymentPauses';
}

export const buildProjectionHighlights = (loan: LoanGroup): ProjectionHighlight[] => {
  const publishedDeals = getPublishedDeals(loan);
  const publishedDealIds = new Set(publishedDeals.map(deal => deal.id));
  const projectedEvents = loan.events.filter(event => !event.dealId || publishedDealIds.has(event.dealId));
  const highlights: ProjectionHighlight[] = [];

  const dealChanges = Math.max(0, publishedDeals.length - 1);
  if (dealChanges > 0) {
    highlights.push({
      kind: 'dealChanges',
      count: dealChanges,
      labelKey: 'mortgage.projectionDealChanges',
    });
  }

  const regularOverpayments = publishedDeals.filter(deal => deal.regularOverpayment > 0).length;
  if (regularOverpayments > 0) {
    highlights.push({
      kind: 'regularOverpayments',
      count: regularOverpayments,
      labelKey: 'mortgage.projectionRegularOverpayments',
    });
  }

  const lumpOverpayments = projectedEvents.filter(event => (
    event.type === 'lumpOverpayment' && (event.amount ?? 0) > 0
  )).length;
  if (lumpOverpayments > 0) {
    highlights.push({
      kind: 'lumpOverpayments',
      count: lumpOverpayments,
      labelKey: 'mortgage.projectionLumpOverpayments',
    });
  }

  const checkpoints = projectedEvents.filter(event => (
    event.type === 'balanceCheckpoint' && typeof event.balance === 'number'
  )).length;
  if (checkpoints > 0) {
    highlights.push({
      kind: 'checkpoints',
      count: checkpoints,
      labelKey: 'mortgage.projectionCheckpoints',
    });
  }

  const paymentPauses = projectedEvents.filter(event => (
    event.type === 'missedPayment' || event.type === 'paymentHoliday'
  )).length;
  if (paymentPauses > 0) {
    highlights.push({
      kind: 'paymentPauses',
      count: paymentPauses,
      labelKey: 'mortgage.projectionPaymentPauses',
    });
  }

  return highlights;
};
