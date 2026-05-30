import { CurrencyCode } from '@/currency/currencies';
import { LoanGroup } from '@/types/SavedLoan';
import { monthsBetween } from '@/utils/date';
import { JourneyStep } from './types';

// Normalised seed values for a step's input, read back from the saved loan so
// navigating back (or resuming) shows what the user already entered.
export interface StepInitial {
  currency?: CurrencyCode;
  text?: string;
  number?: number;
  months?: number;
  date?: string;
  choice?: string;
  gate?: 'ongoing' | 'ended';
  overpayments?: Array<{ date: string; amount: number }>;
  missed?: string[];
}

export const readStepInitial = (loan: LoanGroup, step: JourneyStep): StepInitial => {
  const deal = step.dealId ? loan.deals.find(item => item.id === step.dealId) : undefined;

  switch (step.kind) {
    case 'loan.currency':
      return { currency: loan.currency };
    case 'loan.nickname':
      return { text: loan.nickname };
    case 'loan.lender':
      return { text: loan.lender ?? '' };
    case 'loan.openingBalance':
      return { number: loan.formSnapshot.loanAmount || undefined };
    case 'loan.startDate':
      return { date: loan.formSnapshot.startDate };
    case 'loan.totalTerm':
      return { months: loan.mortgageTermInMonths };

    case 'deal.rate':
      return { number: deal && deal.interestRate > 0 ? deal.interestRate : undefined };
    case 'deal.duration':
      return { months: deal ? monthsBetween(deal.startDate, deal.endDate) : undefined };
    case 'deal.repaymentType':
      return { choice: deal?.repaymentType ?? 'repayment' };
    case 'deal.regularOverpayment':
      return { number: deal?.regularOverpayment || undefined };
    case 'deal.lumpOverpayments':
      return {
        overpayments: loan.events
          .filter(event => event.dealId === step.dealId && event.type === 'lumpOverpayment')
          .map(event => ({ date: event.date, amount: event.amount ?? 0 })),
      };
    case 'deal.missedPayments':
      return {
        missed: loan.events
          .filter(event => event.dealId === step.dealId && event.type === 'missedPayment')
          .map(event => event.date),
      };
    case 'deal.outcome':
      return { gate: deal?.status === 'completed' ? 'ended' : deal?.status === 'active' ? 'ongoing' : undefined };
    case 'deal.closingBalance':
      return { number: deal?.completion?.closingBalance };
    case 'deal.fees':
      return { number: deal?.completion?.feesAdded ?? 0 };

    default:
      return {};
  }
};
