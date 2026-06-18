import { describe, expect, it } from '@jest/globals';
import { getNiceChartMaxValue, getProjectionChartLayout } from '@/shared/ui/charts/dimensions';

describe('getProjectionChartLayout', () => {
  it('fits the viewport without scrolling when content is short', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 3,
      perPointWidth: 32,
      edgeSpacing: 24,
    });

    expect(layout.viewportWidth).toBe(294);
    expect(layout.scrollEnabled).toBe(false);
    expect(layout.chartWidth).toBe(294);
  });

  it('widens the chart and enables scroll when the timeline overflows', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 25,
      perPointWidth: 32,
      edgeSpacing: 24,
    });

    expect(layout.scrollEnabled).toBe(true);
    expect(layout.chartWidth).toBe(25 * 32 + 24);
    expect(layout.chartWidth).toBeGreaterThan(layout.viewportWidth);
  });

  it('falls back to the minimum viewport before measurement', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 0,
      pointCount: 5,
      perPointWidth: 32,
      edgeSpacing: 24,
    });

    expect(layout.viewportWidth).toBe(220);
  });

  it('reports the natural spacing when not fitting to width', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 25,
      perPointWidth: 32,
      edgeSpacing: 24,
    });

    expect(layout.pointSpacing).toBe(32);
    expect(layout.scrollEnabled).toBe(true);
  });

  it('fitToWidth condenses a long timeline into the viewport without scrolling', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 25,
      perPointWidth: 44,
      edgeSpacing: 16,
      fitToWidth: true,
    });

    // viewport = 360 - 66 = 294; spacing floored to fit all 25 points + edges.
    const expectedSpacing = Math.floor((294 - 16) / 25);
    expect(layout.viewportWidth).toBe(294);
    expect(layout.pointSpacing).toBe(expectedSpacing);
    expect(layout.scrollEnabled).toBe(false);
    // chartWidth equals the points' own spacing-derived span (not the wider viewport),
    // so gifted-charts maps the line across the same width as the axis.
    expect(layout.chartWidth).toBe(25 * expectedSpacing + 16);
    expect(layout.chartWidth).toBeLessThanOrEqual(294);
  });

  it('fitToWidth sizes line charts from intervals so the final point reaches the chart edge', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 18,
      perPointWidth: 44,
      edgeSpacing: 35,
      fitToWidth: true,
      spacingMode: 'intervals',
    });

    // Line charts have 17 intervals between 18 points, not 18 point slots.
    const expectedSpacing = Math.floor((294 - 35) / 17);
    expect(layout.viewportWidth).toBe(294);
    expect(layout.pointSpacing).toBe(expectedSpacing);
    expect(layout.scrollEnabled).toBe(false);
    expect(layout.chartWidth).toBe(17 * expectedSpacing + 35);
    expect(layout.chartWidth).toBeLessThanOrEqual(294);
  });

  it('fitToWidth fills the available viewport so the series spans the full width', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 18,
      perPointWidth: 44,
      edgeSpacing: 35,
      fitToWidth: true,
      spacingMode: 'intervals',
      fillAvailableWidth: true,
    });

    // Spacing is distributed exactly (not floored) so the 17 intervals plus the edge pad
    // span the whole viewport — the final point reaches the trailing edge margin instead
    // of stopping short under empty gridlines.
    const expectedSpacing = (294 - 35) / 17;
    expect(layout.viewportWidth).toBe(294);
    expect(layout.pointSpacing).toBeCloseTo(expectedSpacing);
    expect(layout.scrollEnabled).toBe(false);
    expect(layout.chartWidth).toBe(294);
    // The plotted span (intervals + edge pad) exactly fills the viewport width.
    expect(17 * layout.pointSpacing + 35).toBeCloseTo(294);
  });

  it('fitToWidth fill stretches a short timeline to occupy the full width', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 4,
      perPointWidth: 44,
      edgeSpacing: 20,
      fitToWidth: true,
      spacingMode: 'intervals',
      fillAvailableWidth: true,
    });

    // Without fill, a short series caps at perPointWidth (44) and leaves a wide gap; with
    // fill the 3 intervals stretch past 44 so the curve still reaches the trailing edge.
    expect(layout.scrollEnabled).toBe(false);
    expect(layout.chartWidth).toBe(294);
    expect(layout.pointSpacing).toBeGreaterThan(44);
    expect(3 * layout.pointSpacing + 20).toBeCloseTo(294);
  });

  it('fills a wide viewport for a non-fitted chart that does not need to scroll', () => {
    // The fullscreen modal renders charts in scroll mode (fitToWidth false). A short loan
    // on a tablet (or in landscape) fits without scrolling, so the series must still stretch
    // to fill the width instead of hugging the left under empty trailing gridlines.
    const layout = getProjectionChartLayout({
      containerWidth: 1024,
      pointCount: 5,
      perPointWidth: 44,
      edgeSpacing: 20,
      spacingMode: 'intervals',
      fillAvailableWidth: true,
    });

    expect(layout.viewportWidth).toBe(958);
    expect(layout.scrollEnabled).toBe(false);
    expect(layout.chartWidth).toBe(958);
    // 4 intervals stretch well past the natural 44px so the final point reaches the edge.
    expect(layout.pointSpacing).toBeGreaterThan(44);
    expect(4 * layout.pointSpacing + 20).toBeCloseTo(958);
  });

  it('still scrolls a non-fitted long timeline instead of compressing it to fill', () => {
    // The fill redistribution must never collapse a scrollable chart: a long timeline still
    // overflows and scrolls at its natural per-point spacing.
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 30,
      perPointWidth: 44,
      edgeSpacing: 20,
      spacingMode: 'intervals',
      fillAvailableWidth: true,
    });

    expect(layout.scrollEnabled).toBe(true);
    expect(layout.pointSpacing).toBe(44);
    expect(layout.chartWidth).toBe(29 * 44 + 20);
  });

  it('fitToWidth never stretches a short timeline past its natural spacing', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 3,
      perPointWidth: 44,
      edgeSpacing: 16,
      fitToWidth: true,
    });

    expect(layout.pointSpacing).toBe(44);
    expect(layout.scrollEnabled).toBe(false);
  });

  it('fitToWidth still scrolls once spacing would drop below the legible floor', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 60,
      perPointWidth: 44,
      edgeSpacing: 16,
      fitToWidth: true,
      minPerPointWidth: 10,
    });

    // 60 points can't fit 294px even at the floor, so it pins to the floor and scrolls.
    expect(layout.pointSpacing).toBe(10);
    expect(layout.scrollEnabled).toBe(true);
    expect(layout.chartWidth).toBe(60 * 10 + 16);
  });

  it('rounds a chart max above the largest plotted value', () => {
    expect(getNiceChartMaxValue([10000, 246000, 51000], 4)).toBeGreaterThan(246000);
  });

  it('does not jump to a much larger y-axis band near a round threshold', () => {
    expect(getNiceChartMaxValue([360000], 4)).toBe(400000);
  });
});

