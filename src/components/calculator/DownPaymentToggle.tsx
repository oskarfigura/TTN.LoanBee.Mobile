import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DownPaymentType } from '@/core/DownPaymentType';
import { SegmentedControl } from '@oskarfigura/ui-native';

interface Props {
  value: DownPaymentType;
  onChange: (v: DownPaymentType) => void;
  currencySymbol: string;
}

export const DownPaymentToggle = ({ value, onChange, currencySymbol }: Props) => (
  <View style={styles.container}>
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={[
        { label: currencySymbol, value: DownPaymentType.CASH },
        { label: '%', value: DownPaymentType.PERCENT },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: 88,
  },
});
