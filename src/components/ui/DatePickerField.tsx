import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  AppTextInput,
  FieldHint,
  FieldLabel,
  InputSurface,
} from '@/components/ui/FormPrimitives';
import { colours, spacing } from '@/theme';
import { formatIsoDate, parseDateLabelValue } from '@/utils/date';

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

export const DatePickerField = ({
  label,
  value,
  onChange,
  hint,
  minimumDate,
  maximumDate,
  disabled,
}: Props) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerValue = getPickerValue(value);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setPickerVisible(false);
    }

    if (event.type === 'dismissed' || !selectedDate) return;

    onChange(formatIsoDate(selectedDate));
  };

  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      {disabled ? (
        <InputSurface>
          <AppTextInput
            value={value}
            editable={false}
            placeholder="YYYY-MM-DD"
            style={styles.dateText}
          />
        </InputSurface>
      ) : Platform.OS === 'ios' ? (
        <InputSurface style={styles.iosSurface}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="compact"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
          />
        </InputSurface>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.84}
            accessibilityRole="button"
          >
            <InputSurface>
              <AppTextInput
                value={value}
                editable={false}
                placeholder="YYYY-MM-DD"
                style={styles.dateText}
              />
            </InputSurface>
          </TouchableOpacity>
          {pickerVisible ? (
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="default"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={handleChange}
            />
          ) : null}
        </>
      )}
      <FieldHint>{hint}</FieldHint>
    </View>
  );
};

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
