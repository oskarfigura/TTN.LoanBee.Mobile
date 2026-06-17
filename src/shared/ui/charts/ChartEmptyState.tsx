import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/shared/ui/theme';

interface Props {
  height?: number;
}

/**
 * Placeholder shown in place of a chart when there is too little data to plot
 * (e.g. a loan shorter than the chart's minimum yearly samples). Keeps the
 * surrounding chart card from rendering a titled-but-empty body.
 */
export const ChartEmptyState = ({ height = 196 }: Props) => {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, { height }]}>
      <Text style={styles.text}>{t('results.chartEmptyState')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    textAlign: 'center',
  },
});
