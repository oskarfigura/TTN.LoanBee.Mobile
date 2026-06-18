import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { markGuideSeen } from '@/shared/lib/services/onboarding/guideState';
import { markOnboardingDismissed } from '@/shared/lib/services/onboarding/onboardingGate';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';

interface GuideStep {
  key: 'details' | 'compare' | 'save';
  icon: IconName;
}

const GUIDE_STEPS: GuideStep[] = [
  { key: 'details', icon: IconName.GridIcon },
  { key: 'compare', icon: IconName.TrendUpIcon },
  { key: 'save', icon: IconName.SaveIcon },
];

export default function GuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ firstRun?: string }>();
  const isFirstRun = params.firstRun === '1';

  // Mark the guide seen on dismissal, not on mount. AdProvider gates the iOS ATT
  // prompt on `hasSeenGuide()`; marking on mount would flip the flag while the
  // guide is still on screen, letting the system prompt fire before onboarding.
  // On first launch, leaving onboarding also releases the gated ATT/consent flow
  // in AdProvider — call it before navigating so the prompt isn't left waiting on
  // the gate's timeout fallback.
  if (__DEV__) console.log('[firstrun] guide: render. isFirstRun =', isFirstRun);

  // Safety net for the iOS swipe-back gesture (and any other dismissal that
  // bypasses the buttons): releasing the ATT gate on unmount guarantees the
  // gate never hangs, since there is no timeout fallback. No-op once settled.
  useEffect(() => {
    return () => {
      if (isFirstRun) markOnboardingDismissed();
    };
  }, [isFirstRun]);

  const finishOnboarding = () => {
    if (__DEV__) console.log('[firstrun] guide: finishOnboarding (dismiss). isFirstRun =', isFirstRun);
    markGuideSeen();
    if (isFirstRun) {
      markOnboardingDismissed();
    }
  };

  const closeGuide = () => {
    finishOnboarding();
    if (isFirstRun) {
      router.replace('/');
      return;
    }

    router.back();
  };

  const startCalculating = () => {
    finishOnboarding();
    router.replace('/?calculator=1');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={closeGuide}
          accessibilityRole="button"
          accessibilityLabel={t('guide.skip')}
          hitSlop={8}
          style={styles.closeButton}
        >
          <Icon icon={IconName.XCloseIcon} color={colours.textSecondary} size={20} strokeWidth={2} />
          <AppText variant="labelMd" tone="muted">{t('guide.skip')}</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AppText variant="labelSm" style={styles.eyebrow}>{t('guide.eyebrow')}</AppText>
          <AppText variant="display" style={styles.title}>{t('guide.title')}</AppText>
          <AppText variant="bodyLg" tone="muted" style={styles.body}>{t('guide.body')}</AppText>
        </View>

        {isFirstRun ? (
          <View style={styles.trackingCard}>
            <View style={styles.trackingIconWrap}>
              <Icon icon={IconName.HeartHandIcon} color={colours.primary} size={20} strokeWidth={2} />
            </View>
            <View style={styles.trackingCopy}>
              <AppText variant="labelMd" style={styles.trackingTitle}>{t('guide.trackingNoteTitle')}</AppText>
              <AppText variant="bodySm" tone="muted">{t('guide.trackingNoteBody')}</AppText>
            </View>
          </View>
        ) : null}

        <View style={styles.stepsCard}>
          {GUIDE_STEPS.map((step, index) => {
            const isLast = index === GUIDE_STEPS.length - 1;

            return (
              <View key={step.key} style={[styles.stepRow, isLast ? styles.lastStepRow : undefined]}>
                <View style={styles.stepIconWrap}>
                  <Icon icon={step.icon} color={colours.primary} size={22} strokeWidth={2} />
                </View>
                <View style={styles.stepCopy}>
                  <AppText variant="labelSm" style={styles.stepNumber}>
                    {t('guide.stepLabel', { number: index + 1 })}
                  </AppText>
                  <AppText variant="title3" style={styles.stepTitle}>
                    {t(`guide.steps.${step.key}.title`)}
                  </AppText>
                  <AppText variant="bodySm" tone="muted">
                    {t(`guide.steps.${step.key}.body`)}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>

        {!isFirstRun ? (
          <View style={styles.inviteCard}>
            <AppText variant="title3" style={styles.inviteTitle}>{t('guide.inviteTitle')}</AppText>
            <AppText variant="bodySm" tone="muted" style={styles.inviteBody}>{t('guide.inviteBody')}</AppText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('guide.startCalculating')}
          onPress={startCalculating}
          rightIcon={<Icon icon={IconName.ArrowRightIcon} color={colours.white} size={18} strokeWidth={2} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colours.backgroundCanvas,
  },
  topBar: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colours.backgroundCanvas,
  },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
  },
  hero: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    color: colours.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    color: colours.primaryInk,
    marginBottom: spacing.sm,
  },
  body: {
    maxWidth: '96%',
  },
  stepsCard: {
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  lastStepRow: {
    borderBottomWidth: 0,
  },
  stepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
  },
  stepCopy: {
    flex: 1,
  },
  stepNumber: {
    color: colours.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  stepTitle: {
    color: colours.primaryInk,
    marginBottom: spacing.xxs,
  },
  inviteCard: {
    marginTop: spacing.md,
    padding: layout.cardPadding,
    borderRadius: radii.card,
    backgroundColor: colours.successSurface,
    borderWidth: 1,
    borderColor: colours.successBorder,
  },
  inviteTitle: {
    color: colours.success,
    marginBottom: spacing.xxs,
  },
  inviteBody: {
    maxWidth: '96%',
  },
  trackingCard: {
    marginBottom: spacing.md,
    padding: layout.cardPadding,
    borderRadius: radii.card,
    backgroundColor: colours.surfaceAccent,
    borderWidth: 1,
    borderColor: colours.primarySoft,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  trackingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceRaised,
  },
  trackingCopy: {
    flex: 1,
  },
  trackingTitle: {
    color: colours.primary,
    marginBottom: spacing.xxs,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colours.backgroundCanvas,
  },
});
