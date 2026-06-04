import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      admobBannerAndroid: 'ca-app-pub-prod/banner',
      admobInterstitialAndroid: 'ca-app-pub-prod/interstitial',
    },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('react-native-google-mobile-ads', () => ({
  TestIds: {
    ADAPTIVE_BANNER: 'google-test-banner',
    INTERSTITIAL: 'google-test-interstitial',
  },
}));

describe('ad unit selection', () => {
  beforeEach(() => {
    jest.resetModules();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  });

  it('uses Google test IDs in dev even when production IDs are configured', async () => {
    const { AD_UNITS } = await import('@/ads/adUnits');

    expect(AD_UNITS.banner).toBe('google-test-banner');
    expect(AD_UNITS.interstitial).toBe('google-test-interstitial');
  });
});
