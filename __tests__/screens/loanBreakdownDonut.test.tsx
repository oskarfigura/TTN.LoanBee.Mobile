import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let capturedPieProps: Record<string, any> | null = null;

jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('View', props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement('Text', props, children),
    StyleSheet: { create: (styles: unknown) => styles },
  };
});

jest.mock('react-native-gifted-charts', () => ({
  PieChart: (props: Record<string, any>) => {
    capturedPieProps = props;
    return null;
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/shared/domain/currency/format', () => ({
  formatCurrency: (value: number) => `£${value}`,
}));

import { LoanBreakdownDonut } from '@/shared/ui/charts/LoanBreakdownDonut';

const textContent = (node: any): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (typeof node.props?.text === 'string') return node.props.text;
  return textContent(node.props?.children);
};

// The centre label renders two stacked <Text> lines; the first is
// `{principalPct}/{interestPct}`. Read that first line back so we can assert on
// the displayed percentages.
const centrePercentages = (): { principal: number; interest: number; raw: string } => {
  const element = capturedPieProps?.centerLabelComponent?.();
  const lines = React.Children.toArray(element.props.children);
  const raw = textContent(lines[0]);
  const [principal, interest] = raw.split('/');
  return { principal: Number(principal), interest: Number(interest), raw };
};

const render = (props: Record<string, any>) => {
  act(() => {
    create(React.createElement(LoanBreakdownDonut, { currency: 'GBP', ...props } as any));
  });
};

beforeEach(() => {
  capturedPieProps = null;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('LoanBreakdownDonut', () => {
  it('passes principal then interest as the two segments in order', () => {
    render({ principal: 150000, totalInterest: 50000 });

    const data = capturedPieProps?.data as Array<{ value: number }>;
    expect(data).toHaveLength(2);
    expect(data[0].value).toBe(150000);
    expect(data[1].value).toBe(50000);
  });

  it('shows a clean split as whole-number percentages', () => {
    render({ principal: 150000, totalInterest: 50000 });

    const { principal, interest, raw } = centrePercentages();
    expect(raw).toBe('75/25');
    expect(principal).toBe(75);
    expect(interest).toBe(25);
  });

  it('keeps the two displayed percentages summing to exactly 100', () => {
    // A 5/16 : 11/16 split (£5,000 principal, £11,000 interest) lands both shares
    // on a .x5 boundary (31.25% and 68.75%). Rounding each independently sends both
    // up to 31.3 + 68.8 = 100.1. The two displayed shares must always total 100.
    render({ principal: 5000, totalInterest: 11000 });

    const { principal, interest } = centrePercentages();
    expect(principal + interest).toBe(100);
  });

  it('handles an empty loan (zero principal and interest) without NaN', () => {
    render({ principal: 0, totalInterest: 0 });

    const { principal, interest } = centrePercentages();
    expect(principal).toBe(0);
    expect(interest).toBe(0);
    expect(Number.isNaN(principal)).toBe(false);
    expect(Number.isNaN(interest)).toBe(false);
  });

  it('reports a zero-interest loan as 100/0', () => {
    render({ principal: 12000, totalInterest: 0 });

    const { principal, interest } = centrePercentages();
    expect(principal).toBe(100);
    expect(interest).toBe(0);
  });

  it('floors the inner radius at 44 for small donuts', () => {
    render({ principal: 100, totalInterest: 100, radius: 50 });
    expect(capturedPieProps?.innerRadius).toBe(44);
  });
});
