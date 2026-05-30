import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './adUnits';
import { colours, fontFaces, fontSizes } from '@/theme';

export const BannerAd = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('ads.advertisement')}</Text>
      <GoogleBannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 0,
  },
  label: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginBottom: 2,
  },
});
