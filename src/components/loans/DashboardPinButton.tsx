import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, IconName } from '@/components/ui/Icon';
import { colours } from '@/theme';

interface Props {
  pinned: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const DashboardPinButton = ({ pinned, onPress, style }: Props) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.button, pinned ? styles.buttonPinned : styles.buttonUnpinned, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={pinned ? t('mortgage.unpinHint') : t('mortgage.pinToDashboard')}
      accessibilityState={{ selected: pinned }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.88}
    >
      <Icon icon={IconName.PinIcon} color={pinned ? colours.secondary : colours.primary} size={16} strokeWidth={1.8} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexShrink: 0,
  },
  buttonUnpinned: {
    backgroundColor: colours.surfaceRaised,
    borderColor: colours.border,
  },
  buttonPinned: {
    backgroundColor: colours.successSurface,
    borderColor: colours.successBorder,
  },
});
