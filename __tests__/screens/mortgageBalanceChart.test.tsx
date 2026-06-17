import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let capturedLineProps: Record<string, any> | null = null;

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
  LineChart: (props: Record<string, any>) => {
    capturedLineProps = props;
    return null;
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { MortgageBalanceChart } from '@/shared/ui/charts/MortgageBalanceChart';
import { colours } from '@/shared/ui/theme';

const buildSeries = (length: number, step: number) => (
  Array.from({ length }, (_, index) => Math.max(0, 300000 - (index * step)))
);

const textContent = (node: any): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (typeof node.props?.text === 'string') return node.props.text;
  return textContent(node.props?.children);
};

beforeEach(() => {
  capturedLineProps = null;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('MortgageBalanceChart', () => {
  it('renders a single-series mortgage balance curve when no baseline is present', () => {
    act(() => {
      create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: buildSeries(121, 1200),
        currency: 'GBP',
      }));
    });

    expect(capturedLineProps?.data2).toBeUndefined();
    expect(capturedLineProps?.color).toBeDefined();
  });

  it('samples the opening balance and completed yearly balances', () => {
    act(() => {
      create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: buildSeries(25, 1000),
        currency: 'GBP',
      }));
    });

    expect(capturedLineProps?.data.map((point: Record<string, number>) => point.value)).toEqual([
      300000,
      288000,
      276000,
    ]);
  });

  it('labels the comparison timeline from year zero', () => {
    act(() => {
      create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: buildSeries(265, 1100),
        baselineRemaining: buildSeries(265, 900),
        currency: 'GBP',
        comparisonLabelKeys: {
          baseline: 'overpayments.withoutOverpayments',
          scenario: 'overpayments.withOverpayments',
        },
      }));
    });

    const labels = capturedLineProps?.data
      .map((point: Record<string, any>) => point.labelComponent?.())
      .filter(Boolean)
      .map(textContent);

    expect(labels?.[0]).toBe('Yr 0');
    expect(labels).toContain('Yr 22');
  });

  it('condenses comparison points to fit a narrow viewport before falling back to scroll', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: buildSeries(301, 900),
        baselineRemaining: buildSeries(301, 700),
        currency: 'GBP',
        comparisonLabelKeys: {
          baseline: 'overpayments.withoutOverpayments',
          scenario: 'overpayments.withOverpayments',
        },
      }));
    });

    const layoutNode = renderer.root.findAll(node => (
      String(node.type) === 'View' && typeof node.props.onLayout === 'function'
    ))[0];

    act(() => {
      layoutNode.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
    });

    expect(capturedLineProps?.data2).toBeDefined();
    expect(capturedLineProps?.width).toBe(254);
    expect(capturedLineProps?.spacing).toBeLessThan(44);
    expect(capturedLineProps?.disableScroll).toBe(true);
    expect(capturedLineProps?.curvature).toBe(0.08);
    expect(capturedLineProps?.data.some((point: Record<string, unknown>) => 'spacing' in point)).toBe(false);
    expect(capturedLineProps?.data2.some((point: Record<string, unknown>) => 'spacing' in point)).toBe(false);
  });

  it('stretches the balance curve close to the right edge with only a small trailing pad', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: buildSeries(220, 1100),
        baselineRemaining: buildSeries(265, 900),
        currency: 'GBP',
        comparisonLabelKeys: {
          baseline: 'overpayments.withoutOverpayments',
          scenario: 'overpayments.withOverpayments',
        },
      }));
    });

    const layoutNode = renderer.root.findAll(node => (
      String(node.type) === 'View' && typeof node.props.onLayout === 'function'
    ))[0];

    act(() => {
      layoutNode.props.onLayout({ nativeEvent: { layout: { width: 360 } } });
    });

    const data = capturedLineProps!.data as Array<Record<string, unknown>>;
    const lastPointX = capturedLineProps!.initialSpacing + (data.length - 1) * capturedLineProps!.spacing;
    const trailingGap = capturedLineProps!.width - lastPointX;

    // The last plotted point must sit within roughly one spacing slot of the right edge,
    // so the curve fills the card instead of stopping short under empty gridlines.
    expect(capturedLineProps!.endSpacing).toBeLessThanOrEqual(12);
    expect(trailingGap).toBeLessThanOrEqual(capturedLineProps!.spacing + capturedLineProps!.endSpacing);
    expect(lastPointX).toBeGreaterThan(capturedLineProps!.width * 0.9);
  });

  it('does not render a flat zero tail after the baseline has paid off', () => {
    const baseline = Array.from(
      { length: 253 },
      (_, index) => (index >= 251 ? 0 : 252 - index),
    );

    act(() => {
      create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: buildSeries(220, 1400),
        baselineRemaining: baseline,
        currency: 'GBP',
        comparisonLabelKeys: {
          baseline: 'overpayments.withoutOverpayments',
          scenario: 'overpayments.withOverpayments',
        },
      }));
    });

    const baselineData = capturedLineProps?.data as Array<{ value: number }>;
    const last = baselineData[baselineData.length - 1];
    const penultimate = baselineData[baselineData.length - 2];

    expect(last.value).toBe(0);
    expect(penultimate.value).toBeGreaterThan(0);
  });

  it('scales comparison charts from the larger series even when it is not primary', () => {
    const baseline = Array.from({ length: 121 }, (_, index) => 120000 - (index * 500));
    const scenario = Array.from({ length: 121 }, (_, index) => 260000 - (index * 800));

    act(() => {
      create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: scenario,
        baselineRemaining: baseline,
        currency: 'GBP',
        comparisonLabelKeys: {
          baseline: 'overpayments.withoutOverpayments',
          scenario: 'overpayments.withOverpayments',
        },
      }));
    });

    const largestScenarioValue = Math.max(
      ...capturedLineProps!.data2.map((point: Record<string, number>) => point.value),
    );

    expect(largestScenarioValue).toBeGreaterThan(
      Math.max(...capturedLineProps!.data.map((point: Record<string, number>) => point.value)),
    );
    expect(capturedLineProps!.maxValue).toBeGreaterThan(largestScenarioValue);
  });

  it('terminates a paid-off scenario early instead of padding a false plateau', () => {
    // The overpayment scenario pays off at month 60 (its array is only 61 long),
    // while the baseline runs the full 120 months. The shorter series must stop at
    // its real end, not get stretched to the baseline length by repeating its last
    // value — which would draw a long flat line sitting at zero.
    const baseline = Array.from({ length: 121 }, (_, index) => Math.max(0, 300000 - (index * 2400)));
    const scenario = Array.from({ length: 61 }, (_, index) => Math.max(0, 300000 - (index * 5000)));

    act(() => {
      create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: scenario,
        baselineRemaining: baseline,
        currency: 'GBP',
        comparisonLabelKeys: {
          baseline: 'overpayments.withoutOverpayments',
          scenario: 'overpayments.withOverpayments',
        },
      }));
    });

    const baselineData = capturedLineProps?.data as Array<{ value: number }>;
    const scenarioData = capturedLineProps?.data2 as Array<{ value: number }>;

    // Scenario ends earlier than the baseline timeline.
    expect(scenarioData.length).toBeLessThan(baselineData.length);
    // It reaches zero and stops there — no repeated trailing plateau.
    expect(scenarioData[scenarioData.length - 1].value).toBe(0);
    const values = scenarioData.map(point => point.value);
    const hasConsecutiveDuplicate = values.some((value, index) => index > 0 && value === values[index - 1]);
    expect(hasConsecutiveDuplicate).toBe(false);
  });

  it('draws a single scenario line in the primary colour with no comparison legend', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(MortgageBalanceChart, {
        scenarioRemaining: buildSeries(121, 1200),
        currency: 'GBP',
      }));
    });

    expect(capturedLineProps?.data2).toBeUndefined();
    expect(capturedLineProps?.color).toBe(colours.primary);
    // No comparison labels were supplied, so no legend rows should be rendered.
    const legendKeys = renderer.root.findAll(node => (
      textContent(node).startsWith('overpayments.')
    ));
    expect(legendKeys).toHaveLength(0);
  });
});
