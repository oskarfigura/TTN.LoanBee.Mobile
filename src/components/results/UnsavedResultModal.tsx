import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, ButtonVariant } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/components/ui/Icon';
import { colours, fontFaces, fontSizes } from '@/theme';

interface Props {
  visible: boolean;
  onKeepEditing: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export const UnsavedResultModal = ({
  visible,
  onKeepEditing,
  onSave,
  onDiscard,
}: Props) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepEditing}>
      <Pressable style={styles.scrim} onPress={onKeepEditing}>
        <Pressable style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Icon icon={IconName.AlertTriangleIcon} color={colours.primary} size={22} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{t('results.unsavedTitle')}</Text>
            </View>
          </View>
          <Button
            label={t('results.saveBeforeLeaving')}
            onPress={onSave}
            leftIcon={<Icon icon={IconName.SaveIcon} color={colours.white} size={18} />}
            style={styles.primaryAction}
          />
          <Button
            label={t('results.keepEditing')}
            onPress={onKeepEditing}
            variant={ButtonVariant.Secondary}
            leftIcon={<Icon icon={IconName.EditIcon} color={colours.primaryInk} size={18} />}
            style={styles.secondaryAction}
          />
          <Button
            label={t('results.discard')}
            onPress={onDiscard}
            variant={ButtonVariant.Ghost}
            leftIcon={<Icon icon={IconName.TrashIcon} color={colours.primary} size={18} />}
            style={styles.ghostAction}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colours.modalScrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: colours.white,
    padding: 20,
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.focusRing,
    marginRight: 14,
  },
  copy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    ...fontFaces.heading.extrabold,
    fontSize: fontSizes.xl,
    lineHeight: 30,
    color: colours.textPrimary,
    textAlign: 'left',
  },
  primaryAction: { marginTop: 20 },
  secondaryAction: { marginTop: 10 },
  ghostAction: { marginTop: 4 },
});
