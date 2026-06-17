import { storage } from '@/shared/lib/storage/mmkv';

const INTERSTITIAL_STORAGE_KEYS = {
  LAST_SHOWN_AT: 'ad_interstitial_last_shown_at_v1',
  CALCULATIONS_SINCE_LAST: 'ad_interstitial_calculations_since_last_v1',
} as const;

export const INTERSTITIAL_MIN_CALCULATIONS = 3;
export const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;

export interface InterstitialPolicyState {
  calculationsSinceLastInterstitial: number;
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
    INTERSTITIAL_STORAGE_KEYS.CALCULATIONS_SINCE_LAST,
    String(state.calculationsSinceLastInterstitial),
  );

  if (state.lastShownAt === null) {
    storage.remove(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT);
    return;
  }

  storage.set(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT, String(state.lastShownAt));
};

export const loadInterstitialPolicyState = (): InterstitialPolicyState => ({
  calculationsSinceLastInterstitial: toNonNegativeInteger(
    storage.getString(INTERSTITIAL_STORAGE_KEYS.CALCULATIONS_SINCE_LAST),
  ),
  lastShownAt: toTimestamp(storage.getString(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT)),
});

export const isInterstitialEligible = (
  state: InterstitialPolicyState,
  now = Date.now(),
): boolean => {
  if (state.calculationsSinceLastInterstitial < INTERSTITIAL_MIN_CALCULATIONS) {
    return false;
  }

  if (state.lastShownAt === null) {
    return true;
  }

  return now - state.lastShownAt >= INTERSTITIAL_COOLDOWN_MS;
};

export const recordInterstitialCalculation = (): InterstitialPolicyState => {
  const state = loadInterstitialPolicyState();
  const nextState: InterstitialPolicyState = {
    ...state,
    calculationsSinceLastInterstitial: state.calculationsSinceLastInterstitial + 1,
  };

  persistState(nextState);
  return nextState;
};

export const markInterstitialShown = (shownAt = Date.now()): InterstitialPolicyState => {
  const nextState: InterstitialPolicyState = {
    calculationsSinceLastInterstitial: 0,
    lastShownAt: shownAt,
  };

  persistState(nextState);
  return nextState;
};

export const resetInterstitialPolicy = (): void => {
  storage.remove(INTERSTITIAL_STORAGE_KEYS.CALCULATIONS_SINCE_LAST);
  storage.remove(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT);
};
