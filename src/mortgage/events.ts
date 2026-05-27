import { LoanGroup, MortgageEvent } from '@/types/SavedLoan';
import { isValidIsoDate } from '@/utils/date';

export class InvalidMortgageEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMortgageEventError';
  }
}

const assertValidEvent = (event: MortgageEvent): void => {
  if (!isValidIsoDate(event.date)) {
    throw new InvalidMortgageEventError(
      `Mortgage event ${event.id} has an invalid ISO date: "${event.date}"`,
    );
  }
  if (event.amount !== undefined && !Number.isFinite(event.amount)) {
    throw new InvalidMortgageEventError(
      `Mortgage event ${event.id} has a non-finite amount: ${event.amount}`,
    );
  }
  if (event.balance !== undefined && !Number.isFinite(event.balance)) {
    throw new InvalidMortgageEventError(
      `Mortgage event ${event.id} has a non-finite balance: ${event.balance}`,
    );
  }
};

export const upsertMortgageEvent = (
  loan: LoanGroup,
  event: MortgageEvent,
): LoanGroup => {
  assertValidEvent(event);
  const exists = loan.events.some(item => item.id === event.id);

  return {
    ...loan,
    events: exists
      ? loan.events.map(item => item.id === event.id ? event : item)
      : [...loan.events, event],
  };
};

export const removeMortgageEvent = (
  loan: LoanGroup,
  eventId: string,
): LoanGroup => ({
  ...loan,
  events: loan.events.filter(event => event.id !== eventId),
});
