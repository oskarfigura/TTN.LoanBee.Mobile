import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const Button = ({ label, onPress, variant = 'primary', disabled, loading, style }: Props) => {
  const bg = variant === 'primary' ? colours.primary : variant === 'secondary' ? colours.surface : 'transparent';
  const fg = variant === 'primary' ? colours.white : colours.primary;
  const border = variant === 'secondary' ? colours.border : 'transparent';

  return (
    <TouchableOpacity
      style={[styles.base, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
});
