import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colours, fonts, fontSizes, fontWeights, layout, spacing } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  variant?: 'top-level' | 'detail' | 'editor';
  showBrand?: boolean;
  showBottomBorder?: boolean;
  backgroundColor?: string;
  titleAlign?: 'left' | 'center';
}

export const ScreenHeader = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  variant = 'top-level',
  showBrand = false,
  showBottomBorder = true,
  backgroundColor,
  titleAlign = 'left',
}: Props) => {
  const insets = useSafeAreaInsets();
  const compact = variant !== 'top-level';
  const centeredTitle = titleAlign === 'center' && !showBrand;

  return (
    <View style={[
      styles.header,
      !showBottomBorder && styles.headerNoBorder,
      { paddingTop: insets.top + 8 },
      backgroundColor ? { backgroundColor } : null,
    ]}>
      <View style={[styles.brandRow, centeredTitle && styles.brandRowCentered]}>
        {centeredTitle ? (
          <>
            <View style={styles.centerActionSlot}>
              {leftAction ? <View style={styles.centerActionWrap}>{leftAction}</View> : null}
            </View>
            <View style={styles.centerTitleWrap}>
              <AppText variant="title2" style={[styles.plainTitle, styles.centerTitle]} numberOfLines={1}>
                {title}
              </AppText>
            </View>
            <View style={styles.centerActionSlot}>
              {rightAction ? <View style={styles.centerRightAction}>{rightAction}</View> : null}
            </View>
          </>
        ) : (
          <>
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
          </>
        )}
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
  headerNoBorder: {
    borderBottomWidth: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRowCentered: {
    minHeight: 46,
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
  centerTitleWrap: {
    position: 'absolute',
    left: 58,
    right: 58,
    alignItems: 'center',
  },
  centerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: 25,
    textAlign: 'center',
  },
  centerActionSlot: {
    width: 58,
    minHeight: 42,
    justifyContent: 'center',
    zIndex: 1,
  },
  centerActionWrap: {
    alignSelf: 'flex-start',
  },
  centerRightAction: {
    alignSelf: 'flex-end',
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
