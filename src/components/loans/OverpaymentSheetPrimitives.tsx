import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { FieldLabel } from '@/components/ui/FormPrimitives';
import { colours, radii, spacing } from '@/theme';

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
}

export const OverpaymentSheetModal = ({
  visible,
  title,
  onClose,
  children,
  footer,
  maxHeightRatio,
}: OverpaymentSheetModalProps) => {
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Pressable
            style={[
              styles.sheet,
              maxHeightRatio ? { maxHeight: height * maxHeightRatio } : null,
            ]}
          >
            <View style={styles.handle} />
            <AppText variant="title2" style={styles.heading}>
              {title}
            </AppText>
            <View style={styles.content}>
              {children}
            </View>
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
  rows: Array<{ label: string; value: string }>;
}) => (
  <Card style={styles.impactCard}>
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
  </Card>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colours.background,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
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
    marginBottom: spacing.lg,
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
    borderColor: colours.successBorder,
    backgroundColor: colours.successSurface,
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
