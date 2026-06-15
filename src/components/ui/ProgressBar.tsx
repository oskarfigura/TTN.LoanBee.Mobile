import { ProgressBar as NativeProgressBar, type ProgressBarProps } from '@oskarfigura/ui-native';
import { colours } from '@/theme';

export const ProgressBar = ({ color = colours.teal, ...props }: ProgressBarProps) => (
  <NativeProgressBar color={color} {...props} />
);
