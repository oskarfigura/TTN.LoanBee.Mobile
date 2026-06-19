import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@oskarfigura/ui-native';
import { colours, radii, spacing } from '@/shared/ui/theme';

interface ChoiceTabsProps<T extends string> {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}

export const ChoiceTabs = <T extends string>({
  value,
  options,
  onChange,
}: ChoiceTabsProps<T>) => (
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xxs,
    padding: spacing.xxs,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceMuted,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
  },
  optionSelected: {
    backgroundColor: colours.primarySoft,
  },
  optionPressed: {
    opacity: 0.78,
  },
  label: {
    color: colours.textSecondary,
  },
  labelSelected: {
    color: colours.primary,
  },
});
