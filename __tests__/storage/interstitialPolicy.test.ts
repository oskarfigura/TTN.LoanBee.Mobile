import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_MIN_ACTIONS,
  isInterstitialEligible,
  loadInterstitialPolicyState,
  markInterstitialShown,
  recordInterstitialAction,
  resetInterstitialPolicy,
} from '@/ads/interstitialPolicy';

describe('interstitialPolicy', () => {
  beforeEach(() => {
    resetInterstitialPolicy();
  });

  test('requires several actions before showing', () => {
    for (let count = 1; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
      const state = recordInterstitialAction();
      expect(isInterstitialEligible(state)).toBe(false);
    }

    const eligibleState = recordInterstitialAction();
    expect(eligibleState.actionsSinceLastInterstitial).toBe(INTERSTITIAL_MIN_ACTIONS);
    expect(isInterstitialEligible(eligibleState)).toBe(true);
  });

  test('resets the counter and applies a cooldown after showing', () => {
    for (let count = 0; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
      recordInterstitialAction();
    }

    const shownAt = 1_700_000_000_000;
    const shownState = markInterstitialShown(shownAt);
    expect(shownState.actionsSinceLastInterstitial).toBe(0);
    expect(shownState.lastShownAt).toBe(shownAt);
    expect(loadInterstitialPolicyState()).toEqual(shownState);

    for (let count = 0; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
      recordInterstitialAction();
    }

    const cooldownState = loadInterstitialPolicyState();
    expect(isInterstitialEligible(cooldownState, shownAt + INTERSTITIAL_COOLDOWN_MS - 1)).toBe(false);
    expect(isInterstitialEligible(cooldownState, shownAt + INTERSTITIAL_COOLDOWN_MS)).toBe(true);
  });
});
