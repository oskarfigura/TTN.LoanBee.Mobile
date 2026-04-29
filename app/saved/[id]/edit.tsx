import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { savedLoansStorage } from '@/storage/savedLoans';
import { CurrencyCode } from '@/currency/currencies';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { Button } from '@/components/ui/Button';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { LENDERS } from '@/constants/lenders';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditLoanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const [nickname, setNickname] = useState(loan?.nickname ?? '');
  const [lender, setLender] = useState(loan?.lender ?? '');
  const [category, setCategory] = useState<'mortgage' | 'loan'>(loan?.category ?? 'mortgage');
  const [currency, setCurrency] = useState<CurrencyCode>(loan?.currency ?? 'GBP');

  if (!loan) {
    return (
      <View style={styles.notFound}>
        <Text>Loan not found</Text>
        <Button label="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const handleSave = () => {
    savedLoansStorage.update({
      ...loan,
      nickname: nickname.trim(),
      lender: lender || undefined,
      category,
      currency,
      updatedAt: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>{t('save.nickname')}</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('save.nicknamePlaceholder')}
          placeholderTextColor={colours.textSecondary}
        />

        <Text style={styles.label}>{t('save.category')}</Text>
        <View style={styles.toggleRow}>
          {(['mortgage', 'loan'] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.toggleBtn, category === cat && styles.toggleBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.toggleText, category === cat && styles.toggleTextActive]}>
                {cat === 'mortgage' ? t('save.mortgage') : t('save.loan')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('save.lender')}</Text>
        <View style={styles.lenderList}>
          {[...LENDERS, ''].map(l => (
            <TouchableOpacity
              key={l || 'none'}
              style={[styles.lenderItem, lender === l && styles.lenderItemActive]}
              onPress={() => setLender(l)}
            >
              <Text style={[styles.lenderText, lender === l && styles.lenderTextActive]}>
                {l || 'None'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('save.currency')}</Text>
        <CurrencyPicker value={currency} onChange={setCurrency} />

        <Button
          label={t('edit.save')}
          onPress={handleSave}
          disabled={!nickname.trim()}
          style={styles.saveBtn}
        />
        <Button
          label={t('save.cancel')}
          onPress={() => router.back()}
          variant="ghost"
          style={styles.cancelBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    height: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    height: 44,
  },
  toggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colours.primary },
  toggleText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  toggleTextActive: { color: colours.white },
  lenderList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
  },
  lenderItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.surface,
  },
  lenderItemActive: { backgroundColor: colours.primary },
  lenderText: { fontFamily: fonts.body, fontSize: fontSizes.base, color: colours.textPrimary },
  lenderTextActive: { color: colours.white },
  saveBtn: { marginTop: 24 },
  cancelBtn: { marginTop: 8 },
});
