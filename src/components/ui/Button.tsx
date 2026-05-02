import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { AppText } from './AppText';
import { colours, radii, spacing } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon-pill';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  leftIcon,
  rightIcon,
  style,
}: Props) => {
  const fg = variant === 'primary' || variant === 'destructive'
    ? colours.white
    : variant === 'ghost'
      ? colours.primary
      : colours.primaryInk;

  return (
    <TouchableOpacity
      style={[styles.base, variantStyles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.84}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <AppText
            variant="labelMd"
            tone={variant === 'primary' || variant === 'destructive' ? 'inverse' : variant === 'secondary' ? 'default' : 'accent'}
            style={styles.label}
          >
            {label}
          </AppText>
          {rightIcon ? <View style={[styles.icon, styles.iconAfter]}>{rightIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  iconAfter: {
    marginRight: 0,
    marginLeft: spacing.xs,
  },
  label: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
  secondary: {
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: colours.error,
    borderColor: colours.error,
  },
  'icon-pill': {
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.borderSoft,
  },
});
