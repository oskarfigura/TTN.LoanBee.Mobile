import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
let mockParams: Record<string, string | undefined> = {};

jest.mock('react-native', () => {
  const React = require('react');

  return {
    ScrollView: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('ScrollView', props, children)
    ),
    StyleSheet: { create: (styles: unknown) => styles },
    TouchableOpacity: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('TouchableOpacity', props, children)
    ),
    View: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('View', props, children)
    ),
  };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('SafeAreaView', props, children)
  ),
}));

jest.mock('@oskarfigura/ui-native', () => ({
  AppText: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('AppText', props, children)
  ),
  AppTextInput: (props: Record<string, unknown>) => React.createElement('AppTextInput', props),
  Button: (props: Record<string, unknown>) => React.createElement('Button', props),
  ButtonVariant: { Ghost: 'ghost' },
  FieldLabel: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('FieldLabel', props, children)
  ),
  FormSection: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('FormSection', props, children)
  ),
  InputSurface: ({ children, ...props }: { children?: React.ReactNode }) => (
    React.createElement('InputSurface', props, children)
  ),
}));

jest.mock('@/shared/lib/hooks/useSavedLoans', () => ({
  useSavedLoans: () => ({ add: jest.fn() }),
}));

jest.mock('@/shared/lib/services/review', () => ({
  useStoreReview: () => ({
    recordUsefulAction: jest.fn(() => Promise.resolve()),
    requestReview: jest.fn(() => Promise.resolve(false)),
  }),
}));

jest.mock('@/shared/lib/storage/savedLoans', () => ({
  savedLoansStorage: { getMaxDashboardOrder: () => 0 },
}));

jest.mock('@/shared/lib/storage/recentCalculations', () => ({
  recentCalculationsStorage: { getById: () => undefined },
}));

jest.mock('@/shared/domain/results/draftResultStore', () => ({
  getDraftResultSession: () => null,
}));

jest.mock('@/features/calculator/components/CurrencyPicker', () => ({
  CurrencyPicker: (props: Record<string, unknown>) => React.createElement('CurrencyPicker', props),
}));

jest.mock('@/features/tracker/components/editing/LenderTextInput', () => ({
  LenderTextInput: (props: Record<string, unknown>) => React.createElement('LenderTextInput', props),
}));

jest.mock('@/features/tracker/components/editing/LoanPurposePicker', () => ({
  LoanPurposePicker: (props: Record<string, unknown>) => React.createElement('LoanPurposePicker', props),
}));

jest.mock('@/shared/ui/components/HeaderCloseAction', () => ({
  HeaderCloseAction: (props: Record<string, unknown>) => React.createElement('HeaderCloseAction', props),
}));

jest.mock('@/shared/ui/components/ScreenHeader', () => ({
  ScreenHeader: (props: Record<string, unknown>) => React.createElement('ScreenHeader', props),
}));

jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

const textContent = (node: ReactTestInstance | string | number): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

afterEach(() => {
  mockParams = {};
  jest.clearAllMocks();
});

describe('Save calculation type', () => {
  it('inherits the type and sends Change back to edit the calculation', async () => {
    const formValues = {
      category: 'loan',
      currency: 'GBP',
      loanAmount: 20000,
      interest: 6,
      termInYears: 5,
      termInMonths: 0,
      downPayment: 0,
      downPaymentType: 'cash',
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: 0,
      startDate: '2026-01-01',
      calculationType: 'term',
    };
    const result = {
      amount: 20000,
      downPayment: 0,
      monthlyPayments: 386.66,
      tableItems: Array.from({ length: 60 }, () => ({})),
      totalAmountPaid: 23199.6,
      totalInterestPaid: 3199.6,
      loanChartMonthlyArray: [],
      loanChartInterestArray: [],
      loanChartRemainingArray: [],
      loanChartLabelArray: [],
      termInYears: 5,
      termInMonths: 0,
    };
    mockParams = {
      result: JSON.stringify(result),
      formValues: JSON.stringify(formValues),
      currency: 'GBP',
    };
    const SaveScreen = (await import('../../app/saved/new')).default;
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(React.createElement(SaveScreen));
    });

    expect(textContent(renderer.root)).toContain('save.loan');
    expect(textContent(renderer.root)).toContain('save.selectedInCalculation');
    expect(renderer.root.findAll(node => node.props.accessibilityState?.selected !== undefined)).toHaveLength(0);

    const change = renderer.root.find(
      node => node.props.accessibilityLabel === 'save.changeCalculation',
    );
    await act(async () => {
      change.props.onPress();
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/calculate',
      params: expect.objectContaining({
        fromResult: '1',
        currency: 'GBP',
        editValues: expect.stringContaining('"category":"loan"'),
      }),
    });
  });
});
