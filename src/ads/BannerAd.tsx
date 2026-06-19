import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './adUnits';
import { ADS_ENABLED } from './adsConfig';
import { useAdConsent } from './consentState';
import { colours, fontFaces, fontSizes, layout } from '@/shared/ui/theme';

export const BannerAd = () => {
  const { t } = useTranslation();
  const { resolved, personalizedAdsAllowed } = useAdConsent();

  // Hold the banner until the ATT/UMP flow has resolved, so its request carries
  // the correct personalisation flag instead of firing under the safe default.
  if (!ADS_ENABLED || !resolved) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('ads.advertisement')}</Text>
      <GoogleBannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: !personalizedAdsAllowed }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colours.white,
    borderTopWidth: 1,
    borderTopColor: colours.surface,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 2,
    marginVertical: 0,
  },
  label: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    marginBottom: 2,
  },
});