describe('getNiceChartMaxValue edge cases', () => {
  it('falls back to the section count when every value is zero', () => {
    expect(getNiceChartMaxValue([0, 0, 0], 4)).toBe(4);
  });

  it('falls back to the section count when every value is negative', () => {
    expect(getNiceChartMaxValue([-100, -5000], 4)).toBe(4);
  });

  it('scales from the positive maximum when values are mixed sign', () => {
    expect(getNiceChartMaxValue([-5000, 100000], 4)).toBeGreaterThanOrEqual(100000);
  });

  it('ignores non-finite values when finding the maximum', () => {
    const fromMixed = getNiceChartMaxValue([Number.NaN, Number.POSITIVE_INFINITY, 1000], 4);
    expect(fromMixed).toBe(getNiceChartMaxValue([1000], 4));
    expect(Number.isFinite(fromMixed)).toBe(true);
  });

  it('returns a positive axis even for tiny sub-unit values', () => {
    expect(getNiceChartMaxValue([0.3], 4)).toBeGreaterThanOrEqual(0.3);
  });
});

describe('getProjectionChartLayout edge cases', () => {
  it('handles an empty timeline without scrolling or NaN', () => {
    const layout = getProjectionChartLayout({
      containerWidth: 360,
      pointCount: 0,
      perPointWidth: 44,
      edgeSpacing: 16,
      fitToWidth: true,
    });

    expect(layout.scrollEnabled).toBe(false);
    expect(Number.isFinite(layout.chartWidth)).toBe(true);
    expect(Number.isFinite(layout.pointSpacing)).toBe(true);
  });

  it('falls back to the minimum viewport for a negative container width', () => {
    const layout = getProjectionChartLayout({
      containerWidth: -200,
      pointCount: 10,
      perPointWidth: 44,
      edgeSpacing: 16,
    });

    expect(layout.viewportWidth).toBe(220);
  });
});
