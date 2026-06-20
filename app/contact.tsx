import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { Card } from '@oskarfigura/ui-native';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import {
  ContactCategory,
  SUPPORT_EMAIL,
} from '@/shared/lib/services/contact/contactSupport';
import { openSupportEmail } from '@/shared/lib/services/contact/openSupportEmail';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CategoryDef {
  category: ContactCategory;
  icon: IconName;
}

const CATEGORIES: CategoryDef[] = [
  { category: 'support', icon: IconName.LifebuoyIcon },
  { category: 'feedback', icon: IconName.MessageSmileCircleIcon },
  { category: 'sales', icon: IconName.MessageDotsCircleIcon },
  { category: 'question', icon: IconName.MessageQuestionCircleIcon },
];

export default function ContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handlePress = (category: ContactCategory) => {
    openSupportEmail({
      subject: t(`contact.categories.${category}.subject`),
      promptLine: t(`contact.categories.${category}.prompt`),
      fallbackTitle: t('contact.fallbackTitle'),
      fallbackMessage: t('contact.fallbackMessage'),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('contact.title')}
        variant="detail"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.introCard} variant="status" padding={layout.cardPadding}>
          <AppText variant="title3" style={styles.introTitle}>{t('contact.introTitle')}</AppText>
          <AppText variant="bodySm" tone="muted" style={styles.introBody}>{t('contact.intro')}</AppText>
          <AppText variant="labelSm" tone="muted">{t('contact.sentTo')}</AppText>
          <AppText variant="bodySm" tone="accent">{SUPPORT_EMAIL}</AppText>
        </Card>

        <Card style={styles.section} padding={0}>
          {CATEGORIES.map(({ category, icon }, index) => (
            <React.Fragment key={category}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <TouchableOpacity
                style={styles.row}
                onPress={() => handlePress(category)}
                activeOpacity={0.84}
                accessibilityRole="button"
              >
                <View style={styles.rowIconTile}>
                  <Icon icon={icon} size={20} color={colours.primary} strokeWidth={2} />
                </View>
                <View style={styles.rowCopy}>
                  <AppText variant="labelMd">{t(`contact.categories.${category}.label`)}</AppText>
                  <AppText variant="bodySm" tone="muted">{t(`contact.categories.${category}.body`)}</AppText>
                </View>
                <View style={styles.rowChevron}>
                  <Icon icon={IconName.ChevronRightIcon} size={16} color={colours.textSecondary} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: layout.screenPadding, paddingBottom: 40 },
  introCard: { marginBottom: spacing.md },
  introTitle: { marginBottom: spacing.xxs },
  introBody: { marginBottom: spacing.sm },
  section: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.md,
  },
  rowIconTile: {
    width: 42,
    height: 42,
    borderRadius: radii.status,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceMuted,
  },
  rowCopy: {
    flex: 1,
    gap: spacing.xxxs,
  },
  rowChevron: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceMuted,
  },
  rowDivider: {
    height: 1,
    marginLeft: layout.cardPadding + 42 + spacing.md,
    backgroundColor: colours.border,
  },
});
