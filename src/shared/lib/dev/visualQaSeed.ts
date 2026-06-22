import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { buildInitialDeal, buildResultSnapshot, normaliseFormSnapshot } from '@/shared/domain/loans/loanGroupFactory';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import {
  LoanCategory,
  LoanDeal,
  LoanFormSnapshot,
  LoanGroup,
  LoanGroupStatus,
  LoanPurpose,
  MortgageEvent,
  MortgageVarianceReason,
} from '@/shared/domain/types/SavedLoan';
import { advanceMonthsClamped } from '@/shared/lib/utils/date';

type SeedFormValues = {
  loanAmount: number;
  interest: number;
  termInYears: number;
  termInMonths: number;
  downPayment: number;
  downPaymentType: DownPaymentType;
  desiredMonthlyPayment?: number | null;
  additionalMonthlyPayment?: number | null;
  startDate: string;
  calculationType: LoanCalculationType;
};

type SeedLoanOptions = {
  id: string;
  nickname: string;
  lender?: string;
  category: LoanCategory;
  loanPurpose?: LoanPurpose;
  currency: CurrencyCode;
  status?: LoanGroupStatus;
  pinnedToDashboard?: boolean;
  dashboardOrder?: number;
  form: SeedFormValues;
  deals?: (loan: LoanGroup) => LoanDeal[];
  events?: MortgageEvent[];
};

const now = '2026-05-22T09:00:00.000Z';

const addMonths = (dateString: string, months: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  advanceMonthsClamped(date, months);
  return date.toISOString().split('T')[0];
};

const calculateFromSnapshot = (form: LoanFormSnapshot, additionalMonthlyPayment: number) => (
  getLoanCalculations(
    form.loanAmount,
    form.interest,
    form.termInYears,
    form.termInMonths,
    form.desiredMonthlyPayment ?? 0,
    form.calculationType.toLowerCase(),
    form.downPayment,
    form.downPaymentType.toLowerCase(),
    additionalMonthlyPayment,
    form.startDate,
  )
);

const makeEvent = (
  id: string,
  type: MortgageEvent['type'],
  date: string,
  fields: Partial<Omit<MortgageEvent, 'id' | 'createdAt' | 'updatedAt' | 'type' | 'date'>> = {},
): MortgageEvent => ({
  id,
  createdAt: now,
  updatedAt: now,
  type,
  date,
  ...fields,
});

const makeLoan = ({
  id,
  nickname,
  lender,
  category,
  loanPurpose,
  currency,
  status = 'tracked',
  pinnedToDashboard = false,
  dashboardOrder,
  form,
  deals,
  events = [],
}: SeedLoanOptions): LoanGroup => {
  const formSnapshot = normaliseFormSnapshot(form, currency);
  const result = calculateFromSnapshot(formSnapshot, formSnapshot.additionalMonthlyPayment ?? 0);
  const baseline = calculateFromSnapshot(formSnapshot, 0);
  const loanBase: LoanGroup = {
    id,
    createdAt: now,
    updatedAt: now,
    nickname,
    lender,
    category,
    loanPurpose,
    currency,
    mortgageTermInMonths: result.tableItems.length,
    status,
    pinnedToDashboard,
    dashboardOrder,
    deals: [],
    events,
    formSnapshot,
    resultSnapshot: buildResultSnapshot(result, baseline.totalInterestPaid),
  };

  return {
    ...loanBase,
    deals: deals?.(loanBase) ?? [
      buildInitialDeal(`${id}-deal-current`, loanBase, {
        source: category === 'mortgage' ? 'userDeal' : undefined,
        durationInMonths: category === 'mortgage' ? 60 : undefined,
      }),
    ],
  };
};

const makeDeal = (
  id: string,
  loan: LoanGroup,
  overrides: Partial<LoanDeal>,
): LoanDeal => ({
  id,
  createdAt: now,
  updatedAt: now,
  name: 'Current agreement',
  lender: loan.lender,
  status: 'active',
  startDate: loan.formSnapshot.startDate,
  endDate: addMonths(loan.formSnapshot.startDate, 60),
  openingBalance: loan.formSnapshot.loanAmount,
  interestRate: loan.formSnapshot.interest,
  repaymentType: 'repayment',
  monthlyPayment: loan.resultSnapshot.monthlyPayments,
  regularOverpayment: loan.formSnapshot.additionalMonthlyPayment ?? 0,
  remainingTermInYears: loan.formSnapshot.termInYears,
  remainingTermInMonths: loan.formSnapshot.termInMonths,
  source: loan.category === 'mortgage' ? 'userDeal' : undefined,
  ...overrides,
});

