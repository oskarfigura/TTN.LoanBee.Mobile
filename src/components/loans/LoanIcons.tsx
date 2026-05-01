import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colours } from '@/theme';

interface IconProps {
  color?: string;
  size?: number;
}

export const PinIcon = ({ color = colours.primary, size = 16 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.5 3.5h7l-1 6 3.5 3.5v1.5h-5.25L12 21l-.75-6.5H6V13l3.5-3.5-1-6z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const EditIcon = ({ color = colours.white, size = 18 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 20h4.25L18.7 9.55a2.121 2.121 0 0 0-3-3L5.25 17H4v3z"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14.5 7.75l1.75 1.75"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);
