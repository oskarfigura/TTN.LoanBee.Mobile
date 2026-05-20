import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Easing,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
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
import {
  BalanceSeries,
  computeBalanceSeries,
  computeSampleSavings,
  getSampleScenario,
  SampleSavings,
  SampleScenario,
} from '@/onboarding/sampleScenario';
import { getDefaultCurrency } from '@/hooks/useLoanCalculatorForm';
import { CurrencyCode, CURRENCIES } from '@/currency/currencies';
import { colours, fontFaces, layout, radii, spacing } from '@/theme';

interface Slide {
  icon: string;
  theme: string;
  title: string;
  subtitle: string;
  example?: boolean;
}

interface ChartData {
  scenario: SampleScenario;
  savings: SampleSavings;
  series: BalanceSeries;
  currency: CurrencyCode;
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
  heroAccent: string;
  chartLineBaseline: string;
  chartLineWith: string;
  chartFillWith: string;
}

const SLIDE_THEMES: Record<string, SlideTheme> = {
  primary: {
    cardBg: colours.primary,
    blobBg: colours.whiteSubtle,
    iconColor: colours.white,
    titleColor: colours.white,
    subtitleColor: colours.textInverse,
    heroAccent: colours.honey,
    chartLineBaseline: 'rgba(255,255,255,0.35)',
    chartLineWith: colours.honey,
    chartFillWith: 'rgba(244,180,0,0.18)',
  },
  accent: {
    cardBg: colours.surfaceStrong,
    blobBg: colours.surfaceRaised,
    iconColor: colours.primary,
    titleColor: colours.primaryInk,
    subtitleColor: colours.textSecondary,
    heroAccent: colours.primary,
    chartLineBaseline: 'rgba(15,23,42,0.18)',
    chartLineWith: colours.primary,
    chartFillWith: 'rgba(0,45,114,0.12)',
  },
  success: {
    cardBg: colours.successLight,
    blobBg: colours.surfaceRaised,
    iconColor: colours.success,
    titleColor: colours.primaryInk,
    subtitleColor: colours.textSecondary,
    heroAccent: colours.success,
    chartLineBaseline: 'rgba(15,23,42,0.18)',
    chartLineWith: colours.success,
    chartFillWith: 'rgba(4,109,64,0.14)',
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

  // Compute the example shown on slide 1 from the same scenario the "Try it
  // now" CTA prefills, so the headline savings figure and the sparkline curves
  // both match the calculator result.
  const chartData: ChartData = useMemo(() => {
    const currency = getDefaultCurrency();
    const scenario = getSampleScenario(currency);
    return {
      scenario,
      savings: computeSampleSavings(scenario),
      series: computeBalanceSeries(scenario),
      currency,
    };
  }, []);

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
          <SlideView
            slide={item}
            index={i}
            width={width}
            scrollX={scrollX}
            chartData={chartData}
          />
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
          <Button
            label={t('guide.tryItNow')}
            onPress={() => leave(true)}
            rightIcon={<ArrowRightIcon color={colours.white} size={18} strokeWidth={2} />}
          />
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
  chartData: ChartData;
}

function SlideView({ slide, index, width, scrollX, chartData }: SlideViewProps) {
  const { t } = useTranslation();
  const Icon = SLIDE_ICONS[slide.icon] ?? ZapIcon;
  const theme = SLIDE_THEMES[slide.theme] ?? SLIDE_THEMES.primary;
  const slideOffset = width * index;

  // Parallax: hero element drifts horizontally and fades slightly faster than
  // the rail, so each slide feels like its own scene rather than a flat page.
  const heroStyle = useAnimatedStyle(() => {
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

  if (slide.example) {
    return (
      <View style={[styles.slideOuter, { width }]}>
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <View style={styles.cardInner}>
            <Animated.View style={[styles.heroExample, heroStyle]}>
              <SavingsHero chartData={chartData} theme={theme} />
            </Animated.View>
            <Animated.View style={[styles.textWrap, textStyle]}>
              <AppText
                variant="title1"
                style={[styles.slideTitle, { color: theme.titleColor }]}
              >
                {slide.title}
              </AppText>
            </Animated.View>
          </View>
          <AppText
            variant="helper"
            style={[styles.exampleDisclaimer, { color: theme.subtitleColor }]}
          >
            {t('guide.exampleDisclaimer')}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.slideOuter, { width }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <View style={styles.cardInner}>
          <Animated.View style={[styles.iconWrap, heroStyle]}>
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
    </View>
  );
}

function useCountUp(target: number, duration = 1100, delay = 120): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let startTime: number;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    timeout = setTimeout(() => {
      startTime = Date.now();
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      if (timeout) clearTimeout(timeout);
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

interface SavingsHeroProps {
  chartData: ChartData;
  theme: SlideTheme;
}

function SavingsHero({ chartData, theme }: SavingsHeroProps) {
  const { t } = useTranslation();
  const { savings, series, currency } = chartData;
  const symbol = (CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]).symbol;
  const heroTarget = Math.round(savings.interestSaved / 1000) * 1000;
  const animatedValue = useCountUp(heroTarget);
  const years = Math.round(savings.monthsSaved / 12);
  const sparklineOpacity = useSharedValue(0);
  const sparklineLift = useSharedValue(8);

  useEffect(() => {
    // Sparkline fades in after the count-up number settles.
    sparklineOpacity.value = 0;
    sparklineLift.value = 8;
    const timing = { duration: 600, easing: Easing.out(Easing.cubic) };
    sparklineOpacity.value = withDelay(600, withTiming(1, timing));
    sparklineLift.value = withDelay(600, withTiming(0, timing));
  }, [sparklineOpacity, sparklineLift]);

  const sparklineStyle = useAnimatedStyle(() => ({
    opacity: sparklineOpacity.value,
    transform: [{ translateY: sparklineLift.value }],
  }));

  return (
    <View style={styles.heroBlock}>
      <AppText style={[styles.heroNumber, { color: theme.titleColor }]} numberOfLines={1}>
        {`${symbol}${animatedValue.toLocaleString('en-GB')}`}
      </AppText>
      <AppText
        variant="labelMd"
        style={[styles.heroCaption, { color: theme.subtitleColor }]}
      >
        {t('guide.exampleCaption', { years })}
      </AppText>
      <Animated.View style={[styles.sparklineWrap, sparklineStyle]}>
        <Sparkline series={series} theme={theme} />
      </Animated.View>
    </View>
  );
}

interface SparklineProps {
  series: BalanceSeries;
  theme: SlideTheme;
}

function Sparkline({ series, theme }: SparklineProps) {
  const { width: screenWidth } = useWindowDimensions();
  // The sparkline lives inside the card; the card has spacing.xl horizontal
  // padding and the slideOuter has spacing.md outside it.
  const width = Math.min(screenWidth - spacing.md * 2 - spacing.xl * 2, 340);
  const height = 64;
  const padX = 2;
  const padY = 4;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const points = series.baseline.length;
  const project = (val: number, i: number) => {
    const x = padX + (i / (points - 1)) * usableW;
    const y = padY + usableH - (val / series.initialBalance) * usableH;
    return { x, y };
  };

  const toPath = (arr: number[]): string => {
    let d = '';
    arr.forEach((val, i) => {
      const { x, y } = project(val, i);
      d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    return d;
  };

  // Filled "savings region" — trace the with-overpayment curve left-to-right
  // then the baseline curve right-to-left, then close. The enclosed area is
  // the visible gap between the two curves: that gap IS the saving.
  const toRegionPath = (): string => {
    let d = '';
    series.withOverpayment.forEach((val, i) => {
      const { x, y } = project(val, i);
      d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    for (let i = points - 1; i >= 0; i--) {
      const { x, y } = project(series.baseline[i], i);
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    d += ' Z';
    return d;
  };

  return (
    <Svg width={width} height={height}>
      <Path d={toRegionPath()} fill={theme.chartFillWith} />
      <Path
        d={toPath(series.baseline)}
        stroke={theme.chartLineBaseline}
        strokeWidth={1.25}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d={toPath(series.withOverpayment)}
        stroke={theme.chartLineWith}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
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
    paddingVertical: spacing.xl,
  },
  cardInner: {
    flex: 1,
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
  heroExample: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroBlock: {
    width: '100%',
    alignItems: 'center',
  },
  heroNumber: {
    ...fontFaces.heading.bold,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  heroCaption: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.78,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  sparklineWrap: {
    width: '100%',
    alignItems: 'center',
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
  exampleDisclaimer: {
    textAlign: 'center',
    opacity: 0.65,
    fontStyle: 'italic',
    marginTop: spacing.md,
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
});
