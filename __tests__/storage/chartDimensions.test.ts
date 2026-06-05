import { describe, expect, it } from '@jest/globals';
import { getProjectionChartLayout } from '../../src/components/charts/dimensions';

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
});
