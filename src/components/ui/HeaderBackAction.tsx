import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colours } from '@/theme';
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
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5m7-7l-7 7 7 7"
        stroke={colours.primary}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </HeaderIconButton>
);
