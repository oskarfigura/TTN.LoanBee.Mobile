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

export const fonts = {
  body: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },
  heading: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },
} as const;

export const fontFamilies = [
  fonts.body.regular,
  fonts.body.medium,
  fonts.body.semibold,
  fonts.body.bold,
  fonts.body.extrabold,
] as const;

export const fontFaces = {
  body: {
    regular: { fontFamily: fonts.body.regular, fontWeight: fontWeights.regular },
    medium: { fontFamily: fonts.body.medium, fontWeight: fontWeights.medium },
    semibold: { fontFamily: fonts.body.semibold, fontWeight: fontWeights.semibold },
    bold: { fontFamily: fonts.body.bold, fontWeight: fontWeights.bold },
    extrabold: { fontFamily: fonts.body.extrabold, fontWeight: fontWeights.extrabold },
  },
  heading: {
    regular: { fontFamily: fonts.heading.regular, fontWeight: fontWeights.regular },
    medium: { fontFamily: fonts.heading.medium, fontWeight: fontWeights.medium },
    semibold: { fontFamily: fonts.heading.semibold, fontWeight: fontWeights.semibold },
    bold: { fontFamily: fonts.heading.bold, fontWeight: fontWeights.bold },
    extrabold: { fontFamily: fonts.heading.extrabold, fontWeight: fontWeights.extrabold },
  },
} as const;

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
    ...fontFaces.heading.bold,
    fontSize: fontSizes['2xl'],
    lineHeight: 36,
    letterSpacing: letterSpacing.tighter,
  },
  title1: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xl,
    lineHeight: 32,
    letterSpacing: letterSpacing.tight,
  },
  title2: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
    letterSpacing: letterSpacing.tight,
  },
  title3: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  bodyLg: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.md,
    lineHeight: 24,
  },
  bodyMd: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.base,
    lineHeight: 22,
  },
  bodySm: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
  },
  labelMd: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    letterSpacing: letterSpacing.wide,
  },
  labelSm: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.xs,
    lineHeight: 15,
    letterSpacing: letterSpacing.wider,
  },
  metricLg: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes['2xl'],
    lineHeight: 36,
    letterSpacing: letterSpacing.tighter,
  },
  metricMd: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
  },
  helper: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
} as const;
