import React from 'react';
import { Card as NativeCard, type CardVariant } from '@oskarfigura/ui-native';
import type { StyleProp, ViewStyle } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  variant?: CardVariant;
}

export const Card = ({ children, style, padding, variant = 'default' }: CardProps) => (
  <NativeCard
    padding={padding}
    variant={variant}
    style={style as never}
  >
    {children}
  </NativeCard>
);

export type { CardVariant };
