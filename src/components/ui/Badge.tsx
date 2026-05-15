import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colours, radii, spacing } from '@/theme';

type BadgeVariant = 'neutral' | 'active' | 'success' | 'ghost';

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
}

export const Badge = ({ label, variant = 'neutral', style, leftIcon }: Props) => (
  <View style={[styles.base, variantStyles[variant], style]}>
    {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
    <AppText variant="labelSm" tone={variant === 'active' ? 'inverse' : variant === 'success' ? 'success' : 'muted'}>
      {label}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.chip,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xxs,
  },
});

const variantStyles = StyleSheet.create({
  neutral: {
    backgroundColor: colours.surfaceMuted,
    borderColor: colours.borderSoft,
  },
  active: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
  success: {
    backgroundColor: colours.successSurface,
    borderColor: colours.successBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colours.border,
  },
});
