import React from 'react';
import { colours } from '@/theme';
import { ArrowLeftIcon } from './Icons';
import { HeaderIconButton } from './HeaderIconButton';

interface Props {
  onPress: () => void;
  variant?: 'default' | 'circle';
  accessibilityLabel?: string;
}

export const HeaderBackAction = ({
  onPress,
  accessibilityLabel = 'Go back',
}: Props) => (
  <HeaderIconButton onPress={onPress} accessibilityLabel={accessibilityLabel}>
    <ArrowLeftIcon color={colours.primary} size={21} strokeWidth={2.2} />
  </HeaderIconButton>
);
