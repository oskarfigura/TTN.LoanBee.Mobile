import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
const mockForm = { setValue: jest.fn(), getValues: () => undefined, reset: jest.fn() };
const mockUseLoanCalculatorForm = jest.fn((_options?: unknown) => mockForm);
// Identity-checked: asserting the screen forwards this exact object proves it passed
// EXAMPLE_CALCULATOR_VALUES through (rather than some other default).
const exampleValues = {
  category: 'mortgage',
  loanAmount: 250000,
  interest: 5,
  termInYears: 25,
  downPayment: 10,
  downPaymentType: 'percent',
};
let mockRecent: unknown[] = [];
let mockSaved: unknown[] = [];
const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');
  return {
    StyleSheet: { create: (styles: unknown) => styles },
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
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

jest.mock('@/shared/lib/hooks/useLoanCalculatorForm', () => ({
  getDefaultCurrency: () => 'GBP',
  useLoanCalculatorForm: (options?: unknown) => mockUseLoanCalculatorForm(options),
  EXAMPLE_CALCULATOR_VALUES: exampleValues,
}));

jest.mock('@/shared/lib/storage/recentCalculations', () => ({
  recentCalculationsStorage: { getAll: () => mockRecent },
}));

jest.mock('@/shared/lib/storage/savedLoans', () => ({
  savedLoansStorage: { getAll: () => mockSaved },
}));

jest.mock('@/shared/lib/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({ loans: [], refresh: jest.fn() }),
}));

jest.mock('@/shared/lib/services/onboarding/guideState', () => ({
  hasSeenGuide: () => true,
}));

jest.mock('@/features/calculator/components/LoanForm', () => ({
  LoanForm: (props: Record<string, unknown>) => React.createElement('LoanForm', props),
}));

jest.mock('@/features/tracker/components/dashboard/MortgageDashboard', () => ({
  MortgageDashboard: (props: Record<string, unknown>) => React.createElement('MortgageDashboard', props),
}));

jest.mock('@/shared/ui/components/HeaderBackAction', () => ({
  HeaderBackAction: (props: Record<string, unknown>) => React.createElement('HeaderBackAction', props),
}));

jest.mock('@/shared/ui/components/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

const renderCalculate = async (): Promise<ReactTestRenderer> => {
  const { BorrowingScreen } = await import('../../app/(tabs)/index');
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(React.createElement(BorrowingScreen, { mode: 'calculate' }));
  });
  return renderer as ReactTestRenderer;
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) return;
    originalConsoleError(message, ...args);
  });
});

afterEach(() => {
  mockRecent = [];
  mockSaved = [];
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('First-run example prefill', () => {
  it('pre-fills the example mortgage when the user has no calculator history', async () => {
    await renderCalculate();
    expect(mockUseLoanCalculatorForm).toHaveBeenCalledWith({ initialValues: exampleValues });
  });

  it('starts empty once the user has recent calculations', async () => {
    mockRecent = [{ id: 'recent-1' }];
    await renderCalculate();
    expect(mockUseLoanCalculatorForm).toHaveBeenCalledWith({ initialValues: undefined });
  });

  it('starts empty once the user has saved loans', async () => {
    mockSaved = [{ id: 'loan-1' }];
    await renderCalculate();
    expect(mockUseLoanCalculatorForm).toHaveBeenCalledWith({ initialValues: undefined });
  });
});
