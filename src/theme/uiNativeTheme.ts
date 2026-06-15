import { createTheme, type NativeTheme } from '@oskarfigura/ui-native';
import { colours } from './colours';
import { fonts } from './typography';

export const loanBeeNativeTheme = {
  ...createTheme({
  colorPageBg: colours.background,
  colorBodyBg: colours.backgroundCanvas,
  colorBodyBorder: colours.border,
  colorContainerBg: colours.surfaceRaised,
  colorContainerBorder: colours.borderSoft,
  colorOptionNormalBg: colours.surfaceMuted,
  colorOptionNormalBorder: colours.borderSoft,
  colorOptionNormalText: colours.textPrimary,
  colorOptionSelectedBg: colours.surfaceAccent,
  colorOptionSelectedBorder: colours.borderSoft,
  colorOptionSelectedText: colours.primary,
  colorModalOverlay: colours.modalScrim,

  colorTextPrimary: colours.textPrimary,
  colorTextSecondary: colours.textSecondary,
  colorTextLight: colours.white,
  colorTextSuccess: colours.success,
  colorTextWarning: colours.warning,
  colorTextError: colours.error,

  colorInputText: colours.textPrimary,
  colorInputBorder: colours.borderSoft,
  colorInputActiveBorder: colours.secondary,
  colorInputBg: colours.surfaceRaised,
  colorInputPlaceholder: colours.textSecondary,
  colorInputError: colours.error,

  colorButtonPrimaryBg: colours.primary,
  colorButtonPrimaryText: colours.white,
  colorButtonPrimaryBorder: colours.primary,
  colorButtonPrimaryDisabledBg: colours.primaryMuted,
  colorButtonPrimaryDisabledText: colours.white,

  colorButtonSecondaryBg: colours.surfaceRaised,
  colorButtonSecondaryText: colours.primaryInk,
  colorButtonSecondaryBorder: colours.secondary,
  colorButtonSecondaryDisabledBg: colours.surfaceMuted,
  colorButtonSecondaryDisabledText: colours.textSecondary,

  colorButtonGhostBg: 'transparent',
  colorButtonGhostText: colours.primary,
  colorButtonGhostBorder: 'transparent',
  colorButtonGhostDisabledBg: 'transparent',
  colorButtonGhostDisabledText: colours.textSecondary,

  colorButtonDestructiveBg: colours.error,
  colorButtonDestructiveText: colours.white,
  colorButtonDestructiveBorder: colours.error,
  colorButtonDestructiveDisabledBg: colours.errorSurface,
  colorButtonDestructiveDisabledText: colours.white,

  radiusButton: 26,
  radiusCircle: 999,
  radiusInput: 12,
  radiusDefault: 6,

  // ui-native's getSpacing/getRadii helpers map token NAMES to design-system
  // slots (spacing.md = theme.spacing16, radii.card = theme.spacing16, etc.),
  // expecting each spacingN to hold the value N. The package's default `light`
  // theme instead ships a Tailwind 4px index scale (spacing16 = 64), so without
  // these overrides every padding/gap/radius inflates ~4x. Mirror src/theme/spacing.ts.
  spacing2: 2,
  spacing4: 4,
  spacing8: 8,
  spacing12: 12,
  spacing16: 16,
  spacing20: 20,
  spacing24: 24,
  spacing32: 32,
  spacing40: 40,
  spacing48: 48,

  green50: colours.successSurface,
  green100: colours.successBorder,
  green900: colours.success,
  orange50: colours.warningSurface,
  orange200: colours.honeySoft,
  orange900: colours.warning,
  red50: colours.errorSurface,
  red100: colours.errorSurface,
  red900: colours.error,

  shadowDefaultColor: colours.shadow,
  shadowBoxColor: colours.shadow,
  }),
  colorAccentBorder: colours.tealDeep,
  colorFieldLabel: colours.primaryInk,
  colorHeaderIconBg: colours.blackSubtle,
  colorSurfaceStrong: colours.surfaceStrong,
  fontFamilyBodyRegular: fonts.body.regular,
  fontFamilyBodyMedium: fonts.body.medium,
  fontFamilyBodySemibold: fonts.body.semibold,
  fontFamilyBodyBold: fonts.body.bold,
  fontFamilyHeadingSemibold: fonts.heading.semibold,
  fontFamilyHeadingBold: fonts.heading.bold,
} satisfies NativeTheme;
