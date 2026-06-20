import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { LoanPurposeIcon } from '@/features/tracker/components/editing/LoanPurposePicker';
import { getLoanPurpose } from '@/shared/domain/loans/loanPurpose';
import type { LoanGroup } from '@/shared/domain/types/SavedLoan';
import { colours, spacing } from '@/shared/ui/theme';

type AppTextVariant = React.ComponentProps<typeof AppText>['variant'];

interface Props {
  loan: Pick<LoanGroup, 'category' | 'loanPurpose'>;
  // Shared by both the icon and the label so the glyph stays subtle — same hue and
  // weight as the text it sits beside. Callers pass whatever colour their context uses
  // (primary on the dashboard chip, textSecondary on the detail header).
  color?: string;
  iconSize?: number;
  variant?: AppTextVariant;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// The loan category presented inline as "<icon> <label>". The icon is derived from the
// loan purpose (falling back to a mortgage glyph) and rendered at text size/colour so it
// reads as part of the label rather than a separate badge. Shared by the dashboard card
// and the detail header to keep the two screens consistent.
export const LoanCategoryTag = ({
  loan,
  color = colours.primary,
  iconSize = 12,
  variant = 'labelSm',
  numberOfLines = 1,
  style,
  textStyle,
}: Props) => {
  const { t } = useTranslation();
  const purpose = getLoanPurpose(loan);
  const label = purpose ? t(`loanPurpose.${purpose}`) : t(`saved.category.${loan.category}`);

  return (
    <View style={[styles.row, style]}>
      {purpose ? (
        <LoanPurposeIcon purpose={purpose} size={iconSize} color={color} />
      ) : (
        <Icon icon={IconName.MortgageIcon} size={iconSize} color={color} strokeWidth={1.8} />
      )}
      <AppText
        variant={variant}
        numberOfLines={numberOfLines}
        // flexShrink lets a long localized label ellipsize within the row instead of
        // widening the chip / overflowing the centered header.
        style={[styles.label, { color }, textStyle]}
      >
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minWidth: 0,
  },
  label: {
    flexShrink: 1,
  },
});
