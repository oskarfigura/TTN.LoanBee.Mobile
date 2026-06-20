import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalConsoleError = console.error;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    StyleSheet: { create: (styles: unknown) => styles },
    TouchableOpacity: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('TouchableOpacity', props, children)
    ),
    View: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('View', props, children)
    ),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, values?: Record<string, unknown>) => (
      values?.amount ? `${key}:${values.amount}` : key
    ),
  }),
}));



jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

jest.mock('@/features/tracker/components/editing/LoanPurposePicker', () => ({
  LoanPurposeIconTile: (props: Record<string, unknown>) => React.createElement('LoanPurposeIconTile', props),
  LoanPurposeIcon: (props: Record<string, unknown>) => React.createElement('LoanPurposeIcon', props),
}));

jest.mock('@/features/tracker/components/dashboard/SavedLoanProgressBar', () => ({
  SavedLoanProgressBar: (props: Record<string, unknown>) => React.createElement('SavedLoanProgressBar', props),
}));

jest.mock('@/shared/domain/results/loanResultRoute', () => ({
  getResultForSavedLoan: jest.fn(() => ({
    amount: 200000,
    downPayment: 0,
    monthlyPayments: 1200,
    totalInterestPaid: 45000,
    totalAmountPaid: 245000,
    tableItems: [],
    loanChartMonthlyArray: [],
    loanChartInterestArray: [],
    loanChartRemainingArray: [],
    loanChartLabelArray: [],
    termInYears: 20,
    termInMonths: 0,
    startDate: '2026-01-01',
  })),
}));

jest.mock('@/shared/domain/loans/loanInsightSummary', () => ({
  buildSavedLoanDisplayDetails: jest.fn(() => ({ lender: 'LoanBee Bank' })),
  buildSavedLoanSummary: jest.fn(() => ({
    hero: { labelKey: 'results.payoffDate', value: '2046' },
    metrics: [
      { labelKey: 'results.monthlyPayment', value: '£1,200' },
      { labelKey: 'calculator.interestRate', value: '5%' },
      { labelKey: 'results.payoffDate', value: '2046' },
    ],
    progress: {
      value: 0.1,
      metrics: [{ labelKey: 'mortgage.currentBalance', value: '£190,000' }],
      savingsAmount: undefined,
    },
  })),
}));

const loan: SavedLoan = {
  schemaVersion: 2,
  id: 'loan-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  nickname: 'Car loan',
  lender: 'LoanBee Bank',
  category: 'loan',
  loanPurpose: 'car',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [],
  events: [],
  formSnapshot: {
    loanAmount: 200000,
    interest: 5,
    termInYears: 20,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: 'CASH',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: null,
    startDate: '2026-01-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 1200,
    totalAmountPaid: 245000,
    totalInterestPaid: 45000,
    totalInterestPaidBaseline: 45000,
    termInYears: 20,
    termInMonths: 0,
    totalTermInMonths: 240,
  },
};

const renderCard = async (props: Record<string, unknown> = {}): Promise<ReactTestRenderer> => {
  const { LoanProfileCard } = await import('@/features/tracker/components/dashboard/LoanProfileCard');
  let renderer: ReactTestRenderer | undefined;

  await act(async () => {
    renderer = create(React.createElement(LoanProfileCard, {
      loan,
      onPress: jest.fn(),
      onTogglePinned: jest.fn(),
      ...props,
    }));
  });

  return renderer as ReactTestRenderer;
};

const getCardTouchable = (renderer: ReactTestRenderer): ReactTestInstance => (
  renderer.root.find(node => (
    String(node.type) === 'TouchableOpacity'
      && node.props.accessibilityRole === 'button'
      && typeof node.props.onLongPress === 'function'
  ))
);

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === 'string' && message.includes('react-test-renderer is deprecated')) {
      return;
    }
    originalConsoleError(message, ...args);
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('LoanProfileCard selection gesture', () => {
  it('keeps the category badge text-only because the card already has an icon tile', async () => {
    const renderer = await renderCard();

    expect(renderer.root.findAll(node => String(node.type) === 'LoanPurposeIcon')).toHaveLength(0);
    expect(renderer.root.findAll(node => String(node.type) === 'LoanPurposeIconTile')).toHaveLength(1);
  });

  it('suppresses the follow-up press fired after a long press', async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const renderer = await renderCard({ onPress, onLongPress });
    const card = getCardTouchable(renderer);

    await act(async () => {
      card.props.onLongPress();
      card.props.onPress();
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    await act(async () => {
      jest.runAllTimers();
      card.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
