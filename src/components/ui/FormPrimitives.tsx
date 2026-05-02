import React from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { AppText } from './AppText';
import { colours, elevation, layout, radii, spacing } from '@/theme';

export const FormSection = ({
  title,
  children,
  accent,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.section, accent && styles.sectionAccent, style]}>
    {title ? <AppText variant="title2" style={styles.sectionTitle}>{title}</AppText> : null}
    {children}
  </View>
);

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <AppText variant="labelMd" style={styles.label}>
    {children}
  </AppText>
);

export const FieldHint = ({ children }: { children: React.ReactNode }) => (
  <AppText variant="helper" tone="muted" style={styles.hint}>
    {children}
  </AppText>
);

export const FieldError = ({ message }: { message?: string }) => (
  message ? <AppText variant="helper" tone="error" style={styles.error}>{message}</AppText> : null
);

export const InputSurface = ({
  children,
  focused,
  error,
  style,
}: {
  children: React.ReactNode;
  focused?: boolean;
  error?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.inputSurface, focused && styles.inputSurfaceFocused, error && styles.inputSurfaceError, style]}>
    {children}
  </View>
);

export const AppTextInput = React.forwardRef<TextInput, TextInputProps>(({ style, ...props }, ref) => (
  <TextInput
    ref={ref}
    {...props}
    placeholderTextColor={props.placeholderTextColor ?? colours.textSecondary}
    style={[styles.textInput, style]}
  />
));

AppTextInput.displayName = 'AppTextInput';

export const InputAffix = ({ children, trailing }: { children: React.ReactNode; trailing?: boolean }) => (
  <AppText variant="bodyMd" tone="muted" style={trailing ? styles.affixTrailing : styles.affix}>
    {children}
  </AppText>
);

export const SegmentedControl = <T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.segmented, style]}>
    {options.map(option => {
      const active = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.segment, active && styles.segmentActive]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.84}
        >
          <AppText variant="labelMd" tone={active ? 'default' : 'muted'}>
            {option.label}
          </AppText>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const PillSelector = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ label: string; value: T; icon?: React.ReactNode }>;
  onChange: (next: T) => void;
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
    {options.map(option => {
      const active = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.pill, active && styles.pillActive]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.84}
        >
          {option.icon}
          <AppText variant="labelMd" tone={active ? 'inverse' : 'accent'}>
            {option.label}
          </AppText>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: colours.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    padding: layout.cardPadding,
    gap: spacing.sm,
    ...elevation.level1,
  },
  sectionAccent: {
    borderTopWidth: 3,
    borderTopColor: colours.tealDeep,
  },
  sectionTitle: {
    marginBottom: spacing.xxs,
  },
  label: {
    color: colours.primaryInk,
    marginBottom: spacing.xxs,
  },
  hint: {
    marginTop: spacing.xs,
  },
  error: {
    marginTop: spacing.xs,
  },
  inputSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: spacing.sm,
  },
  inputSurfaceFocused: {
    borderColor: colours.secondary,
    shadowColor: colours.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 0,
  },
  inputSurfaceError: {
    borderColor: colours.error,
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    color: colours.textPrimary,
    fontFamily: 'Manrope',
    fontSize: 15,
    paddingVertical: spacing.xs,
  },
  affix: {
    marginRight: spacing.xs,
  },
  affixTrailing: {
    marginLeft: spacing.xs,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.md,
    backgroundColor: colours.surfaceAccent,
  },
  segment: {
    flex: 1,
    borderRadius: radii.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.xs,
  },
  segmentActive: {
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceRaised,
  },
  pillActive: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
});
