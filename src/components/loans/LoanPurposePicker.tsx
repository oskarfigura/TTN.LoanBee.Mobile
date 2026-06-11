import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { AnchorIcon } from '@/components/ui/Icons/AnchorIcon/AnchorIcon';
import { BarLineChartIcon } from '@/components/ui/Icons/BarLineChartIcon/BarLineChartIcon';
import { BikeIcon } from '@/components/ui/Icons/BikeIcon/BikeIcon';
import { BitcoinIcon } from '@/components/ui/Icons/BitcoinIcon/BitcoinIcon';
import { CarIcon } from '@/components/ui/Icons/CarIcon/CarIcon';
import { CheckIcon } from '@/components/ui/Icons/CheckIcon/CheckIcon';
import { ChevronDownIcon } from '@/components/ui/Icons/ChevronDownIcon/ChevronDownIcon';
import { DiamondIcon } from '@/components/ui/Icons/DiamondIcon/DiamondIcon';
import { GamingPadIcon } from '@/components/ui/Icons/GamingPadIcon/GamingPadIcon';
import { GraduationHatIcon } from '@/components/ui/Icons/GraduationHatIcon/GraduationHatIcon';
import { HeartHandIcon } from '@/components/ui/Icons/HeartHandIcon/HeartHandIcon';
import { LineChartUpIcon } from '@/components/ui/Icons/LineChartUpIcon/LineChartUpIcon';
import { ListIcon } from '@/components/ui/Icons/ListIcon/ListIcon';
import { MedicalCircleIcon } from '@/components/ui/Icons/MedicalCircleIcon/MedicalCircleIcon';
import { MotorbikeIcon } from '@/components/ui/Icons/MotorbikeIcon/MotorbikeIcon';
import { PlaneIcon } from '@/components/ui/Icons/PlaneIcon/PlaneIcon';
import { RollerBrushIcon } from '@/components/ui/Icons/RollerBrushIcon/RollerBrushIcon';
import { ShoppingBagIcon } from '@/components/ui/Icons/ShoppingBagIcon/ShoppingBagIcon';
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
    case 'car':
      return <CarIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'bike':
      return <BikeIcon size={size} color={color} />;
    case 'motorbike':
      return <MotorbikeIcon size={size} color={color} />;
    case 'homeImprovement':
      return <RollerBrushIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'travel':
      return <PlaneIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'jewellery':
      return <DiamondIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'business':
      return <BarLineChartIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'stocks':
      return <LineChartUpIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'crypto':
      return <BitcoinIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'medical':
      return <MedicalCircleIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'shopping':
      return <ShoppingBagIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'gaming':
      return <GamingPadIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'boat':
      return <AnchorIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'education':
      return <GraduationHatIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'other':
      return <ListIcon size={size} color={color} strokeWidth={strokeWidth} />;
    case 'personal':
    default:
      return <HeartHandIcon size={size} color={color} strokeWidth={strokeWidth} />;
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
        <ChevronDownIcon size={20} color={colours.textSecondary} strokeWidth={2} />
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
                      <CheckIcon size={20} color={colours.primary} strokeWidth={2.3} />
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
