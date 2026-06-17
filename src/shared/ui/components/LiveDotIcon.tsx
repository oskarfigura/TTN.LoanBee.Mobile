import { Circle, Svg } from 'react-native-svg';
import { colours } from '@/shared/ui/theme';

interface LiveDotIconProps {
  color?: string;
  size?: number;
}

/**
 * A small filled dot used for the "active" timeline state. Kept local rather
 * than in the shared @oskarfigura/icons package because that package models
 * stroke-only geometry (every consumer strokes paths with `fill="none"`),
 * whereas this is a solid filled circle.
 */
export const LiveDotIcon = ({ color = colours.white, size = 10 }: LiveDotIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={6} fill={color} />
  </Svg>
);

export default LiveDotIcon;
