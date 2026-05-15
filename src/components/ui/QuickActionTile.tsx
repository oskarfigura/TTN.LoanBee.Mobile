import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colours, fontFaces, fontSizes, radii, spacing } from '@/theme';

interface Props {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const QuickActionTile = ({ label, icon, onPress, style }: Props) => (
  <TouchableOpacity
    style={[styles.tile, style]}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={styles.iconWrap}>{icon}</View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textPrimary,
    textAlign: 'center',
  },
});
