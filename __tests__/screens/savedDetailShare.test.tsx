import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SavedLoan } from '../../src/types/SavedLoan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockNavigation = {
  addListener: jest.fn(() => jest.fn()),
};
const mockShareCalculation = jest.fn(() => Promise.resolve());
const mockResult = {
  amount: 180000,
  downPayment: 0,
  monthlyPayments: 950,
  tableItems: [],
  totalAmountPaid: 228000,
  totalInterestPaid: 48000,
  loanChartMonthlyArray: [],
  loanChartInterestArray: [],
  loanChartRemainingArray: [],
  loanChartLabelArray: [],
  termInYears: 20,
  termInMonths: 0,
  startDate: '2026-06-01',
};
let mockLoan: SavedLoan | undefined;
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    Modal: ({ children, visible, ...props }: { children?: React.ReactNode; visible?: boolean }) => (
      React.createElement('Modal', { ...props, visible }, visible ? children : null)
    ),
    Pressable: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('Pressable', props, children)
    ),
    StyleSheet: { create: (styles: unknown) => styles },
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('Text', props, children),
    TouchableOpacity: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('TouchableOpacity', props, children)
    ),
    View: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('View', props, children)
    ),
  };
});

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
    useLocalSearchParams: () => ({ id: 'loan-1' }),
    useNavigation: () => mockNavigation,
    useRouter: () => mockRouter,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

jest.mock('../../src/storage/savedLoans', () => ({
  savedLoansStorage: {
    getById: jest.fn(() => mockLoan),
    remove: jest.fn(),
    togglePinned: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../src/results/loanResultRoute', () => ({
  getResultForSavedLoan: jest.fn(() => mockResult),
}));

jest.mock('../../src/share/shareCalculation', () => ({
  shareCalculation: mockShareCalculation,
}));

jest.mock('../../src/components/calculator/LoanCalculationView', () => ({
  LoanCalculationView: ({ summaryContent, ...props }: { summaryContent?: React.ReactNode }) => (
    React.createElement('LoanCalculationView', props, summaryContent)
  ),
}));

jest.mock('../../src/components/calculator/LoanSummaryPanel', () => ({
  LoanSummaryPanel: (props: Record<string, unknown>) => React.createElement('LoanSummaryPanel', props),
}));

jest.mock('../../src/components/loans/MortgageDetailView', () => ({
  MortgageDetailView: (props: Record<string, unknown>) => React.createElement('MortgageDetailView', props),
}));

jest.mock('../../src/components/loans/LoanIcons', () => ({
  MoreIcon: (props: Record<string, unknown>) => React.createElement('MoreIcon', props),
}));

jest.mock('../../src/components/ui/AppText', () => ({
  AppText: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('AppText', props, children)
  ),
}));

jest.mock('../../src/components/ui/Button', () => ({
  Button: (props: Record<string, unknown>) => React.createElement('Button', props),
}));

jest.mock('../../src/components/ui/DestructiveConfirmDialog', () => ({
  DestructiveConfirmDialog: (props: Record<string, unknown>) => React.createElement('DestructiveConfirmDialog', props),
}));

jest.mock('../../src/components/ui/FormPrimitives', () => ({
  AppTextInput: (props: Record<string, unknown>) => React.createElement('AppTextInput', props),
  FieldLabel: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('FieldLabel', props, children)
  ),
  InputSurface: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('InputSurface', props, children)
  ),
}));

jest.mock('../../src/components/ui/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));

jest.mock('../../src/components/ui/HeaderIconButton', () => ({
  HeaderIconButton: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('HeaderIconButton', props, children)
  ),
}));

jest.mock('../../src/components/ui/QuickActionTile', () => ({
  QuickActionTile: (props: Record<string, unknown>) => React.createElement('QuickActionTile', props),
}));

