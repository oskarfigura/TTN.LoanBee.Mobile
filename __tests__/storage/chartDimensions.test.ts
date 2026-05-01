import { describe, expect, it } from '@jest/globals';
import { getProjectionChartWidth } from '../../src/components/charts/dimensions';

describe('projection chart dimensions', () => {
  it('uses a safe fallback before layout has measured', () => {
    expect(getProjectionChartWidth(0)).toBe(220);
    expect(getProjectionChartWidth(Number.NaN)).toBe(220);
  });

  it('accounts for axis and edge space on normal cards', () => {
    expect(getProjectionChartWidth(360)).toBe(294);
  });

  it('keeps a scrollable minimum for narrow containers', () => {
    expect(getProjectionChartWidth(240)).toBe(220);
  });
});
