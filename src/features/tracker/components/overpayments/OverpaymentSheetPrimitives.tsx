import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@oskarfigura/ui-native';
import { FieldLabel } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';

export type ImpactRow = { label: string; value: string };

export const formatOverpaymentDuration = (totalMonths: number, yearsLabel: string, monthsLabel: string): string => {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} ${monthsLabel}`;
  if (months === 0) return `${years} ${yearsLabel}`;
  return `${years} ${yearsLabel} ${months} ${monthsLabel}`;
};

interface OverpaymentSheetModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number;
  closeLabel?: string;
}

export const OverpaymentSheetModal = ({
  visible,
  title,
  onClose,
  children,
  footer,
  maxHeightRatio,
  closeLabel,
}: OverpaymentSheetModalProps) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <KeyboardAvoidingView behavior="padding" style={styles.kav}>
          <Pressable
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing['3xl']) },
              maxHeightRatio ? { maxHeight: height * maxHeightRatio } : null,
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <AppText variant="title2" style={styles.heading}>
                {title}
              </AppText>
              {closeLabel ? (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                >
                  <Icon icon={IconName.XCloseIcon} size={19} color={colours.primary} strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

export const OverpaymentFieldGroup = ({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.fieldGroup, style]}>
    <FieldLabel>{label}</FieldLabel>
    {children}
  </View>
);

export const OverpaymentImpactCard = ({
  title,
  rows,
}: {
  title: string;
  rows: ImpactRow[];
}) => (
  <View style={styles.impactCard}>
    <AppText variant="labelSm" tone="muted">
      {title}
    </AppText>
    <View style={styles.impactRows}>
      {rows.map(row => (
        <View key={row.label} style={styles.impactRow}>
          <AppText variant="bodySm" tone="muted">{row.label}</AppText>
          <AppText variant="labelMd" tone="success">{row.value}</AppText>
        </View>
      ))}
    </View>
  </View>
);

export const OverpaymentSheetActions = ({
  leadingAction,
  primaryAction,
}: {
  leadingAction: React.ReactNode;
  primaryAction: React.ReactNode;
}) => (
  <View style={styles.actions}>
    <View style={styles.actionButton}>{leadingAction}</View>
    <View style={styles.actionButton}>{primaryAction}</View>
  </View>
);

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colours.modalScrim,
    justifyContent: 'flex-end',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colours.background,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    padding: spacing.xl,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  heading: {
    flex: 1,
  },
  header: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colours.surfaceMuted,
  },
  content: {
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  impactCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.successBorder,
    backgroundColor: colours.successSurface,
    padding: layout.cardPadding,
    gap: spacing.sm,
  },
  impactRows: {
    gap: spacing.xs,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
