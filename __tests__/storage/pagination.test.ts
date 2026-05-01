import { describe, expect, it } from '@jest/globals';
import { clampPage, getPaginationWindow } from '../../src/components/calculator/pagination';

describe('amortisation pagination helpers', () => {
  it('clamps pages into the available range', () => {
    expect(clampPage(-4, 10)).toBe(0);
    expect(clampPage(4, 10)).toBe(4);
    expect(clampPage(22, 10)).toBe(9);
    expect(clampPage(0, 0)).toBe(0);
  });

  it('keeps the first window anchored at the start', () => {
    expect(getPaginationWindow(0, 20, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('centres the window for middle pages', () => {
    expect(getPaginationWindow(10, 20, 5)).toEqual([8, 9, 10, 11, 12]);
  });

  it('keeps the final window anchored at the end', () => {
    expect(getPaginationWindow(19, 20, 5)).toEqual([15, 16, 17, 18, 19]);
  });
});
