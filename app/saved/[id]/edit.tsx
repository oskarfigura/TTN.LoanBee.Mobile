import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatCurrency } from '@/currency/format';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { PinIcon, PlusIcon, SwitchIcon, TimelineIcon } from '@/components/loans/LoanIcons';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppTextInput, FieldLabel, InputSurface } from '@/components/ui/FormPrimitives';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getDraftDeals, getMortgageTrackerSummary } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate, formatFriendlyDateRange } from '@/utils/date';

const TrackingActionTile = ({
  label,
  icon,
  onPress,
  emphasis = false,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  emphasis?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.trackingActionTile, emphasis && styles.trackingActionTilePrimary]}
    onPress={onPress}
    activeOpacity={0.84}
    accessibilityRole="button"
  >
    <View style={[styles.trackingActionIcon, emphasis && styles.trackingActionIconPrimary]}>
      {icon}
    </View>
    <AppText
      variant="labelMd"
      tone={emphasis ? 'inverse' : 'accent'}
      style={styles.trackingActionLabel}
      numberOfLines={2}
    >
      {label}
    </AppText>
  </TouchableOpacity>
);

export default function EditLoanScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const [nickname, setNickname] = useState(loan?.nickname ?? '');
  const [lender, setLender] = useState(loan?.lender ?? '');
  const [pinnedToDashboard, setPinnedToDashboard] = useState(loan?.pinnedToDashboard ?? false);

  const mortgageSummary = useMemo(() => (
    loan?.category === 'mortgage' ? getMortgageTrackerSummary(loan) : null
  ), [loan]);
  const draftDeals = useMemo(() => (
    loan?.category === 'mortgage' ? getDraftDeals(loan) : []
  ), [loan]);

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

  const currentDeal = mortgageSummary?.currentDeal;

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

        {loan.category === 'mortgage' && (
          <View style={styles.trackingSection}>
            <AppText variant="title2">{t('edit.specifics')}</AppText>

            <Card style={styles.specificsCard}>
              <AppText variant="title3">
                {currentDeal ? t('mortgage.currentDeal') : t('mortgage.savedMortgageEstimate')}
              </AppText>
              {currentDeal ? (
                <>
                  <AppText variant="title2" tone="accent" style={styles.dealTitle}>{currentDeal.name}</AppText>
                  <AppText variant="bodySm" tone="muted" style={styles.dealMeta}>
                    {formatFriendlyDateRange(currentDeal.startDate, currentDeal.endDate, i18n.language)}
                  </AppText>
                  <AppText variant="bodySm" tone="muted" style={styles.dealMeta}>
                    {currentDeal.interestRate}% · {currentDeal.repaymentType === 'interestOnly' ? t('mortgage.interestOnly') : t('mortgage.repayment')}
                  </AppText>
                </>
              ) : (
                <AppText variant="bodyMd" tone="muted" style={styles.bodyText}>{t('mortgage.noDealChangesBody')}</AppText>
              )}
            </Card>

            {draftDeals.length > 0 && (
              <Card style={styles.specificsCard}>
                <AppText variant="title3">{t('mortgage.nextDealDraft')}</AppText>
                {draftDeals.map(deal => (
                  <TouchableOpacity
                    key={deal.id}
                    style={styles.draftRow}
                    onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}
                  >
                    <View>
                      <AppText variant="title2" tone="accent" style={styles.dealTitle}>{deal.name}</AppText>
                      <AppText variant="bodySm" tone="muted" style={styles.dealMeta}>
                        {t('mortgage.startsOn', { date: formatFriendlyDate(deal.startDate, i18n.language) })}
                      </AppText>
                    </View>
                    <AppText variant="labelMd" tone="accent">{t('saved.edit')}</AppText>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            <AppText variant="bodySm" tone="muted" style={styles.helperText}>{t('edit.mortgageSpecificsHelp')}</AppText>
            <View style={styles.trackingActions}>
              <TrackingActionTile
                label={t('mortgage.viewTimeline')}
                icon={<TimelineIcon color={colours.primary} />}
                onPress={() => router.push(`/saved/${loan.id}/timeline`)}
              />
              <TrackingActionTile
                label={currentDeal ? t('mortgage.addNextDeal') : t('mortgage.addCurrentDeal')}
                icon={<PlusIcon color={colours.primary} />}
                onPress={() => router.push(`/saved/${loan.id}/deals/new`)}
              />
              {currentDeal ? (
                <TrackingActionTile
                  label={t('mortgage.completeCurrentDeal')}
                  icon={<SwitchIcon color={colours.white} />}
                  onPress={() => router.push(`/saved/${loan.id}/complete-current`)}
                  emphasis
                />
              ) : null}
            </View>
          </View>
        )}

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
  trackingSection: { marginTop: spacing.xl },
  specificsCard: { marginTop: spacing.md },
  dealTitle: { marginTop: spacing.sm },
  dealMeta: { marginTop: spacing.xxs },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  bodyText: { marginTop: spacing.xs },
  helperText: { marginTop: spacing.md },
  stackAction: { marginTop: spacing.sm },
  trackingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  trackingActionTile: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 78,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceRaised,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  trackingActionTilePrimary: {
    flexBasis: '100%',
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
  trackingActionIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceMuted,
  },
  trackingActionIconPrimary: {
    backgroundColor: colours.whiteSubtle,
  },
  trackingActionLabel: {
    marginTop: spacing.sm,
  },
  saveBtn: { marginTop: spacing.xl },
  cancelBtn: { marginTop: spacing.xs },
});
