import React from 'react';
import NativeSvg, {
  Circle,
  G,
  Path,
  SvgProps as NativeSvgProps,
} from 'react-native-svg';
import { colours } from '@/shared/ui/theme';

export { Circle, G, Path };

export interface SvgProps extends NativeSvgProps {
  size?: number;
  title?: string;
  color?: string;
}

export const Svg = ({
  size,
  width,
  height,
  fill = 'none',
  stroke,
  strokeWidth = 2,
  color = colours.textPrimary,
  viewBox = '0 0 24 24',
  children,
  ...props
}: SvgProps) => {
  const finalWidth = width ?? size ?? 24;
  const finalHeight = height ?? size ?? 24;

  return (
    <NativeSvg
      width={finalWidth}
      height={finalHeight}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke ?? color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </NativeSvg>
  );
};

export default Svg;
