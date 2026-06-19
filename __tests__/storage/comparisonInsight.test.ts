import { describe, expect, it } from '@jest/globals';
import { getComparisonInsight } from '@/shared/domain/loans/comparisonInsight';

describe('comparison insight', () => {
  it('reports when the compared option saves interest and time', () => {
    expect(getComparisonInsight({
      currentInterest: 100000,
      comparedInterest: 80000,
      currentMonths: 300,
      comparedMonths: 240,
    })).toEqual({
      winner: 'compared',
      interestSaved: 20000,
      monthsSaved: 60,
    });
  });

  it('reports the reverse when the current option is better', () => {
    expect(getComparisonInsight({
      currentInterest: 80000,
      comparedInterest: 100000,
      currentMonths: 240,
      comparedMonths: 300,
    })).toEqual({
      winner: 'current',
      interestSaved: 20000,
      monthsSaved: 60,
    });
  });

  it('ignores a one-month difference as rounding noise', () => {
    expect(getComparisonInsight({
      currentInterest: 100000,
      comparedInterest: 99900,
      currentMonths: 300,
      comparedMonths: 299,
    })).toBeNull();
  });

  it('surfaces a time saving from two months up', () => {
    expect(getComparisonInsight({
      currentInterest: 100000,
      comparedInterest: 99900,
      currentMonths: 300,
      comparedMonths: 298,
    })).toEqual({
      winner: 'compared',
      interestSaved: undefined,
      monthsSaved: 2,
    });
  });
});
