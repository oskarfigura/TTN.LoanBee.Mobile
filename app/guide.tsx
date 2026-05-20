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
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  ArrowRightIcon,
  GridIcon,
  ShieldTickIcon,
  ZapIcon,
} from '@/components/ui/Icons';
import { SvgProps } from '@/components/ui/Svg';
import { markGuideSeen } from '@/onboarding/guideState';
import { colours, layout, radii, spacing } from '@/theme';

interface Slide {
  icon: string;
  theme: string;
  title: string;
  subtitle: string;
}

type IconComponent = (props: SvgProps) => React.JSX.Element;

const SLIDE_ICONS: Record<string, IconComponent> = {
  overpay: ZapIcon,
  track: GridIcon,
  ready: ShieldTickIcon,
};

interface SlideTheme {
  cardBg: string;
  blobBg: string;
  iconColor: string;
  titleColor: string;
  subtitleColor: string;
}

const SLIDE_THEMES: Record<string, SlideTheme> = {
  primary: {
    cardBg: colours.primary,
    blobBg: colours.whiteSubtle,
    iconColor: colours.white,
    titleColor: colours.white,
    subtitleColor: colours.textInverse,
  },
  accent: {
    cardBg: colours.surfaceStrong,
    blobBg: colours.surfaceRaised,
    iconColor: colours.primary,
    titleColor: colours.primaryInk,
    subtitleColor: colours.textSecondary,
  },
  success: {
    cardBg: colours.successLight,
    blobBg: colours.surfaceRaised,
    iconColor: colours.success,
    titleColor: colours.primaryInk,
    subtitleColor: colours.textSecondary,
  },
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
  const scrollX = useSharedValue(0);

  // Reaching this screen counts as having seen the guide, so it never
  // re-triggers on next launch regardless of how the user leaves it.
  useEffect(() => {
    markGuideSeen();
  }, []);

  const scrollToIndex = (i: number) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  const leave = (sample: boolean) => {
    if (isFirstRun || sample) {
      router.replace(sample ? '/?sample=1' : '/');
    } else {
      router.back();
    }
  };

  const goNext = () => {
    if (index < slides.length - 1) scrollToIndex(index + 1);
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

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
            onPress={() => leave(false)}
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

      <Animated.FlatList
        ref={listRef}
        data={slides}
        keyExtractor={item => item.icon}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={styles.list}
        renderItem={({ item, index: i }) => (
          <SlideView slide={item} index={i} width={width} scrollX={scrollX} />
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <TouchableOpacity
              key={s.icon}
              onPress={() => scrollToIndex(i)}
              accessibilityRole="button"
              accessibilityLabel={`Slide ${i + 1} of ${slides.length}`}
              hitSlop={8}
              style={styles.dotTap}
            >
              <View style={[styles.dot, i === index ? styles.dotActive : undefined]} />
            </TouchableOpacity>
          ))}
        </View>

        {isLast ? (
          <View style={styles.lastActions}>
            <Button
              label={t('guide.trySample')}
              onPress={() => leave(true)}
              rightIcon={<ArrowRightIcon color={colours.white} size={18} strokeWidth={2} />}
            />
            <TouchableOpacity
              onPress={() => leave(false)}
              accessibilityRole="button"
              hitSlop={6}
              style={styles.startFreshBtn}
            >
              <AppText variant="labelMd" tone="muted">{t('guide.startFresh')}</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nextRow}>
            <Button
              label={t('guide.next')}
              variant="ghost"
              onPress={goNext}
              rightIcon={<ArrowRightIcon color={colours.primary} size={18} strokeWidth={2} />}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

interface SlideViewProps {
  slide: Slide;
  index: number;
  width: number;
  scrollX: SharedValue<number>;
}

function SlideView({ slide, index, width, scrollX }: SlideViewProps) {
  const Icon = SLIDE_ICONS[slide.icon] ?? ZapIcon;
  const theme = SLIDE_THEMES[slide.theme] ?? SLIDE_THEMES.primary;
  const slideOffset = width * index;

  // Parallax: icon drifts horizontally and fades slightly faster than the rail,
  // so each slide feels like its own scene rather than a flat horizontal page.
  const iconStyle = useAnimatedStyle(() => {
    const distance = scrollX.value - slideOffset;
    const opacity = interpolate(
      Math.abs(distance),
      [0, width * 0.8],
      [1, 0],
      'clamp',
    );
    const translateX = interpolate(
      distance,
      [-width, 0, width],
      [width * 0.22, 0, -width * 0.22],
    );
    return { opacity, transform: [{ translateX }] };
  });

  // Text settles in slightly later than the icon and fades over a tighter range,
  // which produces a soft cross-fade between adjacent slides.
  const textStyle = useAnimatedStyle(() => {
    const distance = scrollX.value - slideOffset;
    const opacity = interpolate(
      Math.abs(distance),
      [0, width * 0.55],
      [1, 0],
      'clamp',
    );
    const translateY = interpolate(
      Math.abs(distance),
      [0, width],
      [0, 22],
      'clamp',
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={[styles.slideOuter, { width }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <View style={[styles.blob, { backgroundColor: theme.blobBg }]} />
          <Icon color={theme.iconColor} size={104} strokeWidth={1.6} />
        </Animated.View>
        <Animated.View style={[styles.textWrap, textStyle]}>
          <AppText
            variant="title1"
            style={[styles.slideTitle, { color: theme.titleColor }]}
          >
            {slide.title}
          </AppText>
          <AppText
            variant="bodyLg"
            style={[styles.slideSubtitle, { color: theme.subtitleColor }]}
          >
            {slide.subtitle}
          </AppText>
        </Animated.View>
      </View>
    </View>
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
  slideOuter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: radii.full,
    opacity: 0.55,
  },
  textWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    maxWidth: 340,
  },
  slideSubtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  dotTap: {
    padding: spacing.xs,
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
  nextRow: {
    alignItems: 'flex-end',
  },
  lastActions: {
    gap: spacing.sm,
  },
  startFreshBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
