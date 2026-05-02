import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colours, spacing } from '@/theme';

interface Props {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader = ({ title, actionLabel, onPressAction, style }: Props) => (
  <View style={[styles.row, style]}>
    <AppText variant="title2" tone="accent">{title}</AppText>
    {actionLabel && onPressAction ? (
      <TouchableOpacity onPress={onPressAction} activeOpacity={0.8}>
        <AppText variant="labelMd" tone="accent">{actionLabel}</AppText>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
