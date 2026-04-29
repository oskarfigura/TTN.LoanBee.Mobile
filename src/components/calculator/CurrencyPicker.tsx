import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

interface Props {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export const CurrencyPicker = ({ value, onChange }: Props) => (
  <View style={styles.container}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {CURRENCIES.map(c => (
        <TouchableOpacity
          key={c.code}
          style={[styles.chip, value === c.code && styles.chipActive]}
          onPress={() => onChange(c.code)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, value === c.code && styles.chipTextActive]}>
            {c.symbol} {c.code}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  chipActive: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
  chipText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  chipTextActive: {
    color: colours.white,
  },
});
