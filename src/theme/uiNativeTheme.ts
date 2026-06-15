import { createTheme } from '@oskarfigura/ui-native';
import { colours } from './colours';

export const loanBeeNativeTheme = createTheme({
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
});
