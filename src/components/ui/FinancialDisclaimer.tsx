import React, { useState } from 'react';
import { TouchableOpacity, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { colours, radii, spacing } from '@/theme';

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
      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={styles.summaryButton}
          activeOpacity={0.8}
          onPress={() => setExpanded(value => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <AppText variant="bodySm" tone="muted" style={styles.text}>
            <AppText variant="labelSm" tone="accent" style={styles.label}>{t('disclaimer.label')} </AppText>
            {t('disclaimer.shortText')} <AppText variant="labelMd" tone="accent" style={styles.link}>{expanded ? t('disclaimer.less') : t('disclaimer.more')}</AppText>
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
            >
              <AppText variant="labelMd" tone="accent" style={styles.dismissText}>X</AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      {expanded && (
        <AppText variant="bodySm" tone="muted" style={styles.fullText}>{t('disclaimer.fullText')}</AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colours.surfaceMuted,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  summaryButton: {
    flex: 1,
  },
  text: {},
  label: {
    textTransform: 'uppercase',
  },
  link: {
    textDecorationLine: 'underline',
  },
  fullText: {
    marginTop: spacing.xs,
  },
  dismissButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.border,
  },
  dismissSlot: {
    width: 26,
    height: 26,
    flexGrow: 0,
    flexShrink: 0,
  },
  dismissText: {
    lineHeight: 15,
    textAlign: 'center',
  },
});
