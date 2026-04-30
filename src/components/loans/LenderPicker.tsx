import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LENDERS } from '@/constants/lenders';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

interface Props {
  value: string;
  onChange: (lender: string) => void;
}

export const LenderPicker = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState(
    value && ![...LENDERS].includes(value as typeof LENDERS[number]) ? value : ''
  );

  const isCustom = value === t('save.custom') || (!!value && ![...LENDERS].includes(value as typeof LENDERS[number]));
  const displayLabel = value || t('save.selectLender');

  const handleSelect = (lender: string) => {
    setOpen(false);
    if (lender === t('save.custom')) {
      onChange(customText || '');
    } else {
      onChange(lender);
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(v => !v)}>
        <Text style={{ color: value ? colours.textPrimary : colours.textSecondary, fontFamily: fonts.body, fontSize: fontSizes.base }}>
          {displayLabel}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.list}>
          {[t('save.none'), ...LENDERS, t('save.custom')].map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.item, value === l && styles.itemActive]}
              onPress={() => handleSelect(l)}
            >
              <Text style={[styles.itemText, value === l && styles.itemTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isCustom && (
        <TextInput
          style={[styles.trigger, styles.customInput]}
          placeholder={t('save.enterLenderName')}
          placeholderTextColor={colours.textSecondary}
          value={customText}
          onChangeText={text => { setCustomText(text); onChange(text); }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    height: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  list: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.surface,
  },
  itemActive: { backgroundColor: colours.primary },
  itemText: { fontFamily: fonts.body, fontSize: fontSizes.base, color: colours.textPrimary },
  itemTextActive: { color: colours.white },
  customInput: { marginTop: 8 },
});
