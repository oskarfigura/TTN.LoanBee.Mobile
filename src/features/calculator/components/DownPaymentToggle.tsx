import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { colours, radii, spacing } from '@/shared/ui/theme';
import { AppText } from '@oskarfigura/ui-native';

interface Props {
  value: DownPaymentType;
  onChange: (v: DownPaymentType) => void;
  currencySymbol: string;
}

export const DownPaymentToggle = ({ value, onChange, currencySymbol }: Props) => {
  const options = [
    { label: currencySymbol, value: DownPaymentType.CASH },
    { label: '%', value: DownPaymentType.PERCENT },
  ];

  return (
    <View style={styles.container}>
      {options.map(option => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
          >
            <AppText
              variant="labelMd"
              style={selected ? styles.labelSelected : styles.label}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 88,
    minHeight: 48,
    flexDirection: 'row',
    gap: spacing.xxxs,
    padding: spacing.xxxs,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceAccent,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  optionSelected: {
    backgroundColor: colours.surfaceRaised,
  },
  optionPressed: {
    opacity: 0.78,
  },
  label: {
    color: colours.textSecondary,
  },
  labelSelected: {
    color: colours.primaryInk,
  },
});
