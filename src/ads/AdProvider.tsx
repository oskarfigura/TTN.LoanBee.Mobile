import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import MobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { markConsentFlowComplete } from '@/onboarding/firstRunGate';
import { InterstitialGate } from './InterstitialGate';

interface Props {
  children: React.ReactNode;
}

export const AdProvider = ({ children }: Props) => {
  useEffect(() => {
    (async () => {
      try {
        // iOS only: the native App Tracking Transparency prompt must resolve before
        // ads initialise so AdMob/UMP can read the IDFA when the user allows it.
        // Apple rejects builds that serve personalised ads without it. No-op on
        // Android, where there is no IDFA/ATT.
        if (Platform.OS === 'ios') {
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
