import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Card } from './Card';
import { colours, radii, spacing } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
}

export const EmptyState = ({ title, subtitle }: Props) => (
  <View style={styles.container}>
    <Card style={styles.card} variant="accent" padding={24}>
      <View style={styles.iconWrap}>
        <AppText variant="title1" tone="accent">🐝</AppText>
      </View>
      <AppText variant="title2" style={styles.title}>{title}</AppText>
      {subtitle ? <AppText variant="bodyMd" tone="muted" style={styles.subtitle}>{subtitle}</AppText> : null}
    </Card>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colours.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
  },
});
