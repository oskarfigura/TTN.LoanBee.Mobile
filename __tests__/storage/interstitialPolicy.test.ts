import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_GRACE_ACTIONS,
  INTERSTITIAL_GRACE_PERIOD_MS,
  INTERSTITIAL_MAX_PER_DAY,
  INTERSTITIAL_MIN_ACTIONS,
  isInterstitialEligible,
  loadInterstitialPolicyState,
  markInterstitialShown,
  recordInterstitialAction,
  resetInterstitialPolicy,
} from '@/ads/interstitialPolicy';

// A fixed epoch anchor for deterministic time-based assertions.
const START = 1_700_000_000_000;
// A time strictly after the new-user grace window has elapsed.
const AFTER_GRACE = START + INTERSTITIAL_GRACE_PERIOD_MS + 1;

describe('interstitialPolicy', () => {
  beforeEach(() => {
    resetInterstitialPolicy();
  });

  // The grace-by-engagement test below relies on MIN_ACTIONS being reachable
  // while still inside the lifetime grace window, so guard that invariant.
  test('action threshold sits below the grace engagement threshold', () => {
    expect(INTERSTITIAL_MIN_ACTIONS).toBeLessThan(INTERSTITIAL_GRACE_ACTIONS);
  });

  describe('new-user grace period', () => {
    test('does not show until the user is established, even with enough actions', () => {
      for (let count = 0; count < INTERSTITIAL_GRACE_ACTIONS + 2; count += 1) {
        recordInterstitialAction(START);
      }

      // Plenty of actions, but no time has elapsed since first use.
      expect(isInterstitialEligible(loadInterstitialPolicyState(), START)).toBe(false);

      // Once the time window has passed, the established user becomes eligible.
      expect(isInterstitialEligible(loadInterstitialPolicyState(), AFTER_GRACE)).toBe(true);
    });

    test('still suppresses after the time window when engagement is too low', () => {
      for (let count = 0; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
        recordInterstitialAction(START);
      }

      const state = loadInterstitialPolicyState();
      // Enough actions to clear the per-interstitial threshold...
      expect(state.actionsSinceLastInterstitial).toBe(INTERSTITIAL_MIN_ACTIONS);
      // ...but fewer than GRACE_ACTIONS lifetime, so grace still applies.
      expect(isInterstitialEligible(state, AFTER_GRACE)).toBe(false);

      // One more lifetime action crosses the engagement grace threshold.
      recordInterstitialAction(START);
      expect(isInterstitialEligible(loadInterstitialPolicyState(), AFTER_GRACE)).toBe(true);
    });
  });

  test('requires several actions between interstitials', () => {
    // Get the user past the grace period first.
    for (let count = 0; count < INTERSTITIAL_GRACE_ACTIONS; count += 1) {
      recordInterstitialAction(START);
    }
    markInterstitialShown(AFTER_GRACE);

    const after = AFTER_GRACE + INTERSTITIAL_COOLDOWN_MS + 1;
    for (let count = 1; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
      recordInterstitialAction(after);
      expect(isInterstitialEligible(loadInterstitialPolicyState(), after)).toBe(false);
    }

    recordInterstitialAction(after);
    const eligible = loadInterstitialPolicyState();
    expect(eligible.actionsSinceLastInterstitial).toBe(INTERSTITIAL_MIN_ACTIONS);
    expect(isInterstitialEligible(eligible, after)).toBe(true);
  });

  test('resets the counter and applies a cooldown after showing', () => {
    for (let count = 0; count < INTERSTITIAL_GRACE_ACTIONS; count += 1) {
      recordInterstitialAction(START);
    }

    const shownState = markInterstitialShown(AFTER_GRACE);
    expect(shownState.actionsSinceLastInterstitial).toBe(0);
    expect(shownState.lastShownAt).toBe(AFTER_GRACE);
    expect(shownState.shownToday).toBe(1);
    expect(loadInterstitialPolicyState()).toEqual(shownState);

    for (let count = 0; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
      recordInterstitialAction(AFTER_GRACE);
    }

    const cooldownState = loadInterstitialPolicyState();
    expect(isInterstitialEligible(cooldownState, AFTER_GRACE + INTERSTITIAL_COOLDOWN_MS - 1)).toBe(false);
    expect(isInterstitialEligible(cooldownState, AFTER_GRACE + INTERSTITIAL_COOLDOWN_MS)).toBe(true);
  });

  test('caps interstitials per day and resets the next day', () => {
    for (let count = 0; count < INTERSTITIAL_GRACE_ACTIONS; count += 1) {
      recordInterstitialAction(START);
    }

    let now = AFTER_GRACE;
    for (let shown = 0; shown < INTERSTITIAL_MAX_PER_DAY; shown += 1) {
      for (let count = 0; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
        recordInterstitialAction(now);
      }
      expect(isInterstitialEligible(loadInterstitialPolicyState(), now)).toBe(true);
      markInterstitialShown(now);
      // Advance past the cooldown but stay within the same calendar day.
      now += INTERSTITIAL_COOLDOWN_MS + 1;
    }

    // The daily ceiling is now reached: actions + cooldown satisfied, still blocked.
    for (let count = 0; count < INTERSTITIAL_MIN_ACTIONS; count += 1) {
      recordInterstitialAction(now);
    }
    expect(isInterstitialEligible(loadInterstitialPolicyState(), now)).toBe(false);

    // A day later, the counter rolls over and the user is eligible again.
    const nextDay = now + INTERSTITIAL_GRACE_PERIOD_MS;
    expect(isInterstitialEligible(loadInterstitialPolicyState(), nextDay)).toBe(true);
  });
});
