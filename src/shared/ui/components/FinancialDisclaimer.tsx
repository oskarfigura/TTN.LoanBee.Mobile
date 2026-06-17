import React, { useState } from 'react';
import { TouchableOpacity, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { colours, elevation, radii, spacing } from '@/shared/ui/theme';

interface Props {
  dismissible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const FinancialDisclaimer = ({ dismissible = false, style }: Props) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.accentRail} />
      <View style={styles.contentRow}>
        <TouchableOpacity
          style={styles.summaryButton}
          activeOpacity={0.8}
          onPress={() => setExpanded(value => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <AppText variant="bodySm" tone="muted" style={styles.text}>
            <AppText variant="labelSm" tone="accent" style={styles.label}>{t('disclaimer.label')} </AppText>
            {t('disclaimer.shortText')}{' '}
            <AppText variant="labelMd" tone="accent" style={styles.expandText}>
              {expanded ? t('disclaimer.less') : t('disclaimer.more')}
            </AppText>
          </AppText>
        </TouchableOpacity>
        {dismissible ? (
          <View style={styles.dismissSlot}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setDismissed(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('disclaimer.dismiss')}
              hitSlop={8}
            >
              <AppText variant="labelMd" tone="accent" style={styles.dismissText}>×</AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      {expanded && (
        <View style={styles.expandedPanel}>
          <AppText variant="bodySm" tone="muted" style={styles.fullText}>{t('disclaimer.fullText')}</AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colours.surfaceMuted,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    marginBottom: spacing.md,
    ...elevation.level1,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radii.card,
    borderBottomLeftRadius: radii.card,
    backgroundColor: colours.accent,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryButton: {
    flex: 1,
    paddingVertical: spacing.xxs,
  },
  text: {
    color: colours.textMuted,
  },
  label: {
    textTransform: 'uppercase',
  },
  expandText: {
    lineHeight: 15,
  },
  expandedPanel: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
  fullText: {
    color: colours.textMuted,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.border,
  },
  dismissSlot: {
    width: 32,
    height: 32,
    flexGrow: 0,
    flexShrink: 0,
  },
  dismissText: {
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
  },
});
