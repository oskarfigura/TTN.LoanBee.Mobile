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

// Dev builds always use Google test IDs, even when production env vars are set.
// Non-dev builds fall back to test IDs only when production IDs are absent.
// Production EAS builds fail fast when env vars are missing (see app.config.js),
// so a store release can never silently ship test ads.
const usingTestBanner = __DEV__ || !prodBannerId;
const usingTestInterstitial = __DEV__ || !prodInterstitialId;

export const AD_UNITS = {
  banner: usingTestBanner ? TestIds.ADAPTIVE_BANNER : prodBannerId,
  interstitial: usingTestInterstitial ? TestIds.INTERSTITIAL : prodInterstitialId,
};
