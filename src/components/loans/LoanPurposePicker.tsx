import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { LOAN_PURPOSES } from '@/loans/loanPurpose';
import type { LoanPurpose } from '@/types/SavedLoan';
import { colours, radii, spacing } from '@/theme';

interface IconProps {
  purpose: LoanPurpose;
  size?: number;
}

interface PickerProps {
  value: LoanPurpose;
  onChange: (next: LoanPurpose) => void;
}

const getLoanPurposeTheme = (purpose: LoanPurpose) => {
  switch (purpose) {
    case 'car':
      return {
        background: colours.secondarySoft,
        border: colours.secondaryBright,
        primary: colours.primary,
        secondary: colours.secondary,
      };
    case 'bike':
      return {
        background: colours.successLight,
        border: colours.successBorder,
        primary: colours.success,
        secondary: colours.teal,
      };
    case 'motorbike':
      return {
        background: colours.warningSurface,
        border: colours.honeySoft,
        primary: colours.warning,
        secondary: colours.honey,
      };
    case 'homeImprovement':
      return {
        background: colours.surfaceAccent,
        border: colours.surfaceStrong,
        primary: colours.primary,
        secondary: colours.teal,
      };
    case 'education':
      return {
        background: colours.primarySoft,
        border: colours.primaryMuted,
        primary: colours.primary,
        secondary: colours.accent,
      };
    case 'other':
      return {
        background: colours.surfaceMuted,
        border: colours.borderSoft,
        primary: colours.primaryInk,
        secondary: colours.textSecondary,
      };
    case 'personal':
    default:
      return {
        background: colours.successSurface,
        border: colours.successBorder,
        primary: colours.primary,
        secondary: colours.success,
      };
  }
};

export const LoanPurposeIcon = ({ purpose, size = 22 }: IconProps) => {
  const theme = getLoanPurposeTheme(purpose);
  const primary = theme.primary;
  const secondary = theme.secondary;

  if (purpose === 'car') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5.5 11.5 7.2 7.8A2 2 0 0 1 9 6.6h6a2 2 0 0 1 1.8 1.2l1.7 3.7"
          stroke={primary}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M4.8 11.2h14.4a1.8 1.8 0 0 1 1.8 1.8v3.1H3v-3.1a1.8 1.8 0 0 1 1.8-1.8z"
          stroke={primary}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Circle cx={7.2} cy={16.2} r={1.6} fill={secondary} />
        <Circle cx={16.8} cy={16.2} r={1.6} fill={secondary} />
      </Svg>
    );
  }

  if (purpose === 'bike') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={6.5} cy={16.5} r={3.2} stroke={primary} strokeWidth={1.8} />
        <Circle cx={17.5} cy={16.5} r={3.2} stroke={primary} strokeWidth={1.8} />
        <Path
          d="M8.2 16.5h3.4l3-5.2m-3 5.2-2.6-5.2h3.8m1.8 0h2.1"
          stroke={secondary}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (purpose === 'motorbike') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={6.2} cy={16.5} r={2.8} stroke={primary} strokeWidth={1.8} />
        <Circle cx={17.8} cy={16.5} r={2.8} stroke={primary} strokeWidth={1.8} />
        <Path
          d="M7.8 16.5h3.3l2.1-3.8h2.9l1.7 3.8M10.8 12.7H8.6m4.6 0-1-2.2h2.7"
          stroke={secondary}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M15.2 10.5h3.1" stroke={primary} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (purpose === 'homeImprovement') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4.5 11.3 12 5.4l7.5 5.9M6.7 10.5v8h10.6v-8"
          stroke={primary}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="m9.2 15.8 4.9-4.9 2 2-4.9 4.9H9.2v-2z"
          stroke={secondary}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (purpose === 'education') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="m4 9 8-4 8 4-8 4-8-4z"
          stroke={primary}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path
          d="M7.5 11.2v3.5c1.3 1.4 2.8 2.1 4.5 2.1s3.2-.7 4.5-2.1v-3.5"
          stroke={secondary}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M19.5 9.5v4.8" stroke={primary} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (purpose === 'other') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7 4.8h10A2.2 2.2 0 0 1 19.2 7v10a2.2 2.2 0 0 1-2.2 2.2H7A2.2 2.2 0 0 1 4.8 17V7A2.2 2.2 0 0 1 7 4.8z"
          stroke={primary}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path
          d="M9 9h6M9 12h4.2M9 15h5.5"
          stroke={secondary}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 10.4h14v7.1A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5v-7.1z"
        stroke={primary}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 10.4V8a3.5 3.5 0 0 1 7 0v2.4"
        stroke={primary}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M8.5 14.6h7" stroke={secondary} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
};

export const LoanPurposeIconTile = ({ purpose, size = 40 }: IconProps) => {
  const theme = getLoanPurposeTheme(purpose);

  return (
    <View
      style={[
        styles.iconTile,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.35),
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      <LoanPurposeIcon purpose={purpose} size={Math.round(size * 0.55)} />
    </View>
  );
};

export const LoanPurposePicker = ({ value, onChange }: PickerProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.grid}>
      {LOAN_PURPOSES.map(purpose => {
        const selected = value === purpose;
        return (
          <TouchableOpacity
            key={purpose}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(purpose)}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <LoanPurposeIconTile purpose={purpose} size={36} />
            <AppText variant="labelMd" tone={selected ? 'accent' : 'default'} numberOfLines={1}>
              {t(`loanPurpose.${purpose}`)}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  option: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  optionSelected: {
    borderColor: colours.primary,
    backgroundColor: colours.surfaceAccent,
  },
  iconTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
