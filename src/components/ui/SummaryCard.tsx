import React from 'react';
import { StyleSheet } from 'react-native';
import { colours, spacing } from '@/theme';
import { AppText } from './AppText';
import { Card } from './Card';

interface Props {
  label: string;
  value: string;
  accent?: boolean;
}

export const SummaryCard = ({ label, value, accent }: Props) => (
  <Card style={[styles.card, accent && styles.accentCard]} variant={accent ? 'hero' : 'dense'} padding={16}>
    <AppText variant="labelSm" tone={accent ? 'inverse' : 'muted'} style={styles.label}>{label}</AppText>
    <AppText variant={accent ? 'metricMd' : 'title2'} tone={accent ? 'inverse' : 'default'} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </AppText>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  accentCard: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
});
