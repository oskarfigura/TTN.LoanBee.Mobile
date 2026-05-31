import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import MobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { markConsentFlowComplete } from '@/onboarding/firstRunGate';
import { InterstitialGate } from './InterstitialGate';

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
    (async () => {
      try {
        // iOS only: the native App Tracking Transparency prompt must resolve before
        // ads initialise so AdMob/UMP can read the IDFA when the user allows it.
        // Apple rejects builds that serve personalised ads without it. No-op on
        // Android, where there is no IDFA/ATT. Gate on the active state so the
        // prompt is presented rather than silently auto-denied during launch.
        if (Platform.OS === 'ios') {
          await waitForActiveState();
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
      <InterstitialGate />
    </>
  );
};
