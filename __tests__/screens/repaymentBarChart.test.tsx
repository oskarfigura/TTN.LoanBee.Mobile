import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type StackSegment = { value: number };
type StackDatum = {
  stacks: StackSegment[];
  label: string;
  labelWidth?: number;
  topLabelComponent?: () => React.ReactNode;
};
let capturedStackData: StackDatum[] | null = null;
let capturedBarProps: Record<string, any> | null = null;

jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('View', props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('Text', props, children),
    ScrollView: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('ScrollView', props, children),
    StyleSheet: { create: (styles: unknown) => styles },
  };
});

jest.mock('react-native-gifted-charts', () => ({
  BarChart: (props: Record<string, any> & { stackData: StackDatum[] }) => {
    capturedStackData = props.stackData;
    capturedBarProps = props;
    return null;
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../src/currency/format', () => ({
  formatCurrencyCompact: (value: number) => `£${value}`,
}));

import { RepaymentBarChart } from '../../src/components/charts/RepaymentBarChart';
import { getLoanCalculations } from '../../src/core/amortisation';
import { LoanCalculationType } from '../../src/core/LoanCalculationType';
import { DownPaymentType } from '../../src/core/DownPaymentType';

const buildArrays = (months = 36) => {
  const monthly: number[] = [];
  const interest: number[] = [];
  const lump: number[] = [];
  for (let m = 0; m <= months; m += 1) {
    monthly.push(m * 1000 + (m >= 13 ? 5000 : 0));
    interest.push(m * 200);
    lump.push(m >= 13 ? 5000 : 0);
  }
  return { monthly, interest, lump };
};

// Clean cumulative arrays with no overpayments: each month adds a fixed amount.
// monthly[m] = m * 1000, interest[m] = m * 200, so every full year's principal delta
// is 12 * (1000 - 200) = 9600 and interest delta is 12 * 200 = 2400.
const buildCleanArrays = (months: number) => ({
  monthly: Array.from({ length: months + 1 }, (_, m) => m * 1000),
  interest: Array.from({ length: months + 1 }, (_, m) => m * 200),
});

const renderBars = (props: Record<string, any>) => {
  act(() => {
    create(React.createElement(RepaymentBarChart, { currency: 'GBP', ...props } as any));
  });
};

const labelsOf = () => (capturedStackData ?? []).map(item => item.label);

beforeEach(() => {
  capturedStackData = null;
  capturedBarProps = null;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('RepaymentBarChart principal and interest handling', () => {
  it('shows only principal and interest even when projection data includes overpayments', () => {
    const { monthly, interest } = buildArrays();

    act(() => {
      create(React.createElement(RepaymentBarChart, {
        monthlyArray: monthly,
        interestArray: interest,
        currency: 'GBP',
      }));
    });

    const data = capturedStackData!;
    expect(data).toHaveLength(3);

    data.forEach(year => expect(year.stacks).toHaveLength(2));
    expect(data.map(year => year.topLabelComponent)).toEqual([undefined, undefined, undefined]);

    // The year with an overpayment records that extra principal as principal,
    // rather than introducing a third chart category.
    expect(data[1].stacks[0].value).toBe(14600);
    expect(data[1].stacks[1].value).toBe(2400);
  });

  it('condenses bars and thins labels on narrow screens when requested', () => {
    const { monthly, interest } = buildArrays(300);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(RepaymentBarChart, {
        monthlyArray: monthly,
        interestArray: interest,
        currency: 'GBP',
        fitToWidth: true,
      }));
    });

    const layoutNode = renderer.root.findAll(node => (
      String(node.type) === 'View' && typeof node.props.onLayout === 'function'
    ))[0];

    act(() => {
      layoutNode.props.onLayout({ nativeEvent: { layout: { width: 360 } } });
    });

    expect(capturedBarProps?.barWidth).toBeLessThan(18);
    expect(capturedBarProps?.spacing).toBeLessThan(14);
    expect(capturedBarProps?.disableScroll).toBe(true);
    expect(capturedBarProps?.xAxisTextNumberOfLines).toBe(1);
    expect(capturedStackData!.some(item => item.label === '')).toBe(true);
    expect(capturedStackData!.filter(item => item.label !== '').every(item => item.labelWidth === 34)).toBe(true);
    expect(capturedStackData![capturedStackData!.length - 1].label).not.toBe('');
  });
});

