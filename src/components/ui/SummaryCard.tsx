import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { Card } from './Card';

interface Props {
  label: string;
  value: string;
  accent?: boolean;
}

export const SummaryCard = ({ label, value, accent }: Props) => (
  <Card style={[styles.card, accent && styles.accentCard]} padding={12}>
    <Text style={[styles.label, accent && styles.accentLabel]}>{label}</Text>
    <Text style={[styles.value, accent && styles.accentValue]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  accentCard: {
    backgroundColor: colours.primary,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  accentLabel: {
    color: 'rgba(255,255,255,0.7)',
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  accentValue: {
    color: colours.white,
    fontSize: fontSizes.xl,
  },
});
