import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colours, fontFaces, fontSizes, layout, radii, spacing } from '@/theme';

interface Props {
  title?: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  variant?: 'top-level' | 'detail' | 'editor';
  subtitleVariant?: 'plain' | 'context';
  showBottomBorder?: boolean;
  backgroundColor?: string;
}

export const ScreenHeader = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  variant = 'top-level',
  subtitleVariant = 'plain',
  showBottomBorder = false,
  backgroundColor,
}: Props) => {
  const insets = useSafeAreaInsets();
  const centeredTitle = variant !== 'top-level';
  const titleVariant = variant === 'top-level' ? 'title1' : 'title2';

  return (
    <View style={[
      styles.header,
      !showBottomBorder && styles.headerNoBorder,
      { paddingTop: insets.top + 8 },
      backgroundColor ? { backgroundColor } : null,
    ]}>
      <View style={[styles.headerRow, centeredTitle && styles.headerRowCentered]}>
        {centeredTitle ? (
          <>
            <View style={styles.centerActionSlot}>
              {leftAction ? <View style={styles.centerActionWrap}>{leftAction}</View> : null}
            </View>
            {title ? (
              <View style={styles.centerTitleWrap}>
                <AppText variant="title2" style={[styles.plainTitle, styles.centerTitle]} numberOfLines={1}>
                  {title}
                </AppText>
              </View>
            ) : null}
            <View style={styles.centerActionSlot}>
              {rightAction ? <View style={styles.centerRightAction}>{rightAction}</View> : null}
            </View>
          </>
        ) : (
          <>
            <View style={styles.leading}>
              {leftAction ? <View style={styles.actionWrap}>{leftAction}</View> : null}
              {title ? (
                <View style={styles.titleCopy}>
                  <AppText variant={titleVariant} style={styles.plainTitle} numberOfLines={2}>
                    {title}
                  </AppText>
                </View>
              ) : null}
            </View>
            {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
          </>
        )}
      </View>
      {subtitle && subtitleVariant === 'context' ? (
        <View style={styles.contextSubtitle}>
          <AppText variant="labelMd" tone="accent" style={styles.contextSubtitleText} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
      ) : subtitle ? (
        <AppText
          variant="bodyMd"
          tone="muted"
          style={[styles.subtitle, centeredTitle && styles.centeredSubtitle]}
        >
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
    borderBottomWidth: 0,
    borderBottomColor: colours.borderSoft,
  },
  headerNoBorder: {
    borderBottomWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerRowCentered: {
    minHeight: 46,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flex: 1,
  },
  titleCopy: {
    flex: 1,
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
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
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
  centeredSubtitle: {
    maxWidth: '86%',
    alignSelf: 'center',
    textAlign: 'center',
  },
  contextSubtitle: {
    alignSelf: 'center',
    maxWidth: '82%',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radii.chip,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
  },
  contextSubtitleText: {
    textAlign: 'center',
  },
});
