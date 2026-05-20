import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  CoinsStackedIcon,
  GridIcon,
  ListIcon,
  ShieldIcon,
  ZapIcon,
} from '@/components/ui/Icons';
import { SvgProps } from '@/components/ui/Svg';
import { markGuideSeen } from '@/onboarding/guideState';
import { colours, layout, radii, spacing } from '@/theme';

interface Slide {
  icon: string;
  title: string;
  subtitle: string;
}

type IconComponent = (props: SvgProps) => React.JSX.Element;

const SLIDE_ICONS: Record<string, IconComponent> = {
  coins: CoinsStackedIcon,
  modes: ListIcon,
  track: GridIcon,
  overpay: ZapIcon,
  privacy: ShieldIcon,
};

export default function GuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ firstRun?: string }>();
  const isFirstRun = params.firstRun === '1';
  const { width } = useWindowDimensions();
  const slides = t('guide.slides', { returnObjects: true }) as Slide[];
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  // Reaching this screen counts as having seen the guide, so it never
  // re-triggers on next launch regardless of how the user leaves it
  // (skip, swipe through, CTA, or hardware back).
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

  const goNext = () => {
    if (index >= slides.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const isLast = index === slides.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        {!isLast ? (
          <TouchableOpacity
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel={t('guide.skip')}
            hitSlop={8}
            style={styles.skipBtn}
          >
            <AppText variant="labelMd" tone="muted">{t('guide.skip')}</AppText>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={item => item.icon}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={styles.list}
        renderItem={({ item }) => {
          const Icon = SLIDE_ICONS[item.icon] ?? CoinsStackedIcon;
          return (
            <View style={[styles.slide, { width }]}>
              <View style={styles.iconCircle}>
                <Icon color={colours.primary} size={64} strokeWidth={1.6} />
              </View>
              <AppText variant="display" style={styles.slideTitle}>
                {item.title}
              </AppText>
              <AppText variant="bodyLg" tone="muted" style={styles.slideSubtitle}>
                {item.subtitle}
              </AppText>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.icon}
              style={[styles.dot, i === index ? styles.dotActive : undefined]}
            />
          ))}
        </View>
        <Button
          label={isLast ? t('guide.getStarted') : t('guide.next')}
          onPress={goNext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  topBar: {
    height: 48,
    paddingHorizontal: layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  list: { flex: 1 },
  slide: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: radii.full,
    backgroundColor: colours.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideSubtitle: {
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colours.borderSoft,
  },
  dotActive: {
    width: 24,
    backgroundColor: colours.primary,
  },
});
