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
});
