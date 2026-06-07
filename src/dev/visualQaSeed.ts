import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { getLoanCalculations } from '@/core/amortisation';
import { CurrencyCode } from '@/currency/currencies';
import { buildInitialDeal, buildResultSnapshot, normaliseFormSnapshot } from '@/loans/loanGroupFactory';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanCategory, LoanDeal, LoanFormSnapshot, LoanGroup, MortgageEvent } from '@/types/SavedLoan';
import { advanceMonthsClamped } from '@/utils/date';

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
  currency: CurrencyCode;
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
  currency,
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
    currency,
    mortgageTermInMonths: result.tableItems.length,
    status: 'tracked',
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
  name: 'Visual QA deal',
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

const makeBankCheckMortgage = ({
  id,
  nickname,
  checkpointDate,
  balance,
  projectedBalanceAtCheckpoint,
  reconciliationVariance,
  varianceReason,
}: {
  id: string;
  nickname: string;
  checkpointDate: string;
  balance: number;
  projectedBalanceAtCheckpoint: number;
  reconciliationVariance: number;
  varianceReason?: MortgageEvent['varianceReason'];
}) => makeLoan({
  id,
  nickname,
  lender: 'Lloyds',
  category: 'mortgage',
  currency: 'GBP',
  form: {
    loanAmount: 260000,
    interest: 4.4,
    termInYears: 25,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: DownPaymentType.CASH,
    additionalMonthlyPayment: 0,
    startDate: '2025-01-01',
    calculationType: LoanCalculationType.TERM,
  },
  events: [
    makeEvent(`${id}-checkpoint`, 'balanceCheckpoint', checkpointDate, {
      dealId: `${id}-deal-current`,
      balance,
      projectedBalanceAtCheckpoint,
      reconciliationVariance,
      varianceReason,
      note: varianceReason
        ? `Visual QA reconciliation reason: ${varianceReason}`
        : 'Visual QA matched checkpoint',
    }),
  ],
});

export const buildVisualQaLoans = (): LoanGroup[] => [
  makeLoan({
    id: 'visual-qa-mortgage-current',
    nickname: 'QA Dashboard Mortgage',
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
      makeEvent('visual-qa-current-lump', 'lumpOverpayment', '2026-03-01', {
        dealId: 'visual-qa-mortgage-current-deal-current',
        amount: 3000,
      }),
    ],
  }),
  makeLoan({
    id: 'visual-qa-remortgage-chain',
    nickname: 'QA Remortgage Timeline',
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
      makeDeal('visual-qa-remortgage-completed', loan, {
        name: 'Completed 2-year fix',
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
          notes: 'Completion fixture for visual QA.',
        },
      }),
      makeDeal('visual-qa-remortgage-active', loan, {
        name: 'Active 5-year fix',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2031-01-01',
        openingBalance: 259395,
        interestRate: 4.75,
        monthlyPayment: 1515,
        regularOverpayment: 100,
        remainingTermInYears: 26,
      }),
      makeDeal('visual-qa-remortgage-draft', loan, {
        name: 'Draft tracker switch',
        status: 'draft',
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
      makeEvent('visual-qa-remortgage-lump', 'lumpOverpayment', '2026-04-01', {
        dealId: 'visual-qa-remortgage-active',
        amount: 5000,
      }),
      makeEvent('visual-qa-remortgage-missed', 'missedPayment', '2026-05-01', {
        dealId: 'visual-qa-remortgage-active',
        note: 'Missed payment fixture',
      }),
      makeEvent('visual-qa-remortgage-checkpoint', 'balanceCheckpoint', '2026-05-15', {
        dealId: 'visual-qa-remortgage-active',
        balance: 251800,
        projectedBalanceAtCheckpoint: 252600,
        reconciliationVariance: -800,
        varianceReason: 'lenderTiming',
      }),
    ],
  }),
  makeBankCheckMortgage({
    id: 'visual-qa-bank-higher',
    nickname: 'QA Bank Higher Check-in',
    checkpointDate: '2026-05-01',
    balance: 252500,
    projectedBalanceAtCheckpoint: 250000,
    reconciliationVariance: 2500,
    varianceReason: 'missedPayment',
  }),
  makeBankCheckMortgage({
    id: 'visual-qa-bank-lower',
    nickname: 'QA Bank Lower Check-in',
    checkpointDate: '2026-05-01',
    balance: 247500,
    projectedBalanceAtCheckpoint: 250000,
    reconciliationVariance: -2500,
    varianceReason: 'unloggedOverpayment',
  }),
  makeBankCheckMortgage({
    id: 'visual-qa-bank-matched',
    nickname: 'QA Bank Matched Check-in',
    checkpointDate: '2026-05-01',
    balance: 250000,
    projectedBalanceAtCheckpoint: 250000,
    reconciliationVariance: 0,
  }),
  makeBankCheckMortgage({
    id: 'visual-qa-bank-stale',
    nickname: 'QA Stale Bank Check-in',
    checkpointDate: '2026-02-01',
    balance: 254000,
    projectedBalanceAtCheckpoint: 252500,
    reconciliationVariance: 1500,
    varianceReason: 'lenderTiming',
  }),
  makeLoan({
    id: 'visual-qa-pln-overpayment',
    nickname: 'QA PLN Overpayment Loan',
    lender: 'mBank',
    category: 'loan',
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
      makeEvent('visual-qa-pln-lump', 'lumpOverpayment', '2026-02-01', {
        amount: 4500,
      }),
    ],
  }),
  makeLoan({
    id: 'visual-qa-payment-mode',
    nickname: 'QA Payment Mode Car Loan',
    lender: 'Barclays',
    category: 'loan',
    currency: 'GBP',
    form: {
      loanAmount: 22000,
      interest: 8.9,
      termInYears: 0,
      termInMonths: 0,
      downPayment: 2000,
      downPaymentType: DownPaymentType.CASH,
      desiredMonthlyPayment: 650,
      additionalMonthlyPayment: 0,
      startDate: '2026-02-01',
      calculationType: LoanCalculationType.PAYMENT,
    },
  }),
  makeLoan({
    id: 'visual-qa-interest-only-holiday',
    nickname: 'QA Interest-Only Holiday',
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
      makeDeal('visual-qa-interest-only-active', loan, {
        name: 'Interest-only bridge',
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
      makeEvent('visual-qa-interest-only-holiday-event', 'paymentHoliday', '2026-04-01', {
        dealId: 'visual-qa-interest-only-active',
        note: 'Payment holiday fixture',
      }),
    ],
  }),
];

export const seedVisualQaLoans = (): LoanGroup[] => {
  const loans = buildVisualQaLoans();
  savedLoansStorage.clear();
  loans.slice().reverse().forEach(loan => savedLoansStorage.add(loan));
  return loans;
};