// QA stress fixture: a deliberately oversized mortgage (£30m+ financed) with a
// long remortgage chain and a dense event log, used to watch the timeline list
// and currency text fitting struggle. Values are intentionally unrealistic.
// Rotate through the remaining variance reasons so the timeline exercises every
// reconciliation label, not just lenderTiming.
const checkpointVarianceReasons: MortgageVarianceReason[] = [
  'lenderTiming',
  'unloggedOverpayment',
  'feeAdded',
  'rateOrPaymentChanged',
  'paymentHoliday',
  'unknown',
];

const buildMegaMortgageEvents = (dealId: string, dealStart: string, count: number): MortgageEvent[] => {
  const events: MortgageEvent[] = [];
  let checkpointIndex = 0;
  for (let i = 0; i < count; i += 1) {
    const date = addMonths(dealStart, i + 1);
    if (i % 3 === 0) {
      events.push(
        makeEvent(`${dealId}-lump-${i}`, 'lumpOverpayment', date, {
          dealId,
          amount: 1_250_000 + i * 75_000,
          note: 'Quarter-end portfolio overpayment from rental income',
        }),
      );
    } else if (i % 3 === 1) {
      const varianceReason =
        checkpointVarianceReasons[checkpointIndex % checkpointVarianceReasons.length];
      checkpointIndex += 1;
      events.push(
        makeEvent(`${dealId}-checkpoint-${i}`, 'balanceCheckpoint', date, {
          dealId,
          balance: 34_500_000 - i * 480_000,
          projectedBalanceAtCheckpoint: 34_500_000 - i * 475_000,
          reconciliationVariance: -5_000 * i,
          varianceReason,
          note: 'Reconciled against the private bank statement',
        }),
      );
    } else {
      events.push(
        makeEvent(`${dealId}-note-${i}`, 'note', date, {
          dealId,
          note: 'Reviewed offset linked accounts and interest accrual schedule',
        }),
      );
    }
  }
  return events;
};

