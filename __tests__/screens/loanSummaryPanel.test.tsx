import React from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => {
  const React = require('react');

  return {
    StyleSheet: { create: (styles: unknown) => styles },
    Text: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('Text', props, children)
    ),
    TouchableOpacity: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('TouchableOpacity', props, children)
    ),
    useWindowDimensions: () => ({ width: 320, height: 640 }),
    View: ({ children, ...props }: { children?: React.ReactNode }) => (
      React.createElement('View', props, children)
    ),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === 'results.years') return 'yrs';
      if (key === 'results.months') return 'mo';
      if (!values) return key;
      return `${key}:${Object.values(values).join('|')}`;
    },
  }),
}));

jest.mock('@oskarfigura/ui-native', () => ({
  QuickActionTile: (props: Record<string, unknown>) => React.createElement('QuickActionTile', props),
}));

jest.mock('@/features/tracker/components/dashboard/DashboardPinButton', () => ({
  DashboardPinButton: () => React.createElement('DashboardPinButton'),
}));

jest.mock('@/features/tracker/components/dashboard/DashboardProgressGauge', () => ({
  DashboardProgressGauge: () => React.createElement('DashboardProgressGauge'),
}));

jest.mock('@/shared/ui/components/Icon', () => ({
  Icon: (props: Record<string, unknown>) => React.createElement('Icon', props),
  IconName: new Proxy({}, { get: (_target, prop) => prop }),
}));

jest.mock('@/shared/domain/loans/loanInsightSummary', () => ({
  formatPayoffDate: () => '1 Jan 2044',
  buildSavedLoanDashboardProgress: () => [{
    labelKey: 'mortgage.timeProgress',
    value: 0,
    caption: { values: { elapsed: 0, total: 221 } },
  }],
  buildSavedLoanSummary: () => ({
    context: 'saved',
    hero: { labelKey: 'mortgage.currentBalance', value: '£376,917.72' },
    metrics: [
      { labelKey: 'results.monthlyPayment', value: '£2,316.45' },
      { labelKey: 'calculator.interestRate', value: '3.5%' },
      { labelKey: 'results.payoffDate', value: '19 Nov 2044' },
      { labelKey: 'results.totalInterest', value: '£289,841.44' },
      { labelKey: 'results.totalCost', value: '£789,841.44' },
    ],
    progress: {
      labelKey: 'saved.loanProgress',
      value: 0,
      caption: { key: 'saved.progress' },
      metrics: [{ labelKey: 'mortgage.currentBalance', value: '£376,917.72' }],
    },
  }),
}));

const textContent = (node: ReactTestInstance | string | number): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.children.map(child => textContent(child as ReactTestInstance | string | number)).join('');
};

describe('LoanSummaryPanel result hierarchy', () => {
  it('prioritises decision figures and explains the overpayment impact', async () => {
    const { LoanSummaryPanel } = await import('@/features/calculator/components/LoanSummaryPanel');
    const result = {
      amount: 500000,
      downPayment: 0,
      monthlyPayments: 2316.45,
      tableItems: Array.from({ length: 221 }, () => ({})),
      totalAmountPaid: 789841.44,
      totalInterestPaid: 289841.44,
      loanChartMonthlyArray: [],
      loanChartInterestArray: [],
      loanChartRemainingArray: [],
      loanChartLabelArray: [],
      termInYears: 18,
      termInMonths: 5,
    };
    const loan = {
      nickname: '',
      lender: undefined,
      category: 'mortgage',
      currency: 'GBP',
      pinnedToDashboard: false,
      events: [{
        id: 'lump-1',
        type: 'lumpOverpayment',
        date: '2027-01-01',
        amount: 10000,
      }],
      formSnapshot: {
        loanAmount: 500000,
        interest: 3.5,
        termInYears: 20,
        termInMonths: 0,
        downPayment: 0,
        downPaymentType: 'CASH',
        desiredMonthlyPayment: 0,
        calculationType: 'TERM',
        additionalMonthlyPayment: 250,
        startDate: '2026-01-01',
        currency: 'GBP',
      },
      resultSnapshot: {
        monthlyPayments: 2316.45,
        totalAmountPaid: 780000,
        totalInterestPaid: 280000,
        totalInterestPaidBaseline: 320000,
        termInYears: 18,
        termInMonths: 0,
        totalTermInMonths: 216,
      },
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(React.createElement(LoanSummaryPanel, {
        loan,
        result,
        mode: 'draft',
        onCompare: jest.fn(),
        onTryOverpayments: jest.fn(),
        onTrack: jest.fn(),
        onShare: jest.fn(),
        overpaymentImpact: {
          interestSaved: 40000,
          secondary: { kind: 'monthsSaved', value: 24 },
        },
      } as never));
    });

    const text = textContent(renderer.root);

    expect(text).toContain('results.monthlyPayment');
    expect(text).toContain('results.payoffDate');
    expect(text).toContain('results.totalInterest');
    expect(text).toContain('results.totalCost');
    expect(text).toContain('loan.loanDetails');
    expect(text).not.toContain('mortgage.currentBalance');
    expect(text).toContain('loan.overpaymentCouldSave:£40,000.00');
    expect(text).toContain('loan.overpaymentOneOff:£10,000.00');
    expect(text).toContain('loan.overpaymentSooner:2 yrs');
    expect(text).toContain('overpayments.adjustPreview');
  });
});
