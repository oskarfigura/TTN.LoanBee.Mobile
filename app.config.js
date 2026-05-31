import { withGradleProperties, withAndroidManifest } from '@expo/config-plugins';

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

// AdMob unit IDs flow in via env vars (see src/ads/adUnits.ts). When unset the app
// falls back to Google's *test* unit IDs — fine for dev/preview, but shipping them to
// production is an AdMob policy violation and earns zero revenue. Fail the production
// build loudly rather than silently shipping test ads.
const PRODUCTION_AD_ENV_KEYS = [
  'ADMOB_ANDROID_ID',
  'ADMOB_IOS_ID',
  'ADMOB_BANNER_ANDROID_ID',
  'ADMOB_BANNER_IOS_ID',
  'ADMOB_INTERSTITIAL_ANDROID_ID',
  'ADMOB_INTERSTITIAL_IOS_ID',
];

const assertProductionAdUnitsConfigured = () => {
  if (process.env.APP_ENV !== 'production') return;
  // Only enforce inside the real EAS build environment (EAS_BUILD=true), where the EAS
  // Environment Variables / Secrets are injected into process.env. eas-cli also evaluates
  // this config locally (for fingerprinting) where those values are not yet resolved —
  // throwing there would abort the build before it ever reaches the Expo vars.
  if (!process.env.EAS_BUILD) return;
  const missing = PRODUCTION_AD_ENV_KEYS.filter(key => !process.env[key]);
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
    version: '2.2.0',
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
    },
    ios: {
      supportsTablet: true,
      requireFullScreen: true,
      bundleIdentifier: 'com.thetechnarrative.loanbee',
      buildNumber: '1',
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
      versionCode: 24,
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
      // Native iOS App Tracking Transparency prompt. AdProvider calls
      // requestTrackingPermissionsAsync before initialising ads so AdMob/UMP can read
      // the IDFA when allowed. The config writes NSUserTrackingUsageDescription, so the
      // ATT flow is self-contained regardless of the AdMob plugin's own description.
      [
        'expo-tracking-transparency',
        {
          userTrackingPermission:
            'This identifier will be used to deliver personalised ads to you.',
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidAppId:
            process.env.ADMOB_ANDROID_ID ??
            'ca-app-pub-3940256099942544~3347511713',
          iosAppId:
            process.env.ADMOB_IOS_ID ??
            'ca-app-pub-3940256099942544~1458002511',
          // Writes NSUserTrackingUsageDescription into the iOS Info.plist. Required for
          // App Store review because the app presents the UMP consent form and serves
          // AdMob; the plugin also injects Google's SKAdNetwork identifier automatically.
          userTrackingUsageDescription:
            'This identifier will be used to deliver personalised ads to you.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
});
