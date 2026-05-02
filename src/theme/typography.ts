export const fonts = {
  body: 'Manrope',
  heading: 'Nunito',
  brand: 'Sacramento',
} as const;

export const fontSizes = {
  tiny: 10,
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 34,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const lineHeights = {
  tight: 1.2,
  title: 1.25,
  body: 1.55,
  relaxed: 1.65,
  label: 1.1,
} as const;

export const letterSpacing = {
  tighter: 0,
  tight: 0,
  normal: 0,
  wide: 0,
  wider: 0,
} as const;

export const textStyles = {
  display: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    lineHeight: 36,
    letterSpacing: letterSpacing.tighter,
  },
  title1: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: 32,
    letterSpacing: letterSpacing.tight,
  },
  title2: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: 25,
    letterSpacing: letterSpacing.tight,
  },
  title3: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: 22,
  },
  bodyLg: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: 19,
  },
  labelMd: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: 15,
    letterSpacing: letterSpacing.wide,
  },
  labelSm: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    lineHeight: 13,
    letterSpacing: letterSpacing.wider,
  },
  metricLg: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    lineHeight: 36,
    letterSpacing: letterSpacing.tighter,
  },
  metricMd: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: 25,
  },
  helper: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: 16,
  },
} as const;
