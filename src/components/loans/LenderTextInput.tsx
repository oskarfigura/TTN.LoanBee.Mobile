import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes } from '@/theme';

interface Props {
  value: string;
  onChange: (lender: string) => void;
  placeholder?: string;
}

export const LenderTextInput = ({ value, onChange, placeholder }: Props) => {
  const { t } = useTranslation();

  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? t('save.lenderPlaceholder')}
      placeholderTextColor={colours.textSecondary}
      autoCapitalize="words"
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    minHeight: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
});
