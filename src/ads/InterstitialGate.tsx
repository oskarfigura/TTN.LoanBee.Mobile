import { useGlobalSearchParams, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  initInterstitial,
  presentInterstitial,
  primeInterstitial,
} from './interstitialController';
import { recordInterstitialAction } from './interstitialPolicy';

type ResultRouteParams = {
  draftId?: string | string[];
  mode?: string | string[];
};

// How a route counts toward the interstitial policy:
//  - 'action' — active engagement (a fresh calculation, or any tracker screen).
//    Entering one records an action toward the next eligible interstitial.
//  - 'break'  — a calm landing tab (home, saved list). Arriving here from
//    engagement is the natural pause where we may show an interstitial, rather
//    than interrupting the user mid-task on the result screen.
//  - 'neutral' — everything else (onboarding, share, the calculate entry, and
//    Settings): does not count and does not trigger.
type RouteClass = 'action' | 'break' | 'neutral';

const getSingleParam = (value?: string | string[]) => (
  Array.isArray(value) ? value[0] : value
);

const classifyRoute = (segments: string[], mode?: string): RouteClass => {
  const leaf = segments[segments.length - 1];

  if (segments[0] === '(tabs)') {
    if (leaf === 'index' || leaf === 'saved') {
      return 'break';
    }
    // Settings is deliberately neutral, not a break: users open it to change
    // language, find a future "remove ads" option, or report a problem — a
    // low-patience / high-intent moment where an interstitial would frustrate.
    if (leaf === 'settings') {
      return 'neutral';
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

  const seenDraftIdsRef = useRef(new Set<string>());
  const lastCountedKeyRef = useRef<string | null>(null);
  const prevClassRef = useRef<RouteClass | null>(null);

  const isResult = useMemo(
    () => segments[0] === '(tabs)' && segments[segments.length - 1] === 'result',
    [segments],
  );

  // Set up the shared interstitial instance once. It is also used by imperative
  // triggers (e.g. CSV export); init is idempotent and waits for consent itself.
  useEffect(() => {
    initInterstitial();
  }, []);

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
      primeInterstitial();
    } else {
      lastCountedKeyRef.current = null;
    }

    // Arriving at a calm tab from non-break context is the natural break point.
    // The null guard avoids firing on the launch screen. presentInterstitial is
    // a no-op unless the ad is loaded and the frequency policy permits it.
    if (
      currentClass === 'break' &&
      prevClassRef.current !== null &&
      prevClassRef.current !== 'break'
    ) {
      void presentInterstitial();
    }

    prevClassRef.current = currentClass;
  }, [segments, mode, draftId, isResult]);

  return null;
};