jest.mock('../../src/components/ui/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

jest.mock('../../src/components/ui/Icons/CoinsStackedIcon/CoinsStackedIcon', () => ({
  CoinsStackedIcon: (props: Record<string, unknown>) => React.createElement('CoinsStackedIcon', props),
}));

jest.mock('../../src/components/ui/Icons/EditIcon/EditIcon', () => ({
  EditIcon: (props: Record<string, unknown>) => React.createElement('EditIcon', props),
}));

jest.mock('../../src/components/ui/Icons/ShareIcon/ShareIcon', () => ({
  ShareIcon: (props: Record<string, unknown>) => React.createElement('ShareIcon', props),
}));

jest.mock('../../src/components/ui/Icons/TrashIcon/TrashIcon', () => ({
  TrashIcon: (props: Record<string, unknown>) => React.createElement('TrashIcon', props),
}));

const formSnapshot = {
  loanAmount: 180000,
  interest: 5,
  termInYears: 20,
  termInMonths: 0,
  downPayment: 0,
  downPaymentType: 'CASH' as const,
  desiredMonthlyPayment: null,
  additionalMonthlyPayment: 0,
  startDate: '2026-06-01',
  calculationType: 'PAYMENT' as const,
  currency: 'GBP' as const,
};

const resultSnapshot = {
  monthlyPayments: 950,
  totalAmountPaid: 228000,
  totalInterestPaid: 48000,
  totalInterestPaidBaseline: 48000,
  termInYears: 20,
  termInMonths: 0,
  totalTermInMonths: 240,
};

const buildSavedLoan = (category: SavedLoan['category']): SavedLoan => ({
  schemaVersion: 2,
  id: 'loan-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  nickname: category === 'mortgage' ? 'Home mortgage' : 'Car loan',
  lender: 'LoanBee Bank',
  category,
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: true,
  dashboardOrder: 1,
  mortgageTermInMonths: 240,
  deals: [{
    id: 'deal-1',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    name: 'Deal 1',
    status: 'active',
    startDate: '2026-06-01',
    endDate: '2046-06-01',
    openingBalance: 180000,
    interestRate: 5,
    repaymentType: 'repayment',
    monthlyPayment: 950,
    regularOverpayment: 0,
    remainingTermInYears: 20,
    remainingTermInMonths: 0,
  }],
  events: [],
  formSnapshot,
  resultSnapshot,
});

const textContent = (node: ReactTestInstance | string | number | null | undefined): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

const renderDetail = async (): Promise<ReactTestRenderer> => {
  const DetailScreen = (await import('../../app/saved/[id]')).default;
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(DetailScreen));
  });

  return renderer as ReactTestRenderer;
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
      return;
    }
    originalConsoleError(message, ...args);
  });
});

afterEach(() => {
  mockLoan = undefined;
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('Saved detail sharing', () => {
  it('keeps loan overpayment management on the top summary instead of a duplicate quick action tile', async () => {
    mockLoan = buildSavedLoan('loan');
    const renderer = await renderDetail();
    const quickActionLabels = renderer.root
      .findAll(node => String(node.type) === 'QuickActionTile')
      .map(node => node.props.label);
    const summaryPanel = renderer.root.find(node => String(node.type) === 'LoanSummaryPanel');

    expect(quickActionLabels).not.toContain('overpayments.title');

    await act(async () => {
      summaryPanel.props.onTryOverpayments();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/saved/loan-1/overpayments');
  });

  it('shares a saved loan with the loan category from the quick action', async () => {
    mockLoan = buildSavedLoan('loan');
    const renderer = await renderDetail();
    const shareTile = renderer.root.findAll(node => String(node.type) === 'QuickActionTile').find(node => node.props.label === 'share.short')!;

    await act(async () => {
      await shareTile.props.onPress();
    });

    expect(mockShareCalculation).toHaveBeenCalledWith(expect.objectContaining({
      result: mockResult,
      formValues: formSnapshot,
      currency: 'GBP',
      category: 'loan',
    }));
  });

  it('shares a saved mortgage with the mortgage category from the overflow menu', async () => {
    mockLoan = buildSavedLoan('mortgage');
    const renderer = await renderDetail();
    const header = renderer.root.find(node => String(node.type) === 'ScreenHeader');
    const rightAction = header.props.rightAction as React.ReactElement<{ onPress: () => void }>;

    await act(async () => {
      rightAction.props.onPress();
    });

    const shareRow = renderer.root.find(node => (
      String(node.type) === 'TouchableOpacity' && textContent(node).includes('share.short')
    ));

    await act(async () => {
      await shareRow.props.onPress();
    });

    expect(mockShareCalculation).toHaveBeenCalledWith(expect.objectContaining({
      result: mockResult,
      formValues: formSnapshot,
      currency: 'GBP',
      category: 'mortgage',
    }));
  });

  it('keeps mortgage overpayment savings consolidated into the summary card', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/loans/MortgageDetailView.tsx'), 'utf8');

    expect(source).not.toContain('<DealOverpaymentsCard');
    expect(source).not.toContain('const DealOverpaymentsCard');
    expect(source).toContain('mortgage.manageDealOverpayments');
    expect(source).toContain('mortgage.setUpDealOverpayment');
  });
});
