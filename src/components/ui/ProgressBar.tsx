import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colours, radii } from '@/theme';

interface Props {
  progress: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
}

export const ProgressBar = ({ progress, color = colours.teal, style, trackStyle }: Props) => (
  <View style={[styles.track, trackStyle]}>
    <View
      style={[
        styles.fill,
        { width: `${Math.max(0, Math.min(progress, 1)) * 100}%`, backgroundColor: color },
        style,
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  track: {
    height: 12,
    backgroundColor: colours.surfaceStrong,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
