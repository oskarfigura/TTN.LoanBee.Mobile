import {
  withAndroidManifest,
  withGradleProperties,
  withInfoPlist,
} from '@expo/config-plugins';

const androidSizeGradleProperties = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  'expo.gif.enabled': 'false',
};

const withAndroidSizeGradleProperties = config => withGradleProperties(config, gradleConfig => {
  Object.entries(androidSizeGradleProperties).forEach(([key, value]) => {
    const existingProperty = gradleConfig.modResults.find(
      item => item.type === 'property' && item.key === key,
    );

    if (existingProperty) {
      existingProperty.value = value;
      return;
    }

    gradleConfig.modResults.push({
      type: 'property',
      key,
      value,
    });
  });

  return gradleConfig;
});

// Expo's Android prebuild template injects SYSTEM_ALERT_WINDOW ("draw over other
// apps"), which Google Play flags as a sensitive permission and surfaces in Data
// Safety. This calculator never draws overlays, so strip it from the merged manifest.
// The tools:node="remove" directive also blocks any dependency that re-adds it during
// manifest merging — more durable than deleting the line from the generated manifest
// (which is gitignored and regenerated on every prebuild).
const withoutSystemAlertWindow = config => withAndroidManifest(config, androidConfig => {
  const { manifest } = androidConfig.modResults;
  manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';

  const SYSTEM_ALERT_WINDOW = 'android.permission.SYSTEM_ALERT_WINDOW';
  manifest['uses-permission'] = (manifest['uses-permission'] ?? []).filter(
    permission => permission.$['android:name'] !== SYSTEM_ALERT_WINDOW,
  );
  manifest['uses-permission'].push({
    $: { 'android:name': SYSTEM_ALERT_WINDOW, 'tools:node': 'remove' },
  });

  return androidConfig;
});

// Incremental prebuilds preserve existing Info.plist values. Explicitly remove
// the tracking purpose string while iOS ads are disabled so a previously
// generated native project cannot accidentally retain the ATT declaration.
const withoutIosTrackingUsageDescription = config => withInfoPlist(config, iosConfig => {
  delete iosConfig.modResults.NSUserTrackingUsageDescription;
  return iosConfig;
});

// AdMob unit IDs flow in via env vars (see src/ads/adUnits.ts). When unset the app
// falls back to Google's *test* unit IDs — fine for dev/preview, but shipping them to
// production is an AdMob policy violation and earns zero revenue. Fail the production
// build loudly rather than silently shipping test ads.
// Keep iOS ads disabled until the App Store listing and production AdMob app are
// ready. Set ADMOB_IOS_ENABLED=true for a future build to restore the full iOS
// ATT, consent, banner, and interstitial flow.
const IOS_ADS_ENABLED = process.env.ADMOB_IOS_ENABLED === 'true';

// Google's public sample AdMob app ID for iOS. It is always a valid
// GADApplicationIdentifier. The Mobile Ads SDK is linked into the binary regardless of
// IOS_ADS_ENABLED and validates GADApplicationIdentifier at launch, crashing with
// GADInvalidInitializationException if it is missing or malformed — before any JS runs.
// While iOS ads are disabled there is no real iOS AdMob app, so we always write this
// valid placeholder instead of trusting ADMOB_IOS_ID (which may be set to "test").
const GOOGLE_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const ANDROID_PRODUCTION_AD_ENV_KEYS = [
  'ADMOB_ANDROID_ID',
  'ADMOB_BANNER_ANDROID_ID',
  'ADMOB_INTERSTITIAL_ANDROID_ID',
];

const IOS_PRODUCTION_AD_ENV_KEYS = [
  'ADMOB_IOS_ID',
  'ADMOB_BANNER_IOS_ID',
  'ADMOB_INTERSTITIAL_IOS_ID',
];

