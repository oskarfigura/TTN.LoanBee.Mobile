import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonVariant, Card } from '@oskarfigura/ui-native';
import { Icon, IconName } from './Icon';
import { colours, spacing } from '@/shared/ui/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DestructiveConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <Pressable style={styles.scrim} onPress={onCancel}>
      <Pressable style={styles.shell}>
        <Card variant="modal" style={styles.card}>
          <View style={styles.copy}>
            <AppText variant="title2">{title}</AppText>
            <AppText variant="bodySm" tone="muted" style={styles.message}>
              {message}
            </AppText>
          </View>
          <View style={styles.actions}>
            <Button label={cancelLabel} onPress={onCancel} variant={ButtonVariant.Secondary} style={styles.action} />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={ButtonVariant.Destructive}
              leftIcon={<Icon icon={IconName.TrashIcon} color={colours.white} size={16} />}
              style={styles.action}
            />
          </View>
        </Card>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colours.modalScrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  shell: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    padding: spacing.xl,
    borderColor: colours.surfaceStrong,
  },
  copy: {
    gap: spacing.xs,
  },
  message: {
    minHeight: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  action: {
    flex: 1,
  },
});
