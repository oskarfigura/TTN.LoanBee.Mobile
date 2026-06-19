import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
let mockParams: Record<string, string | undefined> = {};
const mockRecordUsefulAction = jest.fn(() => Promise.resolve());
const mockRequestReview = jest.fn(() => Promise.resolve(false));
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    Alert: { alert: jest.fn() },
    Modal: ({ children, visible, ...props }: { children?: React.ReactNode; visible?: boolean }) => (
      React.createElement('Modal', { ...props, visible }, visible ? children : null)
    ),
    Share: { share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })) },
    StyleSheet: { create: (styles: unknown) => styles },
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('View', props, children),
  };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (
      values?.amount ? `${key}:${values.amount}` : key
    ),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

jest.mock('@/ads/BannerAd', () => ({
  BannerAd: () => React.createElement('BannerAd'),
}));

jest.mock('@/features/calculator/components/LoanSummaryPanel', () => ({
  LoanSummaryPanel: (props: Record<string, unknown>) => React.createElement('LoanSummaryPanel', props),
}));

jest.mock('@/features/tracker/components/overpayments/OverpaymentsView', () => ({
  OverpaymentsView: (props: Record<string, unknown>) => (
    React.createElement('OverpaymentsView', props)
  ),
}));

jest.mock('@/features/calculator/components/ScenarioComparison', () => ({
  ScenarioComparison: (props: Record<string, unknown>) => React.createElement('ScenarioComparison', props),
}));

jest.mock('@/shared/domain/loans/loanGroupFactory', () => ({
  buildDraftLoanPreview: () => ({
    id: 'draft-preview',
    formSnapshot: {
      loanAmount: 300000,
      interest: 4.5,
      termInYears: 25,
      termInMonths: 0,
      downPayment: 10,
      downPaymentType: 'PERCENT',
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: 0,
      startDate: '2026-01-01',
      calculationType: 'TERM',
      currency: 'GBP',
    },
  }),
}));

jest.mock('@/shared/domain/loans/overpaymentScope', () => ({
  createLoanOverpaymentScope: () => ({ bannerImpact: null }),
}));

jest.mock('@/features/calculator/components/LoanCalculationView', () => ({
  LoanCalculationView: ({ summaryContent }: { summaryContent?: React.ReactNode }) => (
    React.createElement('LoanCalculationView', null, summaryContent)
  ),
}));

jest.mock('@/shared/ui/components/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));


jest.mock('@/shared/ui/components/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

jest.mock('@/features/sharing/shareCalculation', () => ({
  shareCalculation: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/shared/lib/storage/recentCalculations', () => ({
  recentCalculationsStorage: {
    getById: jest.fn((id: string) => (
      id === 'recent-1'
        ? {
          id,
          currency: 'GBP',
          category: 'loan',
          formValues,
        }
        : undefined
    )),
  },
}));

jest.mock('@/shared/lib/storage/savedLoans', () => ({
  savedLoansStorage: {
    getById: jest.fn(() => null),
  },
}));

jest.mock('@/shared/lib/services/review', () => ({
  useStoreReview: () => ({
    recordUsefulAction: mockRecordUsefulAction,
    requestReview: mockRequestReview,
  }),
}));

const result = {
  amount: 300000,
  downPayment: 30000,
  monthlyPayments: 1351.68,
  tableItems: [],
  totalAmountPaid: 435505.09,
  totalInterestPaid: 135505.09,
  loanChartMonthlyArray: [],
  loanChartInterestArray: [],
  loanChartRemainingArray: [],
  loanChartLabelArray: [],
  termInYears: 25,
  termInMonths: 0,
  startDate: '2026-01-01',
};

const formValues = {
  category: 'mortgage',
  currency: 'GBP',
  loanAmount: 300000,
  interest: 4.5,
  termInYears: 25,
  termInMonths: 0,
  downPayment: 10,
  downPaymentType: 'percent',
  desiredMonthlyPayment: 0,
  additionalMonthlyPayment: 0,
  startDate: '2026-01-01',
  calculationType: 'term',
};

const renderResultScreen = async (): Promise<ReactTestRenderer> => {
  const ResultScreen = (await import('../../app/(tabs)/result')).default;
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(ResultScreen));
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
  mockParams = {};
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('ResultScreen', () => {
  it('uses the result header to edit the calculation instead of duplicating save', async () => {
    mockParams = {
      mode: 'draft',
      result: JSON.stringify(result),
      formValues: JSON.stringify(formValues),
      currency: 'GBP',
    };
    const renderer = await renderResultScreen();
    const header = renderer.root.find(node => String(node.type) === 'ScreenHeader');
    const rightAction = header.props.rightAction as React.ReactElement<{
      accessibilityLabel: string;
      onPress: () => void;
    }>;

    expect(rightAction.props.accessibilityLabel).toBe('saved.edit');

    await act(async () => {
      rightAction.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/calculate',
      params: expect.objectContaining({
        currency: 'GBP',
        fromResult: '1',
      }),
    });
  });

  it('does not offer a second save concept because the calculation is already recent', async () => {
    mockParams = {
      mode: 'draft',
      recentId: 'recent-1',
      result: JSON.stringify(result),
      formValues: JSON.stringify(formValues),
      currency: 'GBP',
    };
    const renderer = await renderResultScreen();
    const panel = renderer.root.find(node => String(node.type) === 'LoanSummaryPanel');

    expect(panel.props.onSaveScenario).toBeUndefined();
    expect(panel.props.onCompare).toEqual(expect.any(Function));
    expect(panel.props.onTryOverpayments).toEqual(expect.any(Function));
    expect(panel.props.onTrack).toEqual(expect.any(Function));
    expect(mockRecordUsefulAction).toHaveBeenCalledTimes(1);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('opens the overpayment drawer from the result summary', async () => {
    mockParams = {
      mode: 'draft',
      result: JSON.stringify(result),
      formValues: JSON.stringify(formValues),
      currency: 'GBP',
    };
    const renderer = await renderResultScreen();
    const panel = renderer.root.find(node => String(node.type) === 'LoanSummaryPanel');

    await act(async () => {
      panel.props.onTryOverpayments();
    });

    const modal = renderer.root.find(node => String(node.type) === 'Modal');
    const overpaymentsView = renderer.root.find(node => String(node.type) === 'OverpaymentsView');
    expect(modal.props.visible).toBe(true);
    expect(overpaymentsView.props.controlledLoan).toBeDefined();
    expect(overpaymentsView.props.onLoanChange).toEqual(expect.any(Function));
  });

  it('does not render a leave-without-saving interruption', async () => {
    mockParams = {
      mode: 'draft',
      result: JSON.stringify(result),
      formValues: JSON.stringify(formValues),
      currency: 'GBP',
    };

    const renderer = await renderResultScreen();

    expect(renderer.root.findAll(node => String(node.type) === 'UnsavedResultModal')).toHaveLength(0);
  });

  it('promotes a calculation into tracking only when the user chooses Track', async () => {
    mockParams = {
      mode: 'draft',
      recentId: 'recent-1',
      result: JSON.stringify(result),
      formValues: JSON.stringify(formValues),
      currency: 'GBP',
    };
    const renderer = await renderResultScreen();
    const panel = renderer.root.find(node => String(node.type) === 'LoanSummaryPanel');

    await act(async () => {
      panel.props.onTrack();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/saved/new',
      params: expect.objectContaining({
        recentId: 'recent-1',
        currency: 'GBP',
      }),
    });
  });
});
