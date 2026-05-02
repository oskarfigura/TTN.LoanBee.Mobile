import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colours, elevation, radii } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  variant?: 'default' | 'hero' | 'accent' | 'status' | 'modal' | 'dense';
}

export const Card = ({ children, style, padding = 16, variant = 'default' }: Props) => (
  <View style={[styles.card, variantStyles[variant], { padding }, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    ...elevation.level1,
  },
});

const variantStyles = StyleSheet.create({
  default: {},
  hero: {
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.surfaceStrong,
  },
  accent: {
    borderTopWidth: 3,
    borderTopColor: colours.tealDeep,
  },
  status: {
    backgroundColor: colours.successSurface,
    borderColor: colours.successBorder,
  },
  modal: {
    ...elevation.level2,
  },
  dense: {
    borderColor: colours.border,
  },
});
