import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colours, fontWeights, layout, radii, spacing } from '@/theme';

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
          {compact ? (
            <View style={[styles.brandCopy, styles.brandCopyCompact]}>
              <AppText variant="title2" style={styles.compactTitle} numberOfLines={2}>
                {title}
              </AppText>
            </View>
          ) : (
            <View style={styles.brandCopy}>
              <View style={styles.wordmarkRow}>
                <AppText variant="title2" style={styles.wordmarkLoan}>
                  Loan
                </AppText>
                <View style={styles.wordmarkBeePill}>
                  <AppText variant="labelMd" tone="inverse" style={styles.wordmarkBeeText}>
                    Bee
                  </AppText>
                </View>
                <View style={styles.inlineBeeWrap}>
                  <Image source={logo} style={styles.inlineBee} resizeMode="contain" />
                </View>
              </View>
              <AppText variant="title1" style={styles.brandTitle} numberOfLines={2}>
                {title}
              </AppText>
            </View>
          )}
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
  brandCopy: {
    flex: 1,
  },
  brandCopyCompact: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  wordmarkLoan: {
    color: colours.primaryInk,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.2,
  },
  wordmarkBeePill: {
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colours.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  wordmarkBeeText: {
    fontWeight: fontWeights.bold,
  },
  inlineBeeWrap: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
  },
  inlineBee: {
    width: 14,
    height: 14,
  },
  brandTitle: {
    marginTop: spacing.xs,
    color: colours.textPrimary,
    fontWeight: fontWeights.extrabold,
  },
  compactTitle: {
    color: colours.textPrimary,
  },
  actionWrap: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.sm,
    maxWidth: '92%',
  },
});
