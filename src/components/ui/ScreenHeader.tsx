import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

const logo = require('../../../assets/bee-logo.png');

interface Props {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const ScreenHeader = ({ title, subtitle, leftAction, rightAction }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandRow}>
        <View style={styles.leading}>
          {leftAction ? <View style={styles.actionWrap}>{leftAction}</View> : null}
          <View style={styles.brandLockup}>
            <View style={styles.logoBadge}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandEyebrow}>LoanBee</Text>
              <Text style={styles.brandText} numberOfLines={2}>{title}</Text>
            </View>
          </View>
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colours.background,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
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
  brandCopy: {
    marginLeft: 10,
    flex: 1,
  },
  brandEyebrow: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colours.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  brandText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.primary,
    marginTop: 2,
    lineHeight: 24,
  },
  actionWrap: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.primary,
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  logo: {
    width: 22,
    height: 22,
  },
  rightAction: {
    marginLeft: 12,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: '92%',
  },
});
