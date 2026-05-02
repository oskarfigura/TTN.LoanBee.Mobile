import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { HeaderBackButton } from '@react-navigation/elements';
import Svg, { Path } from 'react-native-svg';
import { colours, radii } from '@/theme';

interface Props {
  onPress: () => void;
  variant?: 'default' | 'circle';
}

export const HeaderBackAction = ({ onPress, variant = 'default' }: Props) => {
  if (variant === 'circle') {
    return (
      <TouchableOpacity
        style={styles.circleButton}
        onPress={onPress}
        activeOpacity={0.82}
        accessibilityRole="button"
      >
        <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19 12H5m7-7l-7 7 7 7"
            stroke={colours.primary}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </TouchableOpacity>
    );
  }

  return (
    <HeaderBackButton
      onPress={onPress}
      tintColor={colours.primary}
      displayMode="minimal"
    />
  );
};

const styles = StyleSheet.create({
  circleButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
});
