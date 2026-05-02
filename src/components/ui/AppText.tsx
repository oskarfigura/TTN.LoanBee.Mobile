import React from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { colours, textStyles } from '@/theme';

type TextVariant = keyof typeof textStyles;
type TextTone = 'default' | 'muted' | 'inverse' | 'accent' | 'success' | 'error';

interface Props extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
}

const toneStyles: Record<TextTone, TextStyle> = StyleSheet.create({
  default: { color: colours.textPrimary },
  muted: { color: colours.textSecondary },
  inverse: { color: colours.white },
  accent: { color: colours.primary },
  success: { color: colours.success },
  error: { color: colours.error },
});

export const AppText = ({
  variant = 'bodyMd',
  tone = 'default',
  style,
  ...props
}: Props) => (
  <Text
    {...props}
    style={[textStyles[variant], toneStyles[tone], style]}
  />
);
