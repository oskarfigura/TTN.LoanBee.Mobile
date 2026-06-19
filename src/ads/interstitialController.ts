import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { whenConsentFlowComplete } from '@/shared/lib/services/onboarding/firstRunGate';
import { AD_UNITS } from './adUnits';
import { ADS_ENABLED } from './adsConfig';
import { shouldRequestNonPersonalizedAds } from './consentState';
import {
  isInterstitialEligible,
  loadInterstitialPolicyState,
  markInterstitialShown,
} from './interstitialPolicy';

// A single, app-wide interstitial instance shared by every trigger:
//  - the route-based InterstitialGate (shows at a calm "break" tab), and
//  - imperative action triggers such as CSV export.
// Keeping one instance avoids loading/requesting two ads in parallel and lets the
// frequency policy (grace, cooldown, daily cap) coordinate every trigger through
// the same persisted state.

let ad: InterstitialAd | null = null;
let isLoaded = false;
let isLoading = false;
let initialised = false;

const ensureLoaded = (): void => {
  if (!ad || isLoaded || isLoading) {
    return;
  }
  isLoading = true;
  ad.load();
};

// Idempotent. Creates the ad — capturing the personalisation flag — once the
// consent flow has resolved, so the request reflects the user's actual choice.
export const initInterstitial = (): void => {
  if (!ADS_ENABLED || initialised) {
    return;
  }
  initialised = true;

  whenConsentFlowComplete().then(() => {
    ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
      requestNonPersonalizedAdsOnly: shouldRequestNonPersonalizedAds(),
    });

    ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoading = false;
      isLoaded = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      isLoaded = false;
      isLoading = false;
      ensureLoaded();
    });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      isLoading = false;
      isLoaded = false;
    });

    ensureLoaded();
  });
};

// Pre-load ahead of an anticipated trigger so the ad is ready when it fires.
export const primeInterstitial = (): void => ensureLoaded();

// How long a forced trigger waits for an unloaded ad before giving up, so a
// premium action still gets its ad without ever blocking the feature forever.
const FORCE_LOAD_TIMEOUT_MS = 5000;

export interface PresentInterstitialOptions {
  // Bypass the frequency policy (grace period, cooldown, daily cap). Used for
  // premium features that are gated behind an ad — e.g. CSV export — where the
  // ad is the price of the feature, not an opportunistic interruption. The ad
  // still has to load: if it isn't ready we wait briefly, then proceed without
  // it rather than block the feature. (When PRO mode lands, PRO users skip this.)
  force?: boolean;
}

// Resolve once the ad is loaded, or false on error/timeout.
const waitForLoad = (timeoutMs: number): Promise<boolean> =>
  new Promise(resolve => {
    if (!ad || isLoaded) {
      resolve(isLoaded);
      return;
    }
    ensureLoaded();

    let done = false;
    const finish = (ok: boolean) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      unsubscribeLoaded();
      unsubscribeError();
      resolve(ok);
    };
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => finish(true));
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => finish(false));
    const timer = setTimeout(() => finish(false), timeoutMs);
  });

// Show the already-loaded ad. Resolves true when it is shown (on close), false
// on any error. Records the show so the frequency policy spaces out later ads.
const showLoadedAd = (): Promise<boolean> =>
  new Promise(resolve => {
    if (!ad) {
      resolve(false);
      return;
    }

    let settled = false;
    let unsubscribe = () => {};
    const finish = (shown: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      resolve(shown);
    };

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(true));
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => finish(false));
    unsubscribe = () => {
      unsubscribeClosed();
      unsubscribeError();
    };

    try {
      ad.show();
      markInterstitialShown();
      isLoaded = false;
    } catch {
      ensureLoaded();
      finish(false);
    }
  });

// Show an interstitial. ALWAYS resolves so callers can gate an action on it
// without ever blocking the feature; resolves `true` only when an ad was shown.
//  - Default: shows only if loaded AND the frequency policy permits (used by the
//    route-based break trigger).
//  - `force: true`: bypasses the frequency policy for premium gates (CSV export),
//    waiting briefly for a load if needed.
export const presentInterstitial = async (
  options: PresentInterstitialOptions = {},
): Promise<boolean> => {
  if (!ADS_ENABLED || !ad) {
    return false;
  }

  if (options.force) {
    const ready = await waitForLoad(FORCE_LOAD_TIMEOUT_MS);
    if (!ready) {
      return false;
    }
    return showLoadedAd();
  }

  if (!isLoaded || !isInterstitialEligible(loadInterstitialPolicyState())) {
    return false;
  }
  return showLoadedAd();
};
