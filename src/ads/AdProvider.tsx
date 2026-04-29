import React, { useEffect, useState } from 'react';
import MobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

interface Props {
  children: React.ReactNode;
}

export const AdProvider = ({ children }: Props) => {
  const [ready, setReady] = useState(false);

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
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return <>{children}</>;
  return <>{children}</>;
};
