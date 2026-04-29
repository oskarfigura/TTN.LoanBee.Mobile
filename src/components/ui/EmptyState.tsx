import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
}

export const EmptyState = ({ title, subtitle }: Props) => (
  <View style={styles.container}>
    <Text style={styles.emoji}>🐝</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
