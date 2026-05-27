import { withGradleProperties } from '@expo/config-plugins';

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

export default () => ({
  expo: {
    name: 'LoanBee',
    slug: 'loanbee-odr6tdznqbl20no30tw0',
    version: '1.0.0',
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
      [
        'react-native-google-mobile-ads',
        {
          androidAppId:
            process.env.ADMOB_ANDROID_ID ??
            'ca-app-pub-3940256099942544~3347511713',
          iosAppId:
            process.env.ADMOB_IOS_ID ??
            'ca-app-pub-3940256099942544~1458002511',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
});
