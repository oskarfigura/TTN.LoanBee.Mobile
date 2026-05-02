import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { PillSelector } from '@/components/ui/FormPrimitives';

interface Props {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export const CurrencyPicker = ({ value, onChange }: Props) => (
  <View style={styles.container}>
    <PillSelector
      value={value}
      onChange={onChange}
      options={CURRENCIES.map(currency => ({
        label: `${currency.symbol} ${currency.code}`,
        value: currency.code,
      }))}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
});
