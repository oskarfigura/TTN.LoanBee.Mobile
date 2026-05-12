import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { MenuIcon } from '@/components/ui/Icons';
import { colours, fontFaces, fontSizes, layout, radii, spacing } from '@/theme';

type DashboardRoute = '/saved' | '/settings' | '/about';

interface Props {
  onNewCalculation: () => void;
  onNavigate: (href: DashboardRoute) => void;
}

const BeeMark = () => (
  <Svg width={28} height={28} viewBox="0 0 32 32" fill="none">
    <Path
      d="M8.4 15.2c-2.8-2.9-2.6-6.3-.2-7.1 2.2-.8 4.2 1 5.4 4.4"
      fill={colours.secondarySoft}
      fillOpacity={0.72}
    />
    <Path
      d="M23.6 15.2c2.8-2.9 2.6-6.3.2-7.1-2.2-.8-4.2 1-5.4 4.4"
      fill={colours.secondarySoft}
      fillOpacity={0.72}
    />
    <Path
      d="M9.5 17.4c0-4 2.9-7.1 6.5-7.1s6.5 3.1 6.5 7.1-2.9 7.4-6.5 7.4-6.5-3.3-6.5-7.4z"
      fill={colours.honey}
    />
    <Path
      d="M13.5 10.9c-1.4-1.2-1.8-2.4-1.2-3.6M18.5 10.9c1.4-1.2 1.8-2.4 1.2-3.6M12.4 15.4h7.2M12.2 19.1h7.6"
      stroke={colours.primaryDark}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Circle cx={13.4} cy={14} r={0.8} fill={colours.primaryDark} />
    <Circle cx={18.6} cy={14} r={0.8} fill={colours.primaryDark} />
  </Svg>
);

const DashboardMenuItem = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
  >
    <AppText variant="bodyMd" style={styles.menuItemText} numberOfLines={1}>
      {label}
    </AppText>
  </TouchableOpacity>
);

export const DashboardHeader = ({ onNewCalculation, onNavigate }: Props) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const closeMenu = () => setMenuVisible(false);
  const selectNewCalculation = () => {
    closeMenu();
    onNewCalculation();
  };
  const selectRoute = (href: DashboardRoute) => {
    closeMenu();
    onNavigate(href);
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <BeeMark />
            <View style={styles.wordmarkRow}>
              <AppText variant="title2" style={[styles.wordmark, styles.wordmarkLoan]} numberOfLines={1}>
                Loan
              </AppText>
              <AppText variant="title2" style={[styles.wordmark, styles.wordmarkBee]} numberOfLines={1}>
                Bee
              </AppText>
            </View>
          </View>
          <HeaderIconButton
            onPress={() => setMenuVisible(true)}
            accessibilityLabel={t('navigation.openMenu')}
          >
            <MenuIcon color={colours.primary} size={20} strokeWidth={2} />
          </HeaderIconButton>
        </View>
      </View>
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuScrim} onPress={closeMenu}>
          <Pressable style={[styles.menu, { top: insets.top + 56 }]}>
            <AppText variant="labelSm" tone="muted" style={styles.menuSectionLabel}>
              {t('mortgage.quickActions')}
            </AppText>
            <DashboardMenuItem label={t('results.newCalculation')} onPress={selectNewCalculation} />
            <View style={styles.menuDivider} />
            <AppText variant="labelSm" tone="muted" style={styles.menuSectionLabel}>
              {t('navigation.links')}
            </AppText>
            <DashboardMenuItem label={t('tabs.saved')} onPress={() => selectRoute('/saved')} />
            <DashboardMenuItem label={t('tabs.settings')} onPress={() => selectRoute('/settings')} />
            <DashboardMenuItem label={t('tabs.about')} onPress={() => selectRoute('/about')} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  headerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: spacing.xs,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmark: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
    letterSpacing: 0,
  },
  wordmarkLoan: {
    color: colours.primaryDark,
  },
  wordmarkBee: {
    color: colours.honey,
  },
  menuScrim: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    right: layout.headerPadding,
    width: 236,
    paddingVertical: spacing.xs,
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 8,
  },
  menuSectionLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
    textTransform: 'uppercase',
  },
  menuItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  menuItemText: {
    color: colours.textPrimary,
  },
  menuDivider: {
    height: 1,
    marginVertical: spacing.xs,
    backgroundColor: colours.border,
  },
});