describe('RepaymentBarChart yearly downsampling', () => {
  it('renders exactly one bar for a whole-year (12 month) loan', () => {
    const { monthly, interest } = buildCleanArrays(12);
    renderBars({ monthlyArray: monthly, interestArray: interest });

    expect(capturedStackData).toHaveLength(1);
    expect(labelsOf()).toEqual(['Y1']);
    expect(capturedStackData![0].stacks[0].value).toBe(9600);
    expect(capturedStackData![0].stacks[1].value).toBe(2400);
  });

  it('keeps the final partial year instead of dropping it', () => {
    // An 18-month loan is one full year plus six months. The trailing half-year of
    // payments must still appear as its own bar, not vanish from the chart.
    const { monthly, interest } = buildCleanArrays(18);
    renderBars({ monthlyArray: monthly, interestArray: interest });

    expect(capturedStackData).toHaveLength(2);
    expect(labelsOf()).toEqual(['Y1', 'Y2']);

    // Year 2 covers months 12-18: total 6000, interest 1200, principal 4800.
    expect(capturedStackData![1].stacks[0].value).toBe(4800);
    expect(capturedStackData![1].stacks[1].value).toBe(1200);
  });

  it('still renders a bar for a sub-12-month loan rather than nothing', () => {
    const { monthly, interest } = buildCleanArrays(6);
    renderBars({ monthlyArray: monthly, interestArray: interest });

    expect(capturedStackData).toHaveLength(1);
    expect(capturedStackData![0].stacks[0].value).toBe(4800);
    expect(capturedStackData![0].stacks[1].value).toBe(1200);
  });

  it('matches each bar to the yearly delta of the source arrays', () => {
    const { monthly, interest } = buildCleanArrays(36);
    renderBars({ monthlyArray: monthly, interestArray: interest });

    capturedStackData!.forEach(year => {
      expect(year.stacks[0].value).toBe(9600);
      expect(year.stacks[1].value).toBe(2400);
    });
  });

  it('folds a trailing settlement stub into the final year instead of a sliver bar', () => {
    // Twelve full £1,000/mo payments, then the engine appends a £300 closing
    // settlement (smaller than a regular instalment). That stub must be absorbed
    // into year one, not rendered as its own one-month "Y2" sliver.
    const monthly = [...Array.from({ length: 13 }, (_, m) => m * 1000), 12300];
    const interest = [...Array.from({ length: 13 }, (_, m) => m * 200), 2450];
    renderBars({ monthlyArray: monthly, interestArray: interest });

    expect(capturedStackData).toHaveLength(1);
    expect(labelsOf()).toEqual(['Y1']);
    // Year 1 absorbs the stub: principal 9600 + 250, interest 2400 + 50.
    expect(capturedStackData![0].stacks[0].value).toBe(9850);
    expect(capturedStackData![0].stacks[1].value).toBe(2450);
  });

  it('ends a real overpayment mortgage on its true final year, not a closing sliver', () => {
    // Reported case: a £250k / 3.5% / 25y mortgage with a £250/mo overpayment clears
    // in 19 years plus a small settlement stub. The chart must end on Y19 with a
    // full-year bar rather than tacking on a one-month Y20 sliver.
    const result = getLoanCalculations(
      250000, 3.5, 25, 0, 0, LoanCalculationType.TERM, 0, DownPaymentType.CASH, 250, '2024-01-01',
    );
    renderBars({
      monthlyArray: result.loanChartMonthlyArray,
      interestArray: result.loanChartInterestArray,
    });

    const data = capturedStackData!;
    const regularPayment = result.loanChartMonthlyArray[1] - result.loanChartMonthlyArray[0];
    const lastBar = data[data.length - 1];
    const lastBarTotal = lastBar.stacks[0].value + lastBar.stacks[1].value;

    expect(labelsOf()[data.length - 1]).toBe('Y19');
    expect(lastBarTotal).toBeGreaterThan(regularPayment);
  });

  it('renders a zero-height slot for a year with no payment change without breaking labels', () => {
    // Year 2 (months 12-24) is flat: cumulative totals do not move across that year.
    const monthly = Array.from({ length: 37 }, (_, m) => (m <= 12 ? m * 1000 : 12000 + Math.max(0, m - 24) * 1000));
    const interest = Array.from({ length: 37 }, (_, m) => (m <= 12 ? m * 200 : 2400 + Math.max(0, m - 24) * 200));
    renderBars({ monthlyArray: monthly, interestArray: interest });

    expect(capturedStackData).toHaveLength(3);
    expect(labelsOf()).toEqual(['Y1', 'Y2', 'Y3']);
    expect(capturedStackData![1].stacks[0].value).toBe(0);
    expect(capturedStackData![1].stacks[1].value).toBe(0);
  });
});