const assertProductionAdUnitsConfigured = () => {
  if (process.env.APP_ENV !== 'production') return;
  // Only enforce inside the real EAS build environment (EAS_BUILD=true), where the EAS
  // Environment Variables / Secrets are injected into process.env. eas-cli also evaluates
  // this config locally (for fingerprinting) where those values are not yet resolved —
  // throwing there would abort the build before it ever reaches the Expo vars.
  if (!process.env.EAS_BUILD) return;
  const requiredKeys =
    process.env.EAS_BUILD_PLATFORM === 'ios'
      ? (IOS_ADS_ENABLED ? IOS_PRODUCTION_AD_ENV_KEYS : [])
      : ANDROID_PRODUCTION_AD_ENV_KEYS;
  const missing = requiredKeys.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Production build aborted: missing AdMob env vars [${missing.join(', ')}]. ` +
        'Set them as EAS Environment Variables/Secrets so the build does not ship Google test ad units.',
    );
  }
};

// Runs when Expo loads this config (import time). Kept at module scope so the
// `export default` object below stays untouched.
assertProductionAdUnitsConfigured();

export default () => ({
  expo: {
    name: 'LoanBee',
    slug: 'loanbee-odr6tdznqbl20no30tw0',
    version: '1.0.13',
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'loanbee',
    newArchEnabled: true,
    owner: 'thetechnarrative.uk',
    extra: {
      eas: {
        projectId: '06179207-8267-41ff-a5ed-dbb4cd7b439e',
      },
      admobBannerAndroid: process.env.ADMOB_BANNER_ANDROID_ID ?? null,
      admobBannerIos: process.env.ADMOB_BANNER_IOS_ID ?? null,
      admobInterstitialAndroid: process.env.ADMOB_INTERSTITIAL_ANDROID_ID ?? null,
      admobInterstitialIos: process.env.ADMOB_INTERSTITIAL_IOS_ID ?? null,
      admobIosEnabled: IOS_ADS_ENABLED,
    },
    ios: {
      supportsTablet: true,
      requireFullScreen: true,
      bundleIdentifier: 'com.thetechnarrative.loanbee',
      infoPlist: {
        // MMKV encrypts at rest but uses only standard/exempt cryptography, so the app
        // qualifies for the export-compliance exemption. Declaring this stops App Store
        // Connect blocking every submission with the encryption-compliance prompt.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#002D72',
      },
      package: 'com.cactus.loancalculator.free',
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      withAndroidSizeGradleProperties,
      withoutSystemAlertWindow,
      'expo-router',
      'expo-font',
      'expo-localization',
      [
        'expo-screen-orientation',
        {
          initialOrientation: 'PORTRAIT_UP',
        },
      ],
      'expo-system-ui',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 260,
          resizeMode: 'contain',
          backgroundColor: '#002D72',
        },
      ],
      '@react-native-community/datetimepicker',
      'expo-web-browser',
      // Add the ATT capability only when iOS advertising is deliberately enabled.
      // With iOS ads disabled the app neither declares nor presents the tracking prompt.
      ...(IOS_ADS_ENABLED
        ? [[
            'expo-tracking-transparency',
            {
              userTrackingPermission:
                'LoanBee uses this device identifier to show personalised ads and measure advertising performance. Saved loan and mortgage information is not used for ad personalisation.',
            },
          ]]
        : []),
      [
        'react-native-google-mobile-ads',
        {
          androidAppId:
            process.env.ADMOB_ANDROID_ID ??
            'ca-app-pub-3940256099942544~3347511713',
          // Only trust ADMOB_IOS_ID once iOS ads are deliberately enabled and a real
          // iOS AdMob app exists. While disabled, always write Google's valid sample
          // ID so the linked-but-inert SDK does not abort at launch (no ads load — the
          // JS AdProvider stays gated by ADS_ENABLED).
          iosAppId: IOS_ADS_ENABLED
            ? (process.env.ADMOB_IOS_ID ?? GOOGLE_TEST_IOS_APP_ID)
            : GOOGLE_TEST_IOS_APP_ID,
          // Only write NSUserTrackingUsageDescription when iOS ads are enabled.
          ...(IOS_ADS_ENABLED
            ? {
                userTrackingUsageDescription:
                  'LoanBee uses this device identifier to show personalised ads and measure advertising performance. Saved loan and mortgage information is not used for ad personalisation.',
              }
            : {}),
        },
      ],
      ...(!IOS_ADS_ENABLED ? [withoutIosTrackingUsageDescription] : []),
    ],
    experiments: {
      typedRoutes: true,
    },
  },
});
