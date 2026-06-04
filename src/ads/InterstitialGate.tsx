import { useGlobalSearchParams, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { whenConsentFlowComplete } from '@/onboarding/firstRunGate';
import { AD_UNITS } from './adUnits';
import {
  isInterstitialEligible,
  markInterstitialShown,
  recordInterstitialCalculation,
} from './interstitialPolicy';

type ResultRouteParams = {
  draftId?: string | string[];
  mode?: string | string[];
};

const interstitialAd = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
  requestNonPersonalizedAdsOnly: true,
});

const getSingleParam = (value?: string | string[]) => (
  Array.isArray(value) ? value[0] : value
);

export const InterstitialGate = () => {
  const ad = interstitialAd;
  const segments = useSegments();
  const params = useGlobalSearchParams<ResultRouteParams>();
  const [isLoaded, setIsLoaded] = useState(false);
  const isLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const seenDraftIdsRef = useRef(new Set<string>());
  const pendingDraftIdRef = useRef<string | null>(null);
  const isResultRoute = useMemo(() => segments[segments.length - 1] === 'result', [segments]);
  const draftId = getSingleParam(params.draftId);
  const mode = getSingleParam(params.mode);

  const updateLoaded = useCallback((nextValue: boolean) => {
    isLoadedRef.current = nextValue;
    setIsLoaded(nextValue);
  }, []);

  const ensureLoaded = useCallback(() => {
    if (isLoadedRef.current || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    ad.load();
  }, [ad]);

  const showPendingInterstitial = useCallback(() => {
    const pendingDraftId = pendingDraftIdRef.current;
    if (!isResultRoute || mode === 'saved' || !pendingDraftId || !isLoadedRef.current) {
      return;
    }

    try {
      ad.show();
      markInterstitialShown();
      pendingDraftIdRef.current = null;
      updateLoaded(false);
    } catch {
      ensureLoaded();
    }
  }, [ad, ensureLoaded, isResultRoute, mode, updateLoaded]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoadingRef.current = false;
      if (!isMounted) {
        return;
      }

      updateLoaded(true);
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      updateLoaded(false);
      isLoadingRef.current = false;
      ensureLoaded();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => {
      isLoadingRef.current = false;
      updateLoaded(false);
    });

    whenConsentFlowComplete().then(() => {
      if (isMounted) {
        ensureLoaded();
      }
    });

    return () => {
      isMounted = false;
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [ad, ensureLoaded, updateLoaded]);

  useEffect(() => {
    if (!isResultRoute || mode === 'saved') {
      pendingDraftIdRef.current = null;
      return;
    }

    if (!draftId || seenDraftIdsRef.current.has(draftId)) {
      return;
    }

    seenDraftIdsRef.current.add(draftId);
    const nextPolicyState = recordInterstitialCalculation();
    if (!isInterstitialEligible(nextPolicyState)) {
      pendingDraftIdRef.current = null;
      return;
    }

    pendingDraftIdRef.current = draftId;
    if (isLoaded) {
      showPendingInterstitial();
      return;
    }

    ensureLoaded();
  }, [draftId, ensureLoaded, isLoaded, isResultRoute, mode, showPendingInterstitial]);

  useEffect(() => {
    if (isLoaded) {
      showPendingInterstitial();
    }
  }, [isLoaded, showPendingInterstitial]);

  return null;
};
