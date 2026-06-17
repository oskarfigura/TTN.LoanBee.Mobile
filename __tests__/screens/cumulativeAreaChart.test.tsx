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

import { CumulativeAreaChart, hasCumulativeChartData } from '@/shared/ui/charts/CumulativeAreaChart';

const buildArrays = (months = 216) => ({
  monthly: Array.from({ length: months }, (_, index) => index * 1200),
  interest: Array.from({ length: months }, (_, index) => index * 250),
  remaining: Array.from({ length: months }, (_, index) => Math.max(0, 140000 - (index * 400))),
});

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

describe('CumulativeAreaChart', () => {
  it('scales the y-axis from all cumulative payment series', () => {
    const { monthly, interest, remaining } = buildArrays();

    act(() => {
      create(React.createElement(CumulativeAreaChart, {
        monthlyArray: monthly,
        interestArray: interest,
        remainingArray: remaining,
        currency: 'GBP',
      }));
    });

    const allValues = [
      ...capturedLineProps!.data,
      ...capturedLineProps!.data2,
      ...capturedLineProps!.data3,
    ].map((point: Record<string, number>) => point.value);

    expect(Math.max(...capturedLineProps!.data2.map((point: Record<string, number>) => point.value)))
      .toBeGreaterThan(Math.max(...capturedLineProps!.data.map((point: Record<string, number>) => point.value)));
    expect(capturedLineProps!.maxValue).toBeGreaterThan(Math.max(...allValues));
  });

  it('fills the fitted viewport width by stretching the data spacing exactly', () => {
    const { monthly, interest, remaining } = buildArrays();
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(React.createElement(CumulativeAreaChart, {
        monthlyArray: monthly,
        interestArray: interest,
        remainingArray: remaining,
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

    // Edge spacing is INITIAL_SPACING (8) + END_SPACING (12) = 20. The 17 intervals are
    // distributed as an exact fraction (not floored) so they span the whole 294px width
    // instead of leaving the series short under empty trailing gridlines.
    const intervals = capturedLineProps!.data.length - 1;
    expect(capturedLineProps?.width).toBe(294);
    expect(capturedLineProps?.spacing).toBeCloseTo((294 - 20) / intervals);
    expect(intervals * capturedLineProps!.spacing + 20).toBeCloseTo(294);
    expect(capturedLineProps?.disableScroll).toBe(true);
  });

  it('stretches the series close to the right edge with only a small trailing pad', () => {
    const { monthly, interest, remaining } = buildArrays();
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(React.createElement(CumulativeAreaChart, {
        monthlyArray: monthly,
        interestArray: interest,
        remainingArray: remaining,
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

    const pointCount = capturedLineProps!.data.length;
    const lastPointX = capturedLineProps!.initialSpacing + (pointCount - 1) * capturedLineProps!.spacing;
    const trailingGap = capturedLineProps!.width - lastPointX;

    // The last plotted point must sit within roughly one spacing slot of the right
    // edge, so the data fills the card instead of stopping short under empty gridlines.
    expect(capturedLineProps!.endSpacing).toBeLessThanOrEqual(12);
    expect(trailingGap).toBeLessThanOrEqual(capturedLineProps!.spacing + capturedLineProps!.endSpacing);
    expect(lastPointX).toBeGreaterThan(capturedLineProps!.width * 0.9);
  });

  it('labels the cumulative timeline from the first completed year through the final year', () => {
    const { monthly, interest, remaining } = buildArrays();

    act(() => {
      create(React.createElement(CumulativeAreaChart, {
        monthlyArray: monthly,
        interestArray: interest,
        remainingArray: remaining,
        currency: 'GBP',
        fitToWidth: true,
      }));
    });

    const labels = capturedLineProps?.data
      .map((point: Record<string, any>) => point.labelComponent?.())
      .filter(Boolean)
      .map(textContent);

    expect(labels?.[0]).toBe('Yr 1');
    expect(labels).toContain('Yr 18');
  });

  it('maps the three series to remaining, total paid, and interest in that order', () => {
    const { monthly, interest, remaining } = buildArrays();

    act(() => {
      create(React.createElement(CumulativeAreaChart, {
        monthlyArray: monthly,
        interestArray: interest,
        remainingArray: remaining,
        currency: 'GBP',
      }));
    });

    // The first sampled point is the end of year one (index 11).
    expect(capturedLineProps?.data[0].value).toBe(remaining[11]);
    expect(capturedLineProps?.data2[0].value).toBe(monthly[11]);
    expect(capturedLineProps?.data3[0].value).toBe(interest[11]);
    expect(capturedLineProps?.color).toBeDefined();
    expect(capturedLineProps?.color2).toBeDefined();
    expect(capturedLineProps?.color3).toBeDefined();
  });

  it('draws the remaining-balance series down to zero for a fully repaid loan', () => {
    const monthly = Array.from({ length: 121 }, (_, index) => index * 900);
    const interest = Array.from({ length: 121 }, (_, index) => index * 150);
    const remaining = Array.from({ length: 121 }, (_, index) => Math.max(0, 120000 - (index * 1000)));

    act(() => {
      create(React.createElement(CumulativeAreaChart, {
        monthlyArray: monthly,
        interestArray: interest,
        remainingArray: remaining,
        currency: 'GBP',
      }));
    });

    const remainingSeries = capturedLineProps?.data as Array<{ value: number }>;
    expect(remainingSeries[remainingSeries.length - 1].value).toBe(0);
  });

  it('shows an empty state instead of a blank card when there is under a year of data', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(CumulativeAreaChart, {
        monthlyArray: Array.from({ length: 8 }, (_, index) => index * 1000),
        interestArray: Array.from({ length: 8 }, (_, index) => index * 200),
        remainingArray: Array.from({ length: 8 }, (_, index) => 8000 - (index * 1000)),
        currency: 'GBP',
      }));
    });

    expect(capturedLineProps).toBeNull();
    const rendered = renderer.root.findAll(node => textContent(node) === 'results.chartEmptyState');
    expect(rendered.length).toBeGreaterThan(0);
  });
});

describe('hasCumulativeChartData', () => {
  it('reports false below two yearly samples and true at or above the threshold', () => {
    // The chart renders an empty state until the timeline reaches index 12
    // (a 13-entry array), matching the empty-state test above.
    expect(hasCumulativeChartData(8)).toBe(false);
    expect(hasCumulativeChartData(12)).toBe(false);
    expect(hasCumulativeChartData(13)).toBe(true);
    expect(hasCumulativeChartData(216)).toBe(true);
  });
});
