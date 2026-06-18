import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import MobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { markConsentFlowComplete } from '@/shared/lib/services/onboarding/firstRunGate';
import { whenOnboardingDismissed } from '@/shared/lib/services/onboarding/onboardingGate';
import { hasSeenGuide } from '@/shared/lib/services/onboarding/guideState';
import { InterstitialGate } from './InterstitialGate';
import { ADS_ENABLED } from './adsConfig';

interface Props {
  children: React.ReactNode;
}

// The ATT API silently resolves to "denied" without ever presenting the system
// prompt if it is called while the app is not in the `active` state — which happens
// on a cold start while the splash screen is still up. Resolve once the app is
// active so the prompt is actually shown. Resolves immediately in the common case.
const waitForActiveState = (): Promise<void> =>
  new Promise(resolve => {
    if (AppState.currentState === 'active') {
      resolve();
      return;
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        subscription.remove();
        resolve();
      }
    });
  });

export const AdProvider = ({ children }: Props) => {
  useEffect(() => {
    if (!ADS_ENABLED) {
      // Release any first-run UI waiting for the consent flow. No ATT, UMP, or
      // Mobile Ads SDK calls are made while advertising is disabled.
      markConsentFlowComplete();
      return;
    }

    (async () => {
      try {
        // iOS only: the native App Tracking Transparency prompt must resolve before
        // ads initialise so AdMob/UMP can read the IDFA when the user allows it.
        // Apple rejects builds that serve personalised ads without it. No-op on
        // Android, where there is no IDFA/ATT. Gate on the active state so the
        // prompt is presented rather than silently auto-denied during launch.
        if (Platform.OS === 'ios') {
          if (__DEV__) console.log('[firstrun] AdProvider: effect start, waiting for active state');
          await waitForActiveState();
          const seen = hasSeenGuide();
          if (__DEV__) console.log('[firstrun] AdProvider: active. hasSeenGuide =', seen);
          // On first launch hold the system ATT prompt until the onboarding guide
          // (which carries the tracking rationale) has been dismissed, so the
          // priming context is shown before the system dialog. Returning users —
          // who have already seen onboarding — proceed straight to the prompt,
          // which is itself a no-op once the ATT status is determined.
          if (!seen) {
            if (__DEV__) console.log('[firstrun] AdProvider: awaiting onboarding dismissal');
            await whenOnboardingDismissed();
            if (__DEV__) console.log('[firstrun] AdProvider: onboarding dismissed, releasing ATT');
          }
          if (__DEV__) console.log('[firstrun] AdProvider: calling requestTrackingPermissionsAsync');
          await requestTrackingPermissionsAsync();
        }

        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          await AdsConsent.showForm();
        }
        await MobileAds().initialize();
      } catch {
        // silently fail so ads don't block the app
      } finally {
        markConsentFlowComplete();
      }
    })();
  }, []);

  return (
    <>
      {children}
      {ADS_ENABLED ? <InterstitialGate /> : null}
    </>
  );
};
