import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from './AppText';
import { colours, elevation, radii, spacing } from '@/theme';

interface Props {
  title?: string;
  message: string;
  tone?: 'info' | 'warning';
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
}

export const DismissibleBanner = ({ title, message, tone = 'info', action, onDismiss }: Props) => {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const toneStyle = tone === 'warning' ? styles.warning : styles.info;

  return (
    <View style={[styles.container, toneStyle]}>
      <View style={styles.body}>
        {title ? (
          <AppText variant="labelMd" tone="accent" style={styles.title}>{title}</AppText>
        ) : null}
        <AppText variant="bodySm" tone="muted">{message}</AppText>
        {action ? (
          <TouchableOpacity onPress={action.onPress} activeOpacity={0.84} style={styles.actionButton}>
            <AppText variant="labelMd" tone="accent">{action.label}</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity onPress={dismiss} activeOpacity={0.7} style={styles.close} hitSlop={8}>
        <AppText variant="labelMd" tone="muted">×</AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceRaised,
    ...elevation.level1,
  },
  info: {
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceMuted,
  },
  warning: {
    borderColor: colours.honeySoft,
    backgroundColor: colours.warningSurface,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    marginBottom: spacing.xxxs,
  },
  actionButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  close: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
