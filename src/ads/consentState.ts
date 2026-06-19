import { useSyncExternalStore } from 'react';

// Resolved ad-consent outcome, derived once in AdProvider from the ATT (iOS)
// and UMP/TCF flow. Consumers (BannerAd, InterstitialGate) read this so every
// ad request reflects the user's actual choice instead of always forcing
// non-personalized ads. Before the flow resolves we default to the privacy-safe
// state (not resolved, personalization disallowed), so any ad that somehow
// requests early stays non-personalized.
export interface AdConsentState {
  resolved: boolean;
  personalizedAdsAllowed: boolean;
}

let state: AdConsentState = { resolved: false, personalizedAdsAllowed: false };
const listeners = new Set<() => void>();

export const getAdConsentState = (): AdConsentState => state;

export const setAdConsentResolved = (personalizedAdsAllowed: boolean): void => {
  state = { resolved: true, personalizedAdsAllowed };
  listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// For non-React callers (InterstitialGate's ad request). Personalization is
// only allowed once the flow has resolved AND the user permitted it.
export const shouldRequestNonPersonalizedAds = (): boolean => !state.personalizedAdsAllowed;

// React hook for components that must re-render when consent resolves.
export const useAdConsent = (): AdConsentState =>
  useSyncExternalStore(subscribe, getAdConsentState, getAdConsentState);

// Test-only: restore the pre-resolution default between cases.
export const resetAdConsentState = (): void => {
  state = { resolved: false, personalizedAdsAllowed: false };
  listeners.forEach(listener => listener());
};
