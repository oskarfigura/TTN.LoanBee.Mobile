import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextInput, InputSurface } from '@/components/ui/FormPrimitives';

interface Props {
  value: string;
  onChange: (lender: string) => void;
  placeholder?: string;
}

export const LenderTextInput = ({ value, onChange, placeholder }: Props) => {
  const { t } = useTranslation();

  return (
    <InputSurface>
      <AppTextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? t('save.lenderPlaceholder')}
        autoCapitalize="words"
      />
    </InputSurface>
  );
};
