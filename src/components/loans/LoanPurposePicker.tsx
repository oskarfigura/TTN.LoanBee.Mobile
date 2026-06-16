import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/components/ui/Icon';
import { LOAN_PURPOSES } from '@/loans/loanPurpose';
import type { LoanPurpose } from '@/types/SavedLoan';
import { colours, radii, spacing } from '@/theme';

interface IconProps {
  purpose: LoanPurpose;
  size?: number;
  color?: string;
  selected?: boolean;
}

interface PickerProps {
  value: LoanPurpose;
  onChange: (next: LoanPurpose) => void;
}

export const LoanPurposeIcon = ({ purpose, size = 22, color = colours.primary }: IconProps) => {
  const strokeWidth = 1.85;

  switch (purpose) {
    case 'debtConsolidation':
      return <Icon icon={IconName.CoinsSwap01Icon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'car':
      return <Icon icon={IconName.CarIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'bike':
      return <Icon icon={IconName.BikeIcon} size={size} color={color} strokeWidth={1} />;
    case 'motorbike':
      return <Icon icon={IconName.Motorbike02Icon} size={size} color={color} />;
    case 'homeImprovement':
      return <Icon icon={IconName.RollerBrushIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'furniture':
      return <Icon icon={IconName.SofaIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'travel':
      return <Icon icon={IconName.PlaneIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'wedding':
      return <Icon icon={IconName.HeartsIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'jewellery':
      return <Icon icon={IconName.DiamondIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'business':
      return <Icon icon={IconName.BarLineChartIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'stocks':
      return <Icon icon={IconName.LineChartUpIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'crypto':
      return <Icon icon={IconName.BitcoinIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'medical':
      return <Icon icon={IconName.MedicalCircleIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'shopping':
      return <Icon icon={IconName.ShoppingBagIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'electronics':
      return <Icon icon={IconName.Laptop01Icon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'gaming':
      return <Icon icon={IconName.GamingPadIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'pet':
      return <Icon icon={IconName.PawPrintIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'boat':
      return <Icon icon={IconName.AnchorIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'moving':
      return <Icon icon={IconName.PackageIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'truck':
      return <Icon icon={IconName.Truck01Icon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'education':
      return <Icon icon={IconName.GraduationHatIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'other':
      return <Icon icon={IconName.ListIcon} size={size} color={color} strokeWidth={strokeWidth} />;
    case 'personal':
    default:
      return <Icon icon={IconName.HeartHandIcon} size={size} color={color} strokeWidth={strokeWidth} />;
  }
};

export const LoanPurposeIconTile = ({
  purpose,
  size = 40,
  color = colours.primary,
  selected = false,
}: IconProps) => {
  return (
    <View
      style={[
        styles.iconTile,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.35),
        },
        selected && styles.iconTileSelected,
      ]}
    >
      <LoanPurposeIcon purpose={purpose} size={Math.round(size * 0.55)} color={color} />
    </View>
  );
};

export const LoanPurposePicker = ({ value, onChange }: PickerProps) => {
  const { t } = useTranslation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const selectedLabel = t(`loanPurpose.${value}`);

  const handleSelect = (purpose: LoanPurpose) => {
    onChange(purpose);
    setDrawerVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.select}
        onPress={() => setDrawerVisible(true)}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={t('save.loanPurpose')}
      >
        <LoanPurposeIconTile purpose={value} size={36} />
        <View style={styles.selectCopy}>
          <AppText variant="bodyMd" numberOfLines={1}>
            {selectedLabel}
          </AppText>
        </View>
        <Icon icon={IconName.ChevronDownIcon} size={20} color={colours.textSecondary} strokeWidth={2} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={drawerVisible}
        animationType="slide"
        onRequestClose={() => setDrawerVisible(false)}
      >
        <Pressable style={styles.drawerScrim} onPress={() => setDrawerVisible(false)}>
          <Pressable style={styles.drawer} accessibilityViewIsModal>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <AppText variant="title3">{t('save.loanPurpose')}</AppText>
              <TouchableOpacity onPress={() => setDrawerVisible(false)} activeOpacity={0.84}>
                <AppText variant="labelMd" tone="accent">
                  {t('common.close')}
                </AppText>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.optionScroller}
              contentContainerStyle={styles.optionList}
              showsVerticalScrollIndicator={false}
            >
              {LOAN_PURPOSES.map(purpose => {
                const selected = value === purpose;
                return (
                  <TouchableOpacity
                    key={purpose}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(purpose)}
                    activeOpacity={0.84}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <LoanPurposeIconTile purpose={purpose} size={38} selected={selected} />
                    <AppText variant="bodyMd" style={styles.optionLabel} numberOfLines={1}>
                      {t(`loanPurpose.${purpose}`)}
                    </AppText>
                    {selected ? (
                      <Icon icon={IconName.CheckIcon} size={20} color={colours.primary} strokeWidth={2.3} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 50,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectCopy: {
    flex: 1,
    minWidth: 0,
  },
  drawerScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colours.modalScrim,
  },
  drawer: {
    maxHeight: '82%',
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.borderSoft,
    marginBottom: spacing.sm,
  },
  drawerHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionList: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  optionScroller: {
    flexGrow: 0,
  },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  optionSelected: {
    borderColor: colours.primary,
    backgroundColor: colours.surfaceAccent,
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
  },
  iconTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceMuted,
  },
  iconTileSelected: {
    borderColor: colours.primaryMuted,
    backgroundColor: colours.primarySoft,
  },
});
