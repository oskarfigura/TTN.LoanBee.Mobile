import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatCurrency } from '@/currency/format';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { PinIcon } from '@/components/loans/LoanIcons';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppTextInput, FieldLabel, InputSurface } from '@/components/ui/FormPrimitives';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, layout, radii, spacing } from '@/theme';

export default function EditLoanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const [nickname, setNickname] = useState(loan?.nickname ?? '');
  const [lender, setLender] = useState(loan?.lender ?? '');
  const [pinnedToDashboard, setPinnedToDashboard] = useState(loan?.pinnedToDashboard ?? false);

  if (!loan) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('edit.manageTitle')}
          variant="editor"
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <AppText variant="title3" style={styles.notFoundText}>{t('saved.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    const maxOrder = savedLoansStorage
      .getAll()
      .reduce((max, item) => Math.max(max, item.dashboardOrder ?? 0), 0);

    savedLoansStorage.update({
      ...loan,
      nickname: nickname.trim(),
      lender: lender.trim() || undefined,
      pinnedToDashboard,
      dashboardOrder: pinnedToDashboard
        ? loan.dashboardOrder ?? maxOrder + 1
        : undefined,
      updatedAt: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('edit.manageTitle')}
        subtitle={t('edit.manageSubtitle')}
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.field}>
          <FieldLabel>{t('save.nickname')}</FieldLabel>
          <InputSurface>
            <AppTextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('save.nicknamePlaceholder')}
            />
          </InputSurface>
        </View>

        <Card style={styles.lockedSnapshotCard}>
          <View style={styles.snapshotHeader}>
            <AppText variant="title3">{t('edit.calculationLockedTitle')}</AppText>
            <AppText variant="labelMd" tone="accent">
              {loan.category === 'mortgage' ? t('save.mortgage') : t('save.loan')}
            </AppText>
          </View>
          <View style={styles.snapshotRow}>
            <AppText variant="bodySm" tone="muted">{t('edit.originalAmount')}</AppText>
            <AppText variant="bodySm">
              {formatCurrency(loan.formSnapshot.loanAmount, loan.currency)}
            </AppText>
          </View>
          <AppText variant="bodySm" tone="muted" style={styles.bodyText}>
            {t('edit.calculationLockedBody')}
          </AppText>
          <Button
            label={t('saved.createNewCalculation')}
            onPress={() => router.push({
              pathname: '/' as never,
              params: { calculator: '1' },
            })}
            variant="secondary"
            style={styles.stackAction}
          />
        </Card>

        <View style={styles.field}>
          <FieldLabel>{t('save.lender')}</FieldLabel>
          <LenderTextInput value={lender} onChange={setLender} />
        </View>

        <TouchableOpacity
          style={[styles.pinToggle, pinnedToDashboard && styles.pinToggleActive]}
          onPress={() => setPinnedToDashboard(value => !value)}
          activeOpacity={0.8}
        >
          <View style={styles.pinCopy}>
            <PinIcon color={colours.primary} />
            <AppText variant="title3" tone="accent">
              {pinnedToDashboard ? t('mortgage.pinned') : t('mortgage.pinToDashboard')}
            </AppText>
          </View>
          <AppText variant="bodySm" tone="muted" style={styles.pinMeta}>
            {t('edit.pinHelp')}
          </AppText>
        </TouchableOpacity>

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
  container: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: spacing.md },
  field: { marginTop: spacing.md },
  lockedSnapshotCard: { marginTop: spacing.md },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pinToggle: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceRaised,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  pinToggleActive: {
    borderColor: colours.successBorder,
    backgroundColor: colours.successSurface,
  },
  pinCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pinMeta: { marginTop: spacing.xs },
  bodyText: { marginTop: spacing.xs },
  stackAction: { marginTop: spacing.sm },
  saveBtn: { marginTop: spacing.xl },
  cancelBtn: { marginTop: spacing.xs },
});