export const buildVisualQaLoans = (): LoanGroup[] => [
  makeLoan({
    id: 'demo-mega-mortgage',
    nickname: 'Country Estate (QA stress)',
    lender: 'Coutts Private',
    category: 'mortgage',
    currency: 'GBP',
    pinnedToDashboard: true,
    dashboardOrder: 0,
    form: {
      loanAmount: 45_000_000,
      interest: 4.85,
      termInYears: 30,
      termInMonths: 0,
      downPayment: 10_000_000,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 25_000,
      startDate: '2010-01-01',
      calculationType: LoanCalculationType.TERM,
    },
    deals: loan => [
      makeDeal('demo-mega-deal-1', loan, {
        name: 'Initial 5-year fix',
        status: 'completed',
        startDate: '2010-01-01',
        endDate: '2015-01-01',
        openingBalance: 35_000_000,
        interestRate: 5.6,
        monthlyPayment: 217_500,
        regularOverpayment: 25_000,
        remainingTermInYears: 30,
        completion: {
          completedAt: '2015-01-01',
          closingBalance: 32_100_000,
          feesAdded: 19_995,
          notes: 'Arrangement fee rolled into the next deal.',
        },
      }),
      makeDeal('demo-mega-deal-2', loan, {
        name: 'Second 5-year fix',
        status: 'completed',
        startDate: '2015-01-01',
        endDate: '2020-01-01',
        openingBalance: 32_119_995,
        interestRate: 4.1,
        monthlyPayment: 198_400,
        regularOverpayment: 25_000,
        remainingTermInYears: 25,
        completion: {
          completedAt: '2020-01-01',
          closingBalance: 27_650_000,
          feesAdded: 24_995,
          notes: 'Product transfer with the same lender.',
        },
      }),
      makeDeal('demo-mega-deal-3', loan, {
        name: 'Third 5-year fix',
        status: 'completed',
        startDate: '2020-01-01',
        endDate: '2025-01-01',
        openingBalance: 27_674_995,
        interestRate: 3.45,
        monthlyPayment: 176_200,
        regularOverpayment: 25_000,
        remainingTermInYears: 20,
        completion: {
          completedAt: '2025-01-01',
          closingBalance: 22_400_000,
          feesAdded: 29_995,
          notes: 'Refinanced onto a higher post-2024 rate.',
        },
      }),
      makeDeal('demo-mega-deal-4', loan, {
        name: 'Current 5-year fix',
        status: 'active',
        startDate: '2025-01-01',
        endDate: '2030-01-01',
        openingBalance: 22_429_995,
        interestRate: 4.85,
        monthlyPayment: 188_750,
        regularOverpayment: 25_000,
        remainingTermInYears: 15,
      }),
      makeDeal('demo-mega-deal-5', loan, {
        name: 'Next deal estimate',
        status: 'draft',
        source: 'estimate',
        startDate: '2030-01-01',
        endDate: '2035-01-01',
        openingBalance: 16_800_000,
        interestRate: 4.4,
        monthlyPayment: 172_300,
        regularOverpayment: 0,
        remainingTermInYears: 10,
      }),
    ],
    events: [
      ...buildMegaMortgageEvents('demo-mega-deal-1', '2010-01-01', 18),
      ...buildMegaMortgageEvents('demo-mega-deal-4', '2025-01-01', 14),
    ],
  }),
  makeLoan({
    id: 'demo-family-home',
    nickname: 'Our Family Home',
    lender: 'Halifax',
    category: 'mortgage',
    currency: 'GBP',
    pinnedToDashboard: true,
    dashboardOrder: 1,
    form: {
      loanAmount: 285000,
      interest: 4.35,
      termInYears: 25,
      termInMonths: 0,
      downPayment: 35000,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 150,
      startDate: '2025-01-01',
      calculationType: LoanCalculationType.TERM,
    },
    events: [
      makeEvent('demo-family-home-lump', 'lumpOverpayment', '2026-03-01', {
        dealId: 'demo-family-home-deal-current',
        amount: 3000,
        note: 'Annual bonus overpayment',
      }),
      makeEvent('demo-family-home-checkpoint', 'balanceCheckpoint', '2026-05-01', {
        dealId: 'demo-family-home-deal-current',
        balance: 241850,
        projectedBalanceAtCheckpoint: 241850,
        reconciliationVariance: 0,
        note: 'Balance matched the Halifax statement',
      }),
    ],
  }),
  makeLoan({
    id: 'demo-riverside-remortgage',
    nickname: 'Riverside Apartment',
    lender: 'Nationwide',
    category: 'mortgage',
    currency: 'GBP',
    pinnedToDashboard: true,
    dashboardOrder: 2,
    form: {
      loanAmount: 310000,
      interest: 3.9,
      termInYears: 28,
      termInMonths: 0,
      downPayment: 40000,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 0,
      startDate: '2024-01-01',
      calculationType: LoanCalculationType.TERM,
    },
    deals: loan => [
      makeDeal('demo-riverside-completed', loan, {
        name: 'First 2-year fix',
        status: 'completed',
        startDate: '2024-01-01',
        endDate: '2026-01-01',
        openingBalance: 270000,
        interestRate: 3.9,
        monthlyPayment: 1325,
        regularOverpayment: 0,
        remainingTermInYears: 28,
        completion: {
          completedAt: '2026-01-01',
          closingBalance: 258400,
          feesAdded: 995,
          notes: 'Product fee added to the new mortgage.',
        },
      }),
      makeDeal('demo-riverside-active', loan, {
        name: 'Nationwide 5-year fix',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2031-01-01',
        openingBalance: 259395,
        interestRate: 4.75,
        monthlyPayment: 1515,
        regularOverpayment: 100,
        remainingTermInYears: 26,
      }),
      makeDeal('demo-riverside-draft', loan, {
        name: 'Next deal estimate',
        status: 'draft',
        source: 'estimate',
        startDate: '2031-01-01',
        endDate: '2033-01-01',
        openingBalance: 228000,
        interestRate: 4.2,
        monthlyPayment: 1460,
        regularOverpayment: 0,
        remainingTermInYears: 21,
      }),
    ],
    events: [
      makeEvent('demo-riverside-lump', 'lumpOverpayment', '2026-04-01', {
        dealId: 'demo-riverside-active',
        amount: 5000,
        note: 'Savings used to reduce the balance',
      }),
      makeEvent('demo-riverside-checkpoint', 'balanceCheckpoint', '2026-05-15', {
        dealId: 'demo-riverside-active',
        balance: 251800,
        projectedBalanceAtCheckpoint: 252600,
        reconciliationVariance: -800,
        varianceReason: 'lenderTiming',
        note: 'Statement balance was slightly ahead of the estimate',
      }),
    ],
  }),
  makeLoan({
    id: 'demo-holiday-let',
    nickname: 'Seaside Holiday Let',
    lender: 'Santander',
    category: 'mortgage',
    currency: 'EUR',
    form: {
      loanAmount: 190000,
      interest: 5.4,
      termInYears: 20,
      termInMonths: 0,
      downPayment: 10000,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 0,
      startDate: '2025-05-01',
      calculationType: LoanCalculationType.TERM,
    },
    deals: loan => [
      makeDeal('demo-holiday-let-active', loan, {
        name: 'Interest-only period',
        status: 'active',
        startDate: '2025-05-01',
        endDate: '2027-05-01',
        openingBalance: 180000,
        interestRate: 5.4,
        repaymentType: 'interestOnly',
        monthlyPayment: 810,
        regularOverpayment: 0,
        remainingTermInYears: 20,
      }),
    ],
    events: [
      makeEvent('demo-holiday-let-missed', 'missedPayment', '2026-03-01', {
        dealId: 'demo-holiday-let-active',
        note: 'Direct debit was collected late',
      }),
      makeEvent('demo-holiday-let-holiday', 'paymentHoliday', '2026-04-01', {
        dealId: 'demo-holiday-let-active',
        note: 'One-month payment holiday during refurbishment',
      }),
      makeEvent('demo-holiday-let-checkpoint', 'balanceCheckpoint', '2026-05-01', {
        dealId: 'demo-holiday-let-active',
        balance: 182500,
        projectedBalanceAtCheckpoint: 180000,
        reconciliationVariance: 2500,
        varianceReason: 'missedPayment',
        note: 'Higher balance after the payment holiday and lender charges',
      }),
    ],
  }),
  makeLoan({
    id: 'demo-kitchen-renovation',
    nickname: 'Dream Kitchen',
    lender: 'mBank',
    category: 'loan',
    loanPurpose: 'homeImprovement',
    currency: 'PLN',
    form: {
      loanAmount: 125000,
      interest: 7.2,
      termInYears: 8,
      termInMonths: 6,
      downPayment: 0,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 350,
      startDate: '2025-09-01',
      calculationType: LoanCalculationType.TERM,
    },
    events: [
      makeEvent('demo-kitchen-lump', 'lumpOverpayment', '2026-02-01', {
        amount: 4500,
        note: 'Unused renovation budget paid back into the loan',
      }),
    ],
  }),
  makeLoan({
    id: 'demo-electric-car',
    nickname: 'Electric Family Car',
    lender: 'Santander Consumer',
    category: 'loan',
    loanPurpose: 'car',
    currency: 'GBP',
    form: {
      loanAmount: 32000,
      interest: 6.9,
      termInYears: 0,
      termInMonths: 0,
      downPayment: 5000,
      downPaymentType: DownPaymentType.CASH,
      desiredMonthlyPayment: 575,
      additionalMonthlyPayment: 0,
      startDate: '2026-02-01',
      calculationType: LoanCalculationType.PAYMENT,
    },
  }),
  makeLoan({
    id: 'demo-road-bike',
    nickname: 'Weekend Road Bike',
    lender: 'Pedal Finance',
    category: 'loan',
    loanPurpose: 'bike',
    currency: 'GBP',
    form: {
      loanAmount: 4200,
      interest: 7.9,
      termInYears: 2,
      termInMonths: 0,
      downPayment: 700,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 35,
      startDate: '2026-01-01',
      calculationType: LoanCalculationType.TERM,
    },
  }),
  makeLoan({
    id: 'demo-motorbike',
    nickname: 'Touring Motorbike',
    lender: 'Black Horse',
    category: 'loan',
    loanPurpose: 'motorbike',
    currency: 'GBP',
    form: {
      loanAmount: 11800,
      interest: 8.4,
      termInYears: 4,
      termInMonths: 0,
      downPayment: 1800,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 25,
      startDate: '2025-11-01',
      calculationType: LoanCalculationType.TERM,
    },
  }),
  makeLoan({
    id: 'demo-education',
    nickname: 'Master’s Degree',
    lender: 'Future Finance',
    category: 'loan',
    loanPurpose: 'education',
    currency: 'EUR',
    form: {
      loanAmount: 18000,
      interest: 5.8,
      termInYears: 5,
      termInMonths: 0,
      downPayment: 12,
      downPaymentType: DownPaymentType.PERCENT,
      additionalMonthlyPayment: 40,
      startDate: '2025-09-01',
      calculationType: LoanCalculationType.TERM,
    },
  }),
  makeLoan({
    id: 'demo-photo-studio',
    nickname: 'Photography Studio',
    lender: 'Funding Circle',
    category: 'loan',
    loanPurpose: 'business',
    currency: 'USD',
    form: {
      loanAmount: 28000,
      interest: 9.2,
      termInYears: 5,
      termInMonths: 0,
      downPayment: 3000,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 100,
      startDate: '2025-07-01',
      calculationType: LoanCalculationType.TERM,
    },
    events: [
      makeEvent('demo-photo-studio-lump', 'lumpOverpayment', '2026-04-01', {
        amount: 1200,
        note: 'Busy-season income put towards the balance',
      }),
    ],
  }),
  // Fully repaid mortgage: every deal completed, the final one terminal, plus a
  // mid-chain remortgage that drew additional borrowing. Exercises the paid-off
  // end state and the additionalBorrowing display line.
  makeLoan({
    id: 'demo-paid-off',
    nickname: 'Starter Flat (paid off)',
    lender: 'Yorkshire BS',
    category: 'mortgage',
    currency: 'GBP',
    form: {
      loanAmount: 160000,
      interest: 3.2,
      termInYears: 15,
      termInMonths: 0,
      downPayment: 20000,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 0,
      startDate: '2009-06-01',
      calculationType: LoanCalculationType.TERM,
    },
    deals: loan => [
      makeDeal('demo-paid-off-deal-1', loan, {
        name: 'First 5-year fix',
        status: 'completed',
        startDate: '2009-06-01',
        endDate: '2014-06-01',
        openingBalance: 140000,
        interestRate: 4.9,
        monthlyPayment: 1100,
        regularOverpayment: 0,
        remainingTermInYears: 15,
        completion: {
          completedAt: '2014-06-01',
          closingBalance: 108000,
          feesAdded: 0,
          notes: 'Switched lenders at the end of the fix.',
        },
      }),
      makeDeal('demo-paid-off-deal-2', loan, {
        name: 'Remortgage with extension borrowing',
        status: 'completed',
        startDate: '2014-06-01',
        endDate: '2019-06-01',
        openingBalance: 123000,
        interestRate: 3.5,
        monthlyPayment: 1180,
        regularOverpayment: 100,
        additionalBorrowing: 15000,
        remainingTermInYears: 10,
        completion: {
          completedAt: '2019-06-01',
          closingBalance: 78000,
          feesAdded: 999,
          notes: 'Borrowed an extra £15k for a loft extension.',
        },
      }),
      makeDeal('demo-paid-off-deal-3', loan, {
        name: 'Final 5-year fix',
        status: 'completed',
        startDate: '2019-06-01',
        endDate: '2024-06-01',
        openingBalance: 78999,
        interestRate: 3.2,
        monthlyPayment: 1240,
        regularOverpayment: 250,
        remainingTermInYears: 5,
        completion: {
          completedAt: '2024-03-01',
          closingBalance: 0,
          feesAdded: 0,
          terminal: true,
          notes: 'Mortgage repaid in full, ahead of term.',
        },
      }),
    ],
    events: [
      makeEvent('demo-paid-off-final-lump', 'lumpOverpayment', '2024-02-01', {
        dealId: 'demo-paid-off-deal-3',
        amount: 9500,
        note: 'Final overpayment that cleared the balance',
      }),
    ],
  }),
  // Draft loan group: a saved calculation the user has not yet started tracking.
  // Exercises the draft card rendering in LoanProfileCard.
  makeLoan({
    id: 'demo-draft-plan',
    nickname: 'Possible Buy-to-Let (draft)',
    lender: 'Barclays',
    category: 'mortgage',
    currency: 'GBP',
    status: 'draft',
    form: {
      loanAmount: 240000,
      interest: 5.1,
      termInYears: 25,
      termInMonths: 0,
      downPayment: 60000,
      downPaymentType: DownPaymentType.CASH,
      additionalMonthlyPayment: 0,
      startDate: '2026-09-01',
      calculationType: LoanCalculationType.TERM,
    },
  }),
];

export const seedVisualQaLoans = (): LoanGroup[] => {
  const loans = buildVisualQaLoans();
  savedLoansStorage.clear();
  loans.slice().reverse().forEach(loan => savedLoansStorage.add(loan));
  return loans;
};
