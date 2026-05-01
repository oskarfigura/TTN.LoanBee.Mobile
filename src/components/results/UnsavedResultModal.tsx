import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

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
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>{t('results.unsavedTitle')}</Text>
          <Text style={styles.message}>{t('results.unsavedMessage')}</Text>
          <Button label={t('results.saveBeforeLeaving')} onPress={onSave} style={styles.primaryAction} />
          <Button label={t('results.keepEditing')} onPress={onKeepEditing} variant="secondary" style={styles.secondaryAction} />
          <Button label={t('results.discard')} onPress={onDiscard} variant="ghost" style={styles.ghostAction} />
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
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.focusRing,
    marginBottom: 14,
  },
  iconText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colours.textPrimary,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    lineHeight: 22,
    marginTop: 8,
  },
  primaryAction: { marginTop: 20 },
  secondaryAction: { marginTop: 10 },
  ghostAction: { marginTop: 4 },
});
