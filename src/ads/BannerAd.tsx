import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './adUnits';
import { colours, fonts, fontSizes } from '@/theme';

export const BannerAd = () => (
  <View style={styles.container}>
    <Text style={styles.label}>Advertisement</Text>
    <GoogleBannerAd
      unitId={AD_UNITS.banner}
      size={BannerAdSize.ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginBottom: 4,
  },
});
