import { storage } from '@/shared/lib/storage/mmkv';

const INTERSTITIAL_STORAGE_KEYS = {
  LAST_SHOWN_AT: 'ad_interstitial_last_shown_at_v1',
  ACTIONS_SINCE_LAST: 'ad_interstitial_actions_since_last_v1',
  LIFETIME_ACTIONS: 'ad_interstitial_lifetime_actions_v1',
  FIRST_ACTION_AT: 'ad_interstitial_first_action_at_v1',
  SHOWN_DAY: 'ad_interstitial_shown_day_v1',
  SHOWN_TODAY: 'ad_interstitial_shown_today_v1',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

// An "action" is any meaningful engagement — running a calculation OR working
// in the tracker (opening a saved loan, editing a deal, recording an
// overpayment). Counting tracker activity too means users who never run a fresh
// calculation still progress toward an interstitial, without showing more ads to
// any single user: the cooldown and daily cap below still bound real frequency.

// Actions required between two interstitials.
export const INTERSTITIAL_MIN_ACTIONS = 4;
// Minimum quiet period after an interstitial before another may show.
export const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;
// Hard ceiling on interstitials in a single (UTC) day, on top of the cooldown.
export const INTERSTITIAL_MAX_PER_DAY = 5;

// New-user grace period: brand-new users are the cohort most likely to churn on
// early ad exposure, so no interstitial is shown until the user is "established"
// — they must have BOTH engaged enough (lifetime actions) AND had the app long
// enough (time since first action). The conjunction protects a first-session
// power user (lots of actions, no time elapsed) and a long-tenured but barely
// active user (time elapsed, few actions) alike. Banners are unaffected.
export const INTERSTITIAL_GRACE_ACTIONS = 5;
export const INTERSTITIAL_GRACE_PERIOD_MS = DAY_MS;

export interface InterstitialPolicyState {
  actionsSinceLastInterstitial: number;
  lastShownAt: number | null;
  lifetimeActions: number;
  firstActionAt: number | null;
  shownDay: number | null;
  shownToday: number;
}

const dayBucket = (timestamp: number): number => Math.floor(timestamp / DAY_MS);

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

const writeNullableInt = (key: string, value: number | null): void => {
  if (value === null) {
    storage.remove(key);
    return;
  }

  storage.set(key, String(value));
};

const persistState = (state: InterstitialPolicyState): void => {
  storage.set(
    INTERSTITIAL_STORAGE_KEYS.ACTIONS_SINCE_LAST,
    String(state.actionsSinceLastInterstitial),
  );
  storage.set(
    INTERSTITIAL_STORAGE_KEYS.LIFETIME_ACTIONS,
    String(state.lifetimeActions),
  );
  storage.set(INTERSTITIAL_STORAGE_KEYS.SHOWN_TODAY, String(state.shownToday));

  writeNullableInt(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT, state.lastShownAt);
  writeNullableInt(INTERSTITIAL_STORAGE_KEYS.FIRST_ACTION_AT, state.firstActionAt);
  writeNullableInt(INTERSTITIAL_STORAGE_KEYS.SHOWN_DAY, state.shownDay);
};

export const loadInterstitialPolicyState = (): InterstitialPolicyState => ({
  actionsSinceLastInterstitial: toNonNegativeInteger(
    storage.getString(INTERSTITIAL_STORAGE_KEYS.ACTIONS_SINCE_LAST),
  ),
  lastShownAt: toTimestamp(storage.getString(INTERSTITIAL_STORAGE_KEYS.LAST_SHOWN_AT)),
  lifetimeActions: toNonNegativeInteger(
    storage.getString(INTERSTITIAL_STORAGE_KEYS.LIFETIME_ACTIONS),
  ),
  firstActionAt: toTimestamp(storage.getString(INTERSTITIAL_STORAGE_KEYS.FIRST_ACTION_AT)),
  shownDay: toTimestamp(storage.getString(INTERSTITIAL_STORAGE_KEYS.SHOWN_DAY)),
  shownToday: toNonNegativeInteger(storage.getString(INTERSTITIAL_STORAGE_KEYS.SHOWN_TODAY)),
});

const isInGracePeriod = (state: InterstitialPolicyState, now: number): boolean => {
  if (state.firstActionAt === null) {
    return true;
  }

  if (state.lifetimeActions < INTERSTITIAL_GRACE_ACTIONS) {
    return true;
  }

  return now - state.firstActionAt < INTERSTITIAL_GRACE_PERIOD_MS;
};

export const isInterstitialEligible = (
  state: InterstitialPolicyState,
  now = Date.now(),
): boolean => {
  // 1. Never interrupt brand-new users.
  if (isInGracePeriod(state, now)) {
    return false;
  }

  // 2. Respect the per-day ceiling (only counts shows from the current day).
  if (state.shownDay === dayBucket(now) && state.shownToday >= INTERSTITIAL_MAX_PER_DAY) {
    return false;
  }

  // 3. Require enough engagement since the last interstitial.
  if (state.actionsSinceLastInterstitial < INTERSTITIAL_MIN_ACTIONS) {
    return false;
  }

  // 4. Respect the cooldown between interstitials.
  if (state.lastShownAt === null) {
    return true;
  }

  return now - state.lastShownAt >= INTERSTITIAL_COOLDOWN_MS;
};

export const recordInterstitialAction = (now = Date.now()): InterstitialPolicyState => {
  const state = loadInterstitialPolicyState();
  const nextState: InterstitialPolicyState = {
    ...state,
    actionsSinceLastInterstitial: state.actionsSinceLastInterstitial + 1,
    lifetimeActions: state.lifetimeActions + 1,
    firstActionAt: state.firstActionAt ?? now,
  };

  persistState(nextState);
  return nextState;
};

export const markInterstitialShown = (shownAt = Date.now()): InterstitialPolicyState => {
  const state = loadInterstitialPolicyState();
  const day = dayBucket(shownAt);
  const isSameDay = state.shownDay === day;

  const nextState: InterstitialPolicyState = {
    actionsSinceLastInterstitial: 0,
    lastShownAt: shownAt,
    lifetimeActions: state.lifetimeActions,
    firstActionAt: state.firstActionAt,
    shownDay: day,
    shownToday: isSameDay ? state.shownToday + 1 : 1,
  };

  persistState(nextState);
  return nextState;
};

export const resetInterstitialPolicy = (): void => {
  Object.values(INTERSTITIAL_STORAGE_KEYS).forEach(key => storage.remove(key));
};
