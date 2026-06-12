import React from 'react';
import { colours } from '@/theme';
import { Icon, IconName } from './Icon';
import { HeaderIconButton } from './HeaderIconButton';

interface Props {
  onPress: () => void;
  accessibilityLabel?: string;
}

export const HeaderCloseAction = ({
  onPress,
  accessibilityLabel = 'Close',
}: Props) => (
  <HeaderIconButton onPress={onPress} accessibilityLabel={accessibilityLabel}>
    <Icon icon={IconName.XCloseIcon} color={colours.primary} size={21} strokeWidth={2.2} />
  </HeaderIconButton>
);
