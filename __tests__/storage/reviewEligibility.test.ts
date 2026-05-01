import { describe, expect, it } from '@jest/globals';
import { canRequestReview } from '../../src/review/eligibility';

const baseInput = {
  appOpens: 3,
  usefulActions: 2,
  hasReviewed: false,
  lastRequestAt: 0,
  now: Date.UTC(2026, 4, 1),
  hasStoreAction: true,
};

describe('review eligibility', () => {
  it('allows eligible users who have not been prompted before', () => {
    expect(canRequestReview(baseInput)).toBe(true);
  });

  it('requires enough app opens and useful actions', () => {
    expect(canRequestReview({ ...baseInput, appOpens: 2 })).toBe(false);
    expect(canRequestReview({ ...baseInput, usefulActions: 1 })).toBe(false);
  });

  it('blocks unavailable store actions and already reviewed users', () => {
    expect(canRequestReview({ ...baseInput, hasStoreAction: false })).toBe(false);
    expect(canRequestReview({ ...baseInput, hasReviewed: true })).toBe(false);
  });

  it('enforces the cooldown after a prior prompt', () => {
    const oneDay = 24 * 60 * 60 * 1000;
    expect(canRequestReview({
      ...baseInput,
      lastRequestAt: baseInput.now - 29 * oneDay,
    })).toBe(false);
    expect(canRequestReview({
      ...baseInput,
      lastRequestAt: baseInput.now - 30 * oneDay,
    })).toBe(true);
  });
});
