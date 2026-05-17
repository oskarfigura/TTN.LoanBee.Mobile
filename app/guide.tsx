import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  CheckIcon,
  CoinsStackedIcon,
  GridIcon,
  ListIcon,
  MessageTextCircleIcon,
  RouteIcon,
  SaveIcon,
  ZapIcon,
} from '@/components/ui/Icons';
import { markGuideSeen } from '@/onboarding/guideState';
import { colours, layout, spacing } from '@/theme';
import { SvgProps } from '@/components/ui/Svg';

interface GuideSection {
  icon: string;
  title: string;
  body: string;
  steps?: string[];
}

type IconComponent = (props: SvgProps) => React.JSX.Element;

const SECTION_ICONS: Record<string, IconComponent> = {
  calculator: CoinsStackedIcon,
  results: ListIcon,
  save: SaveIcon,
  dashboard: GridIcon,
  deals: RouteIcon,
  overpayments: ZapIcon,
};

export default function GuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ firstRun?: string }>();
  const isFirstRun = params.firstRun === '1';
  const sections = t('guide.sections', { returnObjects: true }) as GuideSection[];

  // Reaching this screen counts as having seen the guide, so it never
  // re-triggers on next launch regardless of how the user leaves it
  // (CTA, header back, or the Android hardware back button).
  useEffect(() => {
    markGuideSeen();
  }, []);

  const finish = () => {
    if (isFirstRun) {
      router.replace('/');
    } else {
      router.back();
    }
  };

  const openFaq = () => {
    router.replace('/about');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('guide.title')}
        variant="detail"
        leftAction={<HeaderBackAction onPress={finish} accessibilityLabel={t('common.goBack')} />}
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard} variant="accent" padding={layout.cardPadding}>
          <AppText variant="labelSm" tone="muted" style={styles.kicker}>
            {t('guide.headerKicker')}
          </AppText>
          <AppText variant="title1" style={styles.headerTitle}>
            {t('guide.headerTitle')}
          </AppText>
          <AppText variant="bodyMd" tone="muted">
            {t('guide.headerBody')}
          </AppText>
        </Card>

        {sections.map(section => {
          const Icon = SECTION_ICONS[section.icon] ?? CoinsStackedIcon;
          return (
            <Card key={section.icon} style={styles.sectionCard} padding={layout.cardPadding}>
              <View style={styles.sectionHead}>
                <View style={styles.iconBadge}>
                  <Icon color={colours.primary} size={22} strokeWidth={1.9} />
                </View>
                <AppText variant="title3" style={styles.sectionTitle}>
                  {section.title}
                </AppText>
              </View>
              <AppText variant="bodySm" tone="muted" style={styles.sectionBody}>
                {section.body}
              </AppText>
              {section.steps && section.steps.length > 0 ? (
                <View style={styles.stepList}>
                  {section.steps.map(step => (
                    <View key={step} style={styles.stepRow}>
                      <View style={styles.stepBullet}>
                        <CheckIcon color={colours.success} size={13} strokeWidth={2.4} />
                      </View>
                      <AppText variant="bodySm" tone="muted" style={styles.stepText}>
                        {step}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })}

        <Card style={styles.faqCard} variant="status" padding={layout.cardPadding}>
          <View style={styles.sectionHead}>
            <View style={[styles.iconBadge, styles.faqIconBadge]}>
              <MessageTextCircleIcon color={colours.success} size={22} strokeWidth={1.9} />
            </View>
            <View style={styles.faqHeadCopy}>
              <AppText variant="labelSm" tone="muted" style={styles.kicker}>
                {t('guide.faqKicker')}
              </AppText>
              <AppText variant="title3">{t('guide.faqTitle')}</AppText>
            </View>
          </View>
          <AppText variant="bodySm" tone="muted" style={styles.sectionBody}>
            {t('guide.faqBody')}
          </AppText>
          <Button
            label={t('guide.faqCta')}
            variant="secondary"
            onPress={openFaq}
            style={styles.faqButton}
          />
        </Card>

        <Button
          label={isFirstRun ? t('guide.primaryCtaFirstRun') : t('guide.primaryCta')}
          onPress={finish}
          style={styles.primaryCta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: layout.screenPadding, paddingBottom: 40 },
  headerCard: { marginBottom: spacing.md },
  kicker: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    marginBottom: spacing.sm,
  },
  sectionCard: { marginBottom: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqIconBadge: {
    backgroundColor: colours.successLight,
    borderColor: colours.successBorder,
  },
  sectionTitle: {
    flex: 1,
  },
  faqHeadCopy: {
    flex: 1,
  },
  sectionBody: {
    marginBottom: spacing.sm,
  },
  stepList: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colours.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepText: {
    flex: 1,
  },
  faqCard: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  faqButton: {
    marginTop: spacing.xs,
  },
  primaryCta: {
    marginBottom: spacing.sm,
  },
});
