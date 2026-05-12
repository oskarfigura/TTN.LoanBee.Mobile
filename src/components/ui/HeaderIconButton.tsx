import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colours, radii } from '@/theme';

interface Props {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const HeaderIconButton = ({
  children,
  onPress,
  accessibilityLabel,
  disabled = false,
  style,
}: Props) => (
  <TouchableOpacity
    style={[styles.button, disabled && styles.buttonDisabled, style]}
    onPress={onPress}
    activeOpacity={0.82}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    disabled={disabled}
  >
    {children}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colours.blackSubtle,
    borderWidth: 0,
  },
  buttonDisabled: {
    opacity: 0.48,
  },
});
