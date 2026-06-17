import React from 'react';
import { colours } from '@/shared/ui/theme';
import { Icon, IconName } from './Icon';
import { HeaderIconButton } from '@oskarfigura/ui-native';

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
    <Icon icon={IconName.ArrowLeftIcon} color={colours.primary} size={21} strokeWidth={2.2} />
  </HeaderIconButton>
);
