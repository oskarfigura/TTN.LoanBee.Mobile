import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import {
  AppTextInput,
  FieldHint,
  FieldLabel,
  InputSurface,
} from '@/components/ui/FormPrimitives';
import { colours, spacing } from '@/theme';
import { formatFriendlyDate, formatIsoDate, parseDateLabelValue } from '@/utils/date';

export interface DatePickerFieldHandle {
  closePicker: () => void;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

const getPickerValue = (value: string): Date => parseDateLabelValue(value) ?? new Date();

export const DatePickerField = forwardRef<DatePickerFieldHandle, Props>(({
  label,
  value,
  onChange,
  hint,
  minimumDate,
  maximumDate,
  disabled,
}, ref) => {
  const { i18n } = useTranslation();
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerValue = getPickerValue(value);
  const displayValue = formatFriendlyDate(value, i18n.language);

  useImperativeHandle(ref, () => ({
    closePicker: () => setPickerVisible(false),
  }));

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setPickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onChange(formatIsoDate(selectedDate));
  };

  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      {disabled ? (
        <InputSurface>
          <AppTextInput
            value={displayValue}
            editable={false}
            placeholder={label}
            style={styles.dateText}
          />
        </InputSurface>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setPickerVisible(current => !current)}
            activeOpacity={0.84}
            accessibilityRole="button"
          >
            <InputSurface>
              <AppTextInput
                value={displayValue}
                editable={false}
                placeholder={label}
                style={styles.dateText}
              />
            </InputSurface>
          </TouchableOpacity>
          {pickerVisible ? (
            <InputSurface style={Platform.OS === 'ios' ? styles.iosSurface : undefined}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleChange}
              />
            </InputSurface>
          ) : null}
        </>
      )}
      <FieldHint>{hint}</FieldHint>
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: spacing.xxs,
  },
  iosSurface: {
    justifyContent: 'center',
  },
  dateText: {
    color: colours.textPrimary,
  },
});
