import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colours, fonts, fontWeights, layout, spacing } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  variant?: 'top-level' | 'detail' | 'editor';
  showBrand?: boolean;
}

export const ScreenHeader = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  variant = 'top-level',
  showBrand = false,
}: Props) => {
  const insets = useSafeAreaInsets();
  const compact = variant !== 'top-level';

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandRow}>
        <View style={styles.leading}>
          {leftAction ? <View style={styles.actionWrap}>{leftAction}</View> : null}
          {showBrand ? (
            <View style={styles.brandCopy}>
              <View style={styles.wordmarkRow}>
                <AppText variant="display" style={[styles.wordmark, styles.wordmarkLoan]} numberOfLines={1}>
                  Loan
                </AppText>
                <View style={styles.wordmarkBeeWrap}>
                  <AppText
                    variant="display"
                    style={[styles.wordmark, styles.wordmarkBee, styles.wordmarkBeeLayerOne]}
                    numberOfLines={1}
                    accessible={false}
                  >
                    Bee
                  </AppText>
                  <AppText variant="display" style={[styles.wordmark, styles.wordmarkBee]} numberOfLines={1}>
                    Bee
                  </AppText>
                </View>
              </View>
              <AppText variant="bodyLg" tone="muted" style={styles.brandSubtitle} numberOfLines={2}>
                {title}
              </AppText>
            </View>
          ) : (
            <View style={[styles.brandCopy, styles.brandCopyCompact]}>
              <AppText variant={compact ? 'title2' : 'title1'} style={styles.plainTitle} numberOfLines={2}>
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
    flex: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
  },
  wordmark: {
    fontFamily: fonts.brand,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  wordmarkLoan: {
    fontFamily: fonts.body,
    fontSize: 36,
    lineHeight: 36,
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.8,
    color: colours.primaryDark,
    marginBottom: 4,
  },
  wordmarkBee: {
    fontSize: 40,
    lineHeight: 42,
    color: colours.honey,
    marginLeft: -8,
    textShadowColor: colours.honey,
    textShadowOffset: { width: 0.5, height: 0.1 },
    textShadowRadius: 0.1,
  },
  wordmarkBeeWrap: {
    position: 'relative',
  },
  wordmarkBeeLayerOne: {
    position: 'absolute',
    left: 0.7,
    top: 0.15,
  },
  brandSubtitle: {
    marginTop: 0,
    maxWidth: '92%',
  },
  plainTitle: {
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
