export default () => ({
  expo: {
    name: 'LoanBee',
    slug: 'loanbee',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'loanbee',
    newArchEnabled: true,
    owner: 'oskarfigura',
    extra: {
      eas: {
        projectId: '4fb78e7c-b9ae-41be-8afc-6c49ae025d03',
      },
      admobBannerAndroid: process.env.ADMOB_BANNER_ANDROID_ID ?? null,
      admobBannerIos: process.env.ADMOB_BANNER_IOS_ID ?? null,
    },
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#002D72',
    },
    ios: {
      supportsTablet: true,
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
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-localization',
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
