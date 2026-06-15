import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/components/ui/Icon';
import { colours, layout, radii, spacing } from '@/theme';

export type ChartHelpContent = {
  title: string;
  body: string;
};

interface ChartHelpButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ChartHelpButton = ({
  accessibilityLabel,
  onPress,
  style,
}: ChartHelpButtonProps) => {
  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon icon={IconName.InfoCircleIcon} size={18} color={colours.primary} strokeWidth={2} />
    </TouchableOpacity>
  );
};

interface ChartHelpDrawerProps {
  visible: boolean;
  content: ChartHelpContent | null;
  closeLabel: string;
  onClose: () => void;
}

export const ChartHelpDrawer = ({
  visible,
  content,
  closeLabel,
  onClose,
}: ChartHelpDrawerProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={styles.scrim} onPress={onClose}>
      <Pressable style={styles.sheetOuter}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <AppText variant="title2" style={styles.title}>
              {content?.title ?? ''}
            </AppText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
            >
              <AppText variant="labelSm" tone="accent" style={styles.closeText}>
                {closeLabel}
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="bodyMd" tone="muted" style={styles.body}>
              {content?.body ?? ''}
            </AppText>
          </ScrollView>
        </SafeAreaView>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colours.modalScrim,
  },
  sheetOuter: {
    maxHeight: '78%',
  },
  sheet: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colours.borderSoft,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    color: colours.primary,
  },
  closeButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  closeText: {
    textTransform: 'uppercase',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingBottom: spacing.md,
  },
  body: {
    lineHeight: 23,
  },
});
