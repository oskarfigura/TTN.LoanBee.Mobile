import { useGlobalSearchParams, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { whenConsentFlowComplete } from '@/shared/lib/services/onboarding/firstRunGate';
import { AD_UNITS } from './adUnits';
import { shouldRequestNonPersonalizedAds } from './consentState';
import {
  isInterstitialEligible,
  loadInterstitialPolicyState,
  markInterstitialShown,
  recordInterstitialAction,
} from './interstitialPolicy';

type ResultRouteParams = {
  draftId?: string | string[];
  mode?: string | string[];
};

// How a route counts toward the interstitial policy:
//  - 'action' — active engagement (a fresh calculation, or any tracker screen).
//    Entering one records an action toward the next eligible interstitial.
//  - 'break'  — a calm landing tab (home, saved list, settings). Arriving here
//    from engagement is the natural pause where we may show an interstitial,
//    rather than interrupting the user mid-task on the result screen.
//  - 'neutral' — everything else (onboarding, share, the calculate entry): does
//    not count and does not trigger.
type RouteClass = 'action' | 'break' | 'neutral';

const getSingleParam = (value?: string | string[]) => (
  Array.isArray(value) ? value[0] : value
);

const classifyRoute = (segments: string[], mode?: string): RouteClass => {
  const leaf = segments[segments.length - 1];

  if (segments[0] === '(tabs)') {
    if (leaf === 'index' || leaf === 'saved' || leaf === 'settings') {
      return 'break';
    }
    if (leaf === 'result') {
      // Viewing a previously-saved loan's result is not a fresh action.
      return mode === 'saved' ? 'neutral' : 'action';
    }
    return 'neutral';
  }

  // The saved/* stack (loan detail, tracking form, deals, overpayments, events)
  // is the tracker — active engagement. `recent` is just a list, so it stays neutral.
  if (segments[0] === 'saved' && leaf !== 'recent') {
    return 'action';
  }

  return 'neutral';
};

export const InterstitialGate = () => {
  const segments = useSegments();
  const params = useGlobalSearchParams<ResultRouteParams>();
  const draftId = getSingleParam(params.draftId);
  const mode = getSingleParam(params.mode);

  const adRef = useRef<InterstitialAd | null>(null);
  const isLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const seenDraftIdsRef = useRef(new Set<string>());
  const lastCountedKeyRef = useRef<string | null>(null);
  const prevClassRef = useRef<RouteClass | null>(null);

  const isResult = useMemo(
    () => segments[0] === '(tabs)' && segments[segments.length - 1] === 'result',
    [segments],
  );

  const ensureLoaded = useCallback(() => {
    const ad = adRef.current;
    if (!ad || isLoadedRef.current || isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    ad.load();
  }, []);

  const tryShow = useCallback(() => {
    const ad = adRef.current;
    if (!ad || !isLoadedRef.current) {
      return;
    }
    if (!isInterstitialEligible(loadInterstitialPolicyState())) {
      return;
    }
    try {
      ad.show();
      markInterstitialShown();
      isLoadedRef.current = false;
    } catch {
      ensureLoaded();
    }
  }, [ensureLoaded]);

  // Create the ad — and capture its personalisation flag — only once the
  // consent flow has resolved, so the request reflects the user's actual choice.
  useEffect(() => {
    let isMounted = true;
    let teardown = () => {};

    whenConsentFlowComplete().then(() => {
      if (!isMounted) {
        return;
      }

      const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
        requestNonPersonalizedAdsOnly: shouldRequestNonPersonalizedAds(),
      });
      adRef.current = ad;

      const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        isLoadingRef.current = false;
        isLoadedRef.current = true;
      });
      const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        isLoadedRef.current = false;
        isLoadingRef.current = false;
        ensureLoaded();
      });
      const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => {
        isLoadingRef.current = false;
        isLoadedRef.current = false;
      });

      teardown = () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };

      ensureLoaded();
    });

    return () => {
      isMounted = false;
      teardown();
    };
  }, [ensureLoaded]);

  // Count actions on entry to engagement routes, and show at the next break.
  useEffect(() => {
    const currentClass = classifyRoute(segments, mode);

    if (currentClass === 'action') {
      if (isResult) {
        // Dedupe by draftId so the same calculation never counts twice, even
        // across back/forward navigation.
        if (draftId && !seenDraftIdsRef.current.has(draftId)) {
          seenDraftIdsRef.current.add(draftId);
          recordInterstitialAction();
        }
      } else {
        // Dedupe re-renders of the same tracker route; a different route (or
        // returning here after a break) counts as a new action.
        const key = segments.join('/');
        if (lastCountedKeyRef.current !== key) {
          lastCountedKeyRef.current = key;
          recordInterstitialAction();
        }
      }
      ensureLoaded();
    } else {
      lastCountedKeyRef.current = null;
    }

    // Arriving at a calm tab from non-break context is the natural break point.
    // The null guard avoids firing on the launch screen.
    if (
      currentClass === 'break' &&
      prevClassRef.current !== null &&
      prevClassRef.current !== 'break'
    ) {
      tryShow();
    }

    prevClassRef.current = currentClass;
  }, [segments, mode, draftId, isResult, ensureLoaded, tryShow]);

  return null;
};
