import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes } from '@/theme';

export const Disclaimer = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('disclaimer.text')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colours.surface,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colours.accent,
    marginVertical: 8,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    lineHeight: 16,
  },
});
