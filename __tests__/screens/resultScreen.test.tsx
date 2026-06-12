import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { confirmResultLeave, setResultLeaveGuard } from '../../src/navigation/resultLeaveGuard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
const mockNavigation = {
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
};
let mockParams: Record<string, string | undefined> = {};
const mockRecordUsefulAction = jest.fn(() => Promise.resolve());
const mockRequestReview = jest.fn(() => Promise.resolve(false));
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    Alert: { alert: jest.fn() },
    Share: { share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })) },
    StyleSheet: { create: (styles: unknown) => styles },
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('View', props, children),
  };
});

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    React.useEffect(() => callback(), [callback]);
  },
  useLocalSearchParams: () => mockParams,
  useNavigation: () => mockNavigation,
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

jest.mock('../../src/ads/BannerAd', () => ({
  BannerAd: () => React.createElement('BannerAd'),
}));

jest.mock('../../src/components/calculator/LoanSummaryPanel', () => ({
  LoanSummaryPanel: () => React.createElement('LoanSummaryPanel'),
}));

jest.mock('../../src/loans/loanGroupFactory', () => ({
  buildDraftLoanPreview: () => ({ id: 'draft-preview' }),
}));

jest.mock('../../src/components/calculator/LoanCalculationView', () => ({
  LoanCalculationView: ({ summaryContent }: { summaryContent?: React.ReactNode }) => (
    React.createElement('LoanCalculationView', null, summaryContent)
  ),
}));

jest.mock('../../src/components/results/UnsavedResultModal', () => ({
  UnsavedResultModal: (props: Record<string, unknown>) => (
    React.createElement('UnsavedResultModal', props)
  ),
}));

jest.mock('../../src/components/ui/AppText', () => ({
  AppText: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('AppText', props, children)
  ),
}));

jest.mock('../../src/components/ui/Button', () => ({
  Button: (props: Record<string, unknown>) => React.createElement('Button', props),
}));

jest.mock('../../src/components/ui/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));

jest.mock('../../src/components/ui/HeaderIconButton', () => ({
  HeaderIconButton: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('HeaderIconButton', props, children)
  ),
}));

jest.mock('../../src/components/ui/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

jest.mock('../../src/components/ui/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

jest.mock('../../src/share/shareCalculation', () => ({
  shareCalculation: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/storage/recentCalculations', () => ({
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

jest.mock('../../src/storage/savedLoans', () => ({
  savedLoansStorage: {
    getById: jest.fn(() => null),
  },
}));

jest.mock('../../src/review', () => ({
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
  currency: 'GBP',
  loanAmount: 300000,
  additionalMonthlyPayment: 0,
  startDate: '2026-01-01',
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
  setResultLeaveGuard(null);
  mockParams = {};
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('ResultScreen', () => {
  it('shows a save action in the result header for unsaved calculations', async () => {
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

    expect(rightAction.props.accessibilityLabel).toBe('common.save');

    await act(async () => {
      rightAction.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/saved/new',
      params: expect.objectContaining({
        result: mockParams.result,
        formValues: mockParams.formValues,
        currency: 'GBP',
        returnToResult: '1',
      }),
    });
  });

  it('guards unsaved draft results and routes save-before-leaving to the save screen', async () => {
    mockParams = {
      mode: 'draft',
      result: JSON.stringify(result),
      formValues: JSON.stringify(formValues),
      currency: 'GBP',
    };
    const renderer = await renderResultScreen();
    const continueNavigation = jest.fn();

    await act(async () => {
      expect(confirmResultLeave(continueNavigation)).toBe(true);
    });

    const modal = renderer.root.find(node => String(node.type) === 'UnsavedResultModal');
    expect(modal.props.visible).toBe(true);
    expect(continueNavigation).not.toHaveBeenCalled();

    await act(async () => {
      modal.props.onSave();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/saved/new',
      params: {
        result: mockParams.result,
        formValues: mockParams.formValues,
        draftId: undefined,
        currency: 'GBP',
        returnToResult: '1',
      },
    });
    expect(mockRecordUsefulAction).toHaveBeenCalledTimes(1);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('does not guard stored recent calculations when leaving', async () => {
    mockParams = {
      mode: 'recent',
      recentId: 'recent-1',
      currency: 'GBP',
    };

    await renderResultScreen();

    expect(confirmResultLeave(jest.fn())).toBe(false);
  });
});
