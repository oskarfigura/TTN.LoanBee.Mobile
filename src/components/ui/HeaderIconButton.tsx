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
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonDisabled: {
    opacity: 0.48,
  },
});
