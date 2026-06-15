import React from 'react';
import { Button as NativeButton, ButtonVariant, type NativeButtonVariant } from '@oskarfigura/ui-native';
import type { ViewStyle } from 'react-native';

type LoanBeeButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'destructive-ghost'
  | 'icon-pill';

interface Props {
  label: string;
  onPress: () => void;
  variant?: LoanBeeButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

const variantMap: Record<LoanBeeButtonVariant, NativeButtonVariant> = {
  primary: ButtonVariant.Primary,
  secondary: ButtonVariant.Secondary,
  ghost: ButtonVariant.Ghost,
  destructive: ButtonVariant.Destructive,
  'destructive-ghost': 'destructiveGhost',
  'icon-pill': 'iconPill',
};

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  leftIcon,
  rightIcon,
  style,
}: Props) => (
  <NativeButton
    label={label}
    onPress={onPress}
    variant={variantMap[variant]}
    disabled={disabled}
    loading={loading}
    leftIcon={leftIcon}
    rightIcon={rightIcon}
    style={style as never}
  />
);
