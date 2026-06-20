import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { colours, radii } from '@/shared/ui/theme';

interface Props {
  onPress: () => void;
  isExporting: boolean;
  style?: StyleProp<ViewStyle>;
}

// Shared pill button for the ad-gated amortisation-schedule CSV export. Used by the
// calculator result view (loan & mortgage calculations, non-mortgage saved loans) and
// the saved-mortgage tracked schedule so the control stays visually identical and the
// busy/disabled handling lives in one place. The flow itself is in useAmortisationCsvExport.
export const ExportCsvButton = ({ onPress, isExporting, style }: Props) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.button, isExporting && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={isExporting}
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <AppText variant="labelSm" tone="accent" style={styles.label}>
        {isExporting ? t('results.exportingCsv') : t('results.exportCsv')}
      </AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    textTransform: 'uppercase',
  },
});
