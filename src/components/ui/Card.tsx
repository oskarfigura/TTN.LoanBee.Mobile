import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colours } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export const Card = ({ children, style, padding = 16 }: Props) => (
  <View style={[styles.card, { padding }, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
