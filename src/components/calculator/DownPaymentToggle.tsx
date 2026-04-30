import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DownPaymentType } from '@/core/DownPaymentType';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

interface Props {
  value: DownPaymentType;
  onChange: (v: DownPaymentType) => void;
}

export const DownPaymentToggle = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {([DownPaymentType.CASH, DownPaymentType.PERCENT] as const).map(type => (
        <TouchableOpacity
          key={type}
          style={[styles.btn, value === type && styles.btnActive]}
          onPress={() => onChange(type)}
          activeOpacity={0.8}
        >
          <Text style={[styles.label, value === type && styles.labelActive]}>
            {type === DownPaymentType.CASH ? t('calculator.cash') : '%'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    height: 36,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: colours.primary,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  labelActive: {
    color: colours.white,
  },
});
