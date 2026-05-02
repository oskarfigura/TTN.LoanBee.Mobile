import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colours, layout, radii, spacing } from '@/theme';

const logo = require('../../../assets/bee-logo.png');

interface Props {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  variant?: 'top-level' | 'detail' | 'editor';
}

export const ScreenHeader = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  variant = 'top-level',
}: Props) => {
  const insets = useSafeAreaInsets();
  const compact = variant !== 'top-level';

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandRow}>
        <View style={styles.leading}>
          {leftAction ? <View style={styles.actionWrap}>{leftAction}</View> : null}
          <View style={[styles.brandLockup, compact && styles.brandLockupCompact]}>
            <View style={[styles.logoBadge, compact && styles.logoBadgeCompact]}>
              <Image source={logo} style={[styles.logo, compact && styles.logoCompact]} resizeMode="contain" />
            </View>
            <View style={styles.brandCopy}>
              <AppText variant="labelSm" tone="muted" style={styles.brandEyebrow}>LoanBee</AppText>
              <AppText
                variant={compact ? 'title2' : 'title1'}
                tone="accent"
                style={styles.brandText}
                numberOfLines={2}
              >
                {title}
              </AppText>
            </View>
          </View>
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      {subtitle ? (
        <AppText variant="bodyMd" tone="muted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colours.background,
    paddingHorizontal: layout.headerPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.borderSoft,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flex: 1,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
  },
  brandLockupCompact: {
    gap: spacing.sm,
  },
  brandCopy: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  brandEyebrow: {
    textTransform: 'uppercase',
  },
  brandText: {
    marginTop: 2,
  },
  actionWrap: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.primarySoft,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
  },
  logoBadgeCompact: {
    width: 32,
    height: 32,
  },
  logo: {
    width: 19,
    height: 19,
  },
  logoCompact: {
    width: 17,
    height: 17,
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.sm,
    maxWidth: '92%',
  },
});
