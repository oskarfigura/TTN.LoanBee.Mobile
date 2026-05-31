import Constants from 'expo-constants';
import { TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as {
  admobBannerAndroid?: string | null;
  admobBannerIos?: string | null;
  admobInterstitialAndroid?: string | null;
  admobInterstitialIos?: string | null;
} | undefined;

const prodBannerId =
  Platform.OS === 'android'
    ? (extra?.admobBannerAndroid ?? null)
    : (extra?.admobBannerIos ?? null);

const prodInterstitialId =
  Platform.OS === 'android'
    ? (extra?.admobInterstitialAndroid ?? null)
    : (extra?.admobInterstitialIos ?? null);

// Falls back to Google test ID in dev or when production IDs aren't set via env vars.
// The production EAS build additionally fails fast when these are missing (see the
// AdMob env guard in app.config.js), so a release can never silently ship test ads.
const usingTestBanner = __DEV__ || !prodBannerId;
const usingTestInterstitial = __DEV__ || !prodInterstitialId;

if (__DEV__ && (!prodBannerId || !prodInterstitialId)) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ads] Production AdMob unit IDs are not set — using Google test units. ' +
      'This is expected in dev; production builds require the ADMOB_* env vars.',
  );
}

export const AD_UNITS = {
  banner: usingTestBanner ? TestIds.ADAPTIVE_BANNER : prodBannerId,
  interstitial: usingTestInterstitial ? TestIds.INTERSTITIAL : prodInterstitialId,
};
