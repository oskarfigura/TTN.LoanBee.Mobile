import React, { useEffect } from 'react';
import MobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

interface Props {
  children: React.ReactNode;
}

export const AdProvider = ({ children }: Props) => {
  useEffect(() => {
    (async () => {
      try {
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
      }
    })();
  }, []);

  return <>{children}</>;
};
