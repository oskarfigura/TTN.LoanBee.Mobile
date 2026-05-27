import { projectDeal } from '@/mortgage/tracker';
import { CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { LoanDeal, MortgageEvent, MortgageVarianceReason } from '@/types/SavedLoan';
import { formatIsoDate, parseDateLabelValue } from '@/utils/date';

export interface BalanceCheckpointReconciliation {
  projectedBalanceAtCheckpoint: number;
  reconciliationVariance: number;
}

export const RECENT_CHECKPOINT_DAYS = 31;
export const OLDER_CHECKPOINT_DAYS = 90;

export type BalanceSourceKind =
  | 'completed'
  | 'bankToday'
  | 'bankRecent'
  | 'bankOlder'
  | 'bankStale'
  // A live deal projection with no bank checkpoint anchor yet.
  | 'projected'
  // A legacy/form-snapshot estimate when no current deal is available.
  | 'estimate';

export interface BalanceSourceMetadata {
  kind: BalanceSourceKind;
  checkpoint?: MortgageEvent;
  completedAt?: string;
  ageDays?: number;
}

const toSignedMoney = (value: number): number => +value.toFixed(2);

const parseDate = (dateString: string): Date => {
  const date = parseDateLabelValue(dateString);
  if (date) return date;

  const fallback = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
};

type ReconciliationTranslate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

export const getReconciliationMessage = (
  variance: number | undefined,
  currency: CurrencyCode,
  t: ReconciliationTranslate,
): string | undefined => {
  if (variance === undefined) return undefined;
  if (Math.abs(variance) < 1) return t('mortgage.reconciliationMatched');

  const amount = formatCurrency(Math.abs(variance), currency);
  return variance > 0
    ? t('mortgage.reconciliationBankHigher', { amount })
    : t('mortgage.reconciliationBankLower', { amount });
};

export const getBalanceCheckpointEvents = (
  events: MortgageEvent[],
  dealId: string,
  asOf = new Date(),
): MortgageEvent[] => {
  const today = formatIsoDate(asOf);

  return events
    .filter(event => (
      event.type === 'balanceCheckpoint'
      && event.dealId === dealId
      && typeof event.balance === 'number'
      && event.date <= today
    ))
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
};

export const getLatestBalanceCheckpoint = (
  events: MortgageEvent[],
  dealId: string,
  asOf = new Date(),
): MortgageEvent | undefined => {
  const checkpoints = getBalanceCheckpointEvents(events, dealId, asOf);
  return checkpoints[checkpoints.length - 1];
};

export const buildBalanceCheckpointReconciliation = ({
  deal,
  events,
  checkpointDate,
  bankBalance,
  editingEventId,
}: {
  deal: LoanDeal;
  events: MortgageEvent[];
  checkpointDate: string;
  bankBalance: number;
  editingEventId?: string;
}): BalanceCheckpointReconciliation => {
  const projectionEvents = events.filter(event => event.id !== editingEventId);
  const projectedBalanceAtCheckpoint = projectDeal(
    deal,
    projectionEvents,
    parseDate(checkpointDate),
    true,
  ).balance;

  return {
    projectedBalanceAtCheckpoint,
    reconciliationVariance: toSignedMoney(bankBalance - projectedBalanceAtCheckpoint),
  };
};

export const withBalanceCheckpointReconciliation = (
  event: MortgageEvent,
  deal: LoanDeal,
  events: MortgageEvent[],
  varianceReason?: MortgageVarianceReason,
): MortgageEvent => {
  if (event.type !== 'balanceCheckpoint' || typeof event.balance !== 'number') return event;

  // Frozen variance is an audit snapshot of what the app knew when the user
  // checked in with the bank. Later backfilled events should not rewrite it.
  const reconciliation = buildBalanceCheckpointReconciliation({
    deal,
    events,
    checkpointDate: event.date,
    bankBalance: event.balance,
    editingEventId: event.id,
  });

  return {
    ...event,
    ...reconciliation,
    varianceReason: Math.abs(reconciliation.reconciliationVariance) >= 1
      ? varianceReason ?? 'unknown'
      : undefined,
  };
};

export const getBalanceSourceMetadata = (
  currentDeal?: LoanDeal,
  events: MortgageEvent[] = [],
  asOf = new Date(),
): BalanceSourceMetadata => {
  if (!currentDeal) return { kind: 'estimate' };

  if (currentDeal.status === 'completed' && currentDeal.completion) {
    return {
      kind: 'completed',
      completedAt: currentDeal.completion.completedAt,
    };
  }

  const checkpoint = getLatestBalanceCheckpoint(events, currentDeal.id, asOf);
  if (!checkpoint) return { kind: 'projected' };

  const ageDays = Math.max(
    0,
    Math.floor((parseDate(formatIsoDate(asOf)).getTime() - parseDate(checkpoint.date).getTime()) / 86_400_000),
  );

  if (ageDays === 0) return { kind: 'bankToday', checkpoint, ageDays };
  if (ageDays <= RECENT_CHECKPOINT_DAYS) return { kind: 'bankRecent', checkpoint, ageDays };
  if (ageDays <= OLDER_CHECKPOINT_DAYS) return { kind: 'bankOlder', checkpoint, ageDays };
  return { kind: 'bankStale', checkpoint, ageDays };
};
