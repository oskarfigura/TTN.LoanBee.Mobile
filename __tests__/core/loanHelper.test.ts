import { describe, it, expect } from '@jest/globals';
import {
  nFormatter,
  numberWithCommas,
  getBaseLog,
  getOverallTermInMonths,
  getLoanEndDate,
  convertToWholeNumber,
} from '../../src/core/loanHelper';

describe('nFormatter', () => {
  it('formats thousands with k suffix', () => {
    expect(nFormatter(1500, 1)).toBe('1.5k');
  });

  it('formats millions with M suffix', () => {
    expect(nFormatter(1000000, 2)).toBe('1M');
  });

  it('formats value below 1000 with no suffix', () => {
    expect(nFormatter(999, 1)).toBe('999');
  });

  it('returns 0 for zero input', () => {
    expect(nFormatter(0, 1)).toBe('0');
  });

  it('formats billions with B suffix', () => {
    expect(nFormatter(2500000000, 1)).toBe('2.5B');
  });

  it('trims trailing zeros after decimal', () => {
    expect(nFormatter(2000, 2)).toBe('2k');
  });
});

describe('numberWithCommas', () => {
  it('adds comma separator for thousands', () => {
    expect(numberWithCommas('1000')).toBe('1,000');
  });

  it('adds comma separators for millions', () => {
    expect(numberWithCommas('1000000')).toBe('1,000,000');
  });

  it('does not modify values below 1000', () => {
    expect(numberWithCommas('999')).toBe('999');
  });

  it('handles already-formatted numbers correctly', () => {
    expect(numberWithCommas('12345')).toBe('12,345');
  });
});

describe('getBaseLog', () => {
  it('calculates log base 2 of 8', () => {
    expect(getBaseLog(2, 8)).toBeCloseTo(3, 10);
  });

  it('calculates log base 10 of 100', () => {
    expect(getBaseLog(10, 100)).toBeCloseTo(2, 10);
  });

  it('calculates log base 10 of 1000', () => {
    expect(getBaseLog(10, 1000)).toBeCloseTo(3, 10);
  });
});

describe('getOverallTermInMonths', () => {
  it('converts years and months to total months', () => {
    expect(getOverallTermInMonths(10, 6)).toBe(126);
  });

  it('handles zero years', () => {
    expect(getOverallTermInMonths(0, 6)).toBe(6);
  });

  it('handles zero months', () => {
    expect(getOverallTermInMonths(5, 0)).toBe(60);
  });

  it('handles both zero', () => {
    expect(getOverallTermInMonths(0, 0)).toBe(0);
  });

  it('calculates 10 years exactly', () => {
    expect(getOverallTermInMonths(10, 0)).toBe(120);
  });
});

describe('getLoanEndDate', () => {
  it('adds 12 months to land in the following year', () => {
    const end = getLoanEndDate('2024-01-01', 1, 0);
    expect(end.getFullYear()).toBe(2025);
    expect(end.getMonth()).toBe(0);
  });

  it('adds 6 months correctly', () => {
    const end = getLoanEndDate('2024-01-01', 0, 6);
    expect(end.getMonth()).toBe(6);
    expect(end.getFullYear()).toBe(2024);
  });

  it('adds mixed years and months', () => {
    const end = getLoanEndDate('2024-01-01', 2, 3);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3);
  });
});

describe('convertToWholeNumber', () => {
  it('converts numeric string to number', () => {
    expect(convertToWholeNumber('3.5')).toBe(3.5);
  });

  it('converts integer string to number', () => {
    expect(convertToWholeNumber('42')).toBe(42);
  });

  it('returns 0 for non-numeric string', () => {
    expect(convertToWholeNumber('abc')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(convertToWholeNumber('')).toBe(0);
  });

  it('passes through a numeric value unchanged', () => {
    expect(convertToWholeNumber(42)).toBe(42);
  });

  it('passes through a decimal numeric value unchanged', () => {
    expect(convertToWholeNumber(3.14)).toBe(3.14);
  });
});
