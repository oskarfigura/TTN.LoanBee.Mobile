import React from 'react';
import { HeaderBackButton } from '@react-navigation/elements';
import { colours } from '@/theme';

interface Props {
  onPress: () => void;
}

export const HeaderBackAction = ({ onPress }: Props) => (
  <HeaderBackButton
    onPress={onPress}
    tintColor={colours.primary}
    displayMode="minimal"
  />
);
