import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colours, elevation, radii, spacing } from '@/theme';

interface Props {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const QuickActionTile = ({ label, icon, onPress, style }: Props) => (
  <TouchableOpacity style={[styles.tile, style]} onPress={onPress} activeOpacity={0.84}>
    <View style={styles.iconWrap}>{icon}</View>
    <AppText variant="bodySm" tone="default" style={styles.label}>
      {label}
    </AppText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.level1,
  },
  label: {
    textAlign: 'center',
  },
});
