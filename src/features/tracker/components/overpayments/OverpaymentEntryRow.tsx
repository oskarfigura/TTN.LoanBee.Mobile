import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { AppTextInput, FieldError, InputAffix, InputSurface } from '@oskarfigura/ui-native';
import { colours, spacing } from '@/shared/ui/theme';
import { formatFriendlyDate, formatIsoDate, parseDateLabelValue } from '@/shared/lib/utils/date';

export type OverpaymentRow = { id: string; date: string; amount: string };

type Props = {
  row: OverpaymentRow;
  currencySymbol: string;
  minimumDate?: Date;
  maximumDate?: Date;
  dateError?: string;
  amountError?: string;
  onDateChange: (id: string, date: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onRemove: (id: string) => void;
};

export const OverpaymentEntryRow = ({
  row,
  currencySymbol,
  minimumDate,
  maximumDate,
  dateError,
  amountError,
  onDateChange,
  onAmountChange,
  onRemove,
}: Props) => {
  const { i18n } = useTranslation();
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerValue = parseDateLabelValue(row.date) ?? new Date();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setPickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onDateChange(row.id, formatIsoDate(selectedDate));
  };

  return (
    <View style={styles.overpaymentRow}>
      <View style={styles.overpaymentDateInput}>
        <>
          <TouchableOpacity onPress={() => setPickerVisible(current => !current)} activeOpacity={0.84}>
            <InputSurface>
              <AppTextInput
                value={formatFriendlyDate(row.date, i18n.language)}
                editable={false}
                placeholder=""
                style={styles.dateText}
              />
            </InputSurface>
          </TouchableOpacity>
          {pickerVisible ? (
            <InputSurface style={Platform.OS === 'ios' ? styles.iosDateSurface : undefined}>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleDateChange}
              />
            </InputSurface>
          ) : null}
        </>
        <FieldError message={dateError} />
      </View>
      <View style={styles.overpaymentAmountGroup}>
        <InputSurface style={styles.overpaymentAmountInput} error={Boolean(amountError)}>
          <InputAffix>{currencySymbol}</InputAffix>
          <AppTextInput
            value={row.amount}
            onChangeText={amount => onAmountChange(row.id, amount)}
            keyboardType="decimal-pad"
            placeholder="5000"
          />
        </InputSurface>
        <FieldError message={amountError} />
      </View>
      <TouchableOpacity style={styles.overpaymentRemove} onPress={() => onRemove(row.id)} activeOpacity={0.84}>
        <AppText style={styles.overpaymentRemoveText}>×</AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overpaymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  overpaymentDateInput: { flex: 3 },
  iosDateSurface: { justifyContent: 'center' },
  dateText: { color: colours.textPrimary },
  overpaymentAmountGroup: { flex: 2 },
  overpaymentAmountInput: {},
  overpaymentRemove: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overpaymentRemoveText: {
    color: colours.error,
    fontSize: 22,
  },
});
