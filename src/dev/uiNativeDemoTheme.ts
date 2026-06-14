import { createTheme } from '@oskarfigura/ui-native';
import { colours } from '@/theme';

/**
 * Maps the shared @oskarfigura/ui-native design tokens onto the LoanBee brand palette.
 * Native theming is pre-resolved (not a CSS cascade), so app overrides go through
 * `createTheme`. This demonstrates branding the shared components per-app.
 */
export const loanBeeNativeTheme = createTheme({
  // Primary
  colorButtonPrimaryBg: colours.primary,
  colorButtonPrimaryText: colours.white,
  colorButtonPrimaryBorder: colours.primary,
  colorButtonPrimaryDisabledBg: colours.primaryMuted,
  colorButtonPrimaryDisabledText: colours.white,
  // Secondary
  colorButtonSecondaryBg: colours.secondary,
  colorButtonSecondaryText: colours.white,
  colorButtonSecondaryBorder: colours.secondary,
  colorButtonSecondaryDisabledBg: colours.secondarySoft,
  colorButtonSecondaryDisabledText: colours.white,
  // Destructive
  colorButtonDestructiveBg: colours.error,
  colorButtonDestructiveText: colours.white,
  colorButtonDestructiveBorder: colours.error,
  colorButtonDestructiveDisabledBg: colours.errorSurface,
  colorButtonDestructiveDisabledText: colours.white,
  // Form + text
  colorInputText: colours.textPrimary,
  colorInputBorder: colours.border,
  colorInputBg: colours.white,
  colorInputPlaceholder: colours.textSecondary,
  colorInputError: colours.error,
  colorTextPrimary: colours.textPrimary,
  colorTextError: colours.error,
});
