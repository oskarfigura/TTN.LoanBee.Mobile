import { storage } from '@/shared/lib/storage/mmkv';

const INTERSTITIAL_STORAGE_KEYS = {
  LAST_SHOWN_AT: 'ad_interstitial_last_shown_at_v1',
  ACTIONS_SINCE_LAST: 'ad_interstitial_actions_since_last_v1',
} as const;

// An "action" is any meaningful engagement — running a calculation OR working
// in the tracker (opening a saved loan, editing a deal, recording an
// overpayment). Counting tracker activity too means users who never run a fresh
// calculation still progress toward an interstitial, without showing more ads to
// any single user: the cooldown below still caps real frequency.
export const INTERSTITIAL_MIN_ACTIONS = 3;
export const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;

export interface InterstitialPolicyState {
  actionsSinceLastInterstitial: number;
  lastShownAt: number | null;
}

const toNonNegativeInteger = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

const toTimestamp = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const persistState = (state: InterstitialPolicyState): void => {
  storage.set(
    INTERSTITIAL_STORAGE_KEYS.ACTIONS_SINCE_LAST,
    String(state.actionsSinceLastInterstitial),
  );

  if (state.lastShownAt === null) {
    storage.remove(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT);
    return;
  }

  storage.set(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT, String(state.lastShownAt));
};

export const loadInterstitialPolicyState = (): InterstitialPolicyState => ({
  actionsSinceLastInterstitial: toNonNegativeInteger(
    storage.getString(INTERSTITIAL_STORAGE_KEYS.ACTIONS_SINCE_LAST),
  ),
  lastShownAt: toTimestamp(storage.getString(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT)),
});

export const isInterstitialEligible = (
  state: InterstitialPolicyState,
  now = Date.now(),
): boolean => {
  if (state.actionsSinceLastInterstitial < INTERSTITIAL_MIN_ACTIONS) {
    return false;
  }

  if (state.lastShownAt === null) {
    return true;
  }

  return now - state.lastShownAt >= INTERSTITIAL_COOLDOWN_MS;
};

export const recordInterstitialAction = (): InterstitialPolicyState => {
  const state = loadInterstitialPolicyState();
  const nextState: InterstitialPolicyState = {
    ...state,
    actionsSinceLastInterstitial: state.actionsSinceLastInterstitial + 1,
  };

  persistState(nextState);
  return nextState;
};

export const markInterstitialShown = (shownAt = Date.now()): InterstitialPolicyState => {
  const nextState: InterstitialPolicyState = {
    actionsSinceLastInterstitial: 0,
    lastShownAt: shownAt,
  };

  persistState(nextState);
  return nextState;
};

export const resetInterstitialPolicy = (): void => {
  storage.remove(INTERSTITIAL_STORAGE_KEYS.ACTIONS_SINCE_LAST);
  storage.remove(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT);
};
