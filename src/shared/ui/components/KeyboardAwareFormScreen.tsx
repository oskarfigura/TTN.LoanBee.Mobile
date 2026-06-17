import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { HeaderCloseAction } from '@/shared/ui/components/HeaderCloseAction';
import { colours, layout, spacing } from '@/shared/ui/theme';

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pinned actions. Rendered in a bar that rises to sit above the keyboard. */
  footer?: React.ReactNode;
  headerRightAction?: React.ReactNode;
  closeAccessibilityLabel?: string;
}

// Distance kept between a focused input and the bottom edge so the field clears
// the pinned footer bar as well as the keyboard itself.
const FOCUSED_FIELD_CLEARANCE = spacing['4xl'] + spacing.lg;

/**
 * Full-screen form shell with correct cross-platform keyboard handling. Wraps
 * `react-native-keyboard-controller` so the focused input scrolls above the
 * keyboard and the action bar sticks to the top of the keyboard — the shared
 * fix for forms that previously relied on the bare RN `KeyboardAvoidingView`
 * (which does nothing on Android with `behavior` unset).
 */
export const KeyboardAwareFormScreen = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  headerRightAction,
  closeAccessibilityLabel,
}: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        variant="editor"
        leftAction={(
          <HeaderCloseAction onPress={onClose} accessibilityLabel={closeAccessibilityLabel} />
        )}
        rightAction={headerRightAction}
      />
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={FOCUSED_FIELD_CLEARANCE}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            {footer}
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colours.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
});
