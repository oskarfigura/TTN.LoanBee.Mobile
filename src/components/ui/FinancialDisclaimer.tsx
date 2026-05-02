import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { colours, radii, spacing } from '@/theme';

export const FinancialDisclaimer = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
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
      {expanded && (
        <AppText variant="bodySm" tone="muted" style={styles.fullText}>{t('disclaimer.fullText')}</AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colours.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  text: {
  },
  label: {
    textTransform: 'uppercase',
  },
  link: {
    textDecorationLine: 'underline',
  },
  fullText: {
    marginTop: spacing.xs,
  },
});
