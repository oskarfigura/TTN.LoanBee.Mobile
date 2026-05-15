import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput, FieldLabel, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ChevronRightIcon, CoinsStackedIcon, InfoCircleIcon, PlusIcon } from '@/components/ui/Icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CURRENCIES } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { getDealOverpaymentImpact, normaliseDealChain } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal } from '@/types/SavedLoan';
import { colours, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate } from '@/utils/date';

export default function DealOverpaymentsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, dealId } = useLocalSearchParams<{ id: string; dealId: string }>();

  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [monthlyAmountText, setMonthlyAmountText] = useState('');

  const refresh = useCallback(() => {
    setLoan(savedLoansStorage.getById(id));
  }, [id]);

  useFocusEffect(refresh);

  const deal = loan?.deals.find(d => d.id === dealId) as LoanDeal | undefined;
  const currency = loan?.currency ?? 'GBP';
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const lumpSumEvents = useMemo(
    () => (loan?.events ?? [])
      .filter(e => e.type === 'lumpOverpayment' && e.dealId === dealId)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [loan?.events, dealId],
  );

  const impact = useMemo(() => {
    if (!deal || !loan) return null;
    const result = getDealOverpaymentImpact(deal, loan.events);
    return result.hasOverpayments ? result : null;
  }, [deal, loan]);

  const openEditModal = () => {
    setMonthlyAmountText(deal && deal.regularOverpayment > 0 ? String(deal.regularOverpayment) : '');
    setEditModalVisible(true);
  };

  const saveMonthlyOverpayment = useCallback((amount: number) => {
    if (!loan || !deal) return;
    const updatedDeal: LoanDeal = { ...deal, regularOverpayment: amount, updatedAt: new Date().toISOString() };
    const updatedLoan = {
      ...loan,
      deals: loan.deals.map(d => d.id === deal.id ? updatedDeal : d),
    };
    savedLoansStorage.update(normaliseDealChain(updatedLoan, deal.id));
    setEditModalVisible(false);
    refresh();
  }, [loan, deal, refresh]);

  if (!loan || !deal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.dealOverpaymentsTitle')}
          variant="editor"
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.centred}>
          <AppText variant="title3">{t('saved.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} style={styles.notFoundBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const numericAmount = Number(monthlyAmountText.trim());
  const amountValid = monthlyAmountText.trim() !== '' && Number.isFinite(numericAmount) && numericAmount >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.dealOverpaymentsTitle')}
        subtitle={deal.name}
        subtitleVariant="context"
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Impact banner */}
        {impact ? (
          <Card style={styles.impactCard} variant="status">
            <View style={styles.impactInner}>
              <CoinsStackedIcon size={20} color={colours.secondary} strokeWidth={1.8} />
              <View style={styles.impactText}>
                <AppText variant="labelMd" tone="success">
                  {t('mortgage.dealInterestSavedLabel')}: {formatCurrency(impact.interestSaved, currency)}
                </AppText>
                <AppText variant="bodySm" tone="muted">
                  {t('mortgage.dealExtraRepaidLabel')}: {formatCurrency(impact.extraPrincipalRepaid, currency)}
                </AppText>
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.emptyImpact}>
            <AppText variant="bodySm" tone="muted" style={styles.centredText}>
              {t('overpayments.noImpact')}
            </AppText>
          </View>
        )}

        {/* Monthly overpayment */}
        <View style={styles.section}>
          <AppText variant="title3" style={styles.sectionTitle}>
            {t('mortgage.dealMonthlyOverpayment')}
          </AppText>
          {deal.regularOverpayment > 0 ? (
            <TouchableOpacity style={styles.rowCard} onPress={openEditModal} activeOpacity={0.75}>
              <View style={styles.rowMain}>
                <AppText variant="labelMd">
                  {formatCurrency(deal.regularOverpayment, currency)} / {t('results.months')}
                </AppText>
              </View>
              <AppText variant="labelSm" tone="muted">{t('mortgage.dealMonthlyOverpaymentEdit')}</AppText>
            </TouchableOpacity>
          ) : (
            <Button
              label={t('mortgage.dealMonthlyOverpaymentNotSet')}
              onPress={openEditModal}
              variant="secondary"
            />
          )}
        </View>

        {/* Lump sum payments */}
        <View style={styles.section}>
          <AppText variant="title3" style={styles.sectionTitle}>
            {t('mortgage.dealLumpSums')}
          </AppText>
          {lumpSumEvents.length === 0 ? (
            <View style={styles.emptyLumpSums}>
              <AppText variant="bodySm" tone="muted" style={styles.centredText}>
                {t('mortgage.dealLumpSumsEmpty')}
              </AppText>
            </View>
          ) : (
            <Card style={styles.lumpSumList}>
              {lumpSumEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <TouchableOpacity
                    style={styles.lumpSumRow}
                    onPress={() => router.push(`/saved/${id}/events/${event.id}`)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.lumpSumMain}>
                      <AppText variant="labelMd">
                        {formatCurrency(event.amount ?? 0, currency)}
                      </AppText>
                      <AppText variant="bodySm" tone="muted">
                        {formatFriendlyDate(event.date, i18n.language)}
                      </AppText>
                    </View>
                    <ChevronRightIcon size={16} color={colours.textSecondary} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          )}
          <Button
            label={t('mortgage.addOverpayment')}
            onPress={() => router.push(`/saved/${id}/events/new?type=lumpOverpayment`)}
            variant="secondary"
            style={styles.addLumpSumBtn}
            leftIcon={<PlusIcon size={16} color={colours.primary} />}
          />
        </View>

        {/* Date guidance note */}
        <View style={styles.dateNoteCard}>
          <InfoCircleIcon size={16} color={colours.textSecondary} strokeWidth={1.8} />
          <AppText variant="bodySm" tone="muted" style={styles.dateNoteText}>
            {t('mortgage.dealOverpaymentDateNote')}
          </AppText>
        </View>

      </ScrollView>

      {/* Monthly overpayment edit modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setEditModalVisible(false)}>
          <Pressable style={styles.editDialog}>
            <AppText variant="title2">{t('mortgage.editDealMonthlyOverpayment')}</AppText>
            <View style={styles.editField}>
              <FieldLabel>{t('mortgage.dealMonthlyOverpayment')}</FieldLabel>
              <InputSurface>
                <InputAffix>{currencySymbol}</InputAffix>
                <AppTextInput
                  value={monthlyAmountText}
                  onChangeText={setMonthlyAmountText}
                  keyboardType="decimal-pad"
                  placeholder="150"
                  autoFocus
                />
              </InputSurface>
            </View>
            <View style={styles.editActions}>
              {deal.regularOverpayment > 0 ? (
                <Button
                  label={t('mortgage.removeDealMonthlyOverpayment')}
                  onPress={() => saveMonthlyOverpayment(0)}
                  variant="ghost"
                  style={styles.editAction}
                />
              ) : (
                <Button
                  label={t('save.cancel')}
                  onPress={() => setEditModalVisible(false)}
                  variant="ghost"
                  style={styles.editAction}
                />
              )}
              <Button
                label={t('edit.save')}
                onPress={() => {
                  if (!amountValid) return;
                  saveMonthlyOverpayment(numericAmount);
                }}
                disabled={!amountValid}
                style={styles.editAction}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: {
    padding: layout.screenPadding,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundBtn: { marginTop: spacing.md },
  impactCard: { padding: spacing.md },
  impactInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  impactText: {
    flex: 1,
    gap: spacing.xxs,
  },
  emptyImpact: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
  },
  centredText: { textAlign: 'center' },
  section: { gap: spacing.sm },
  sectionTitle: {},
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  emptyLumpSums: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
  },
  lumpSumList: { padding: 0, overflow: 'hidden' },
  lumpSumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  lumpSumMain: { flex: 1, gap: 2 },
  divider: {
    height: 1,
    backgroundColor: colours.border,
    marginHorizontal: spacing.md,
  },
  addLumpSumBtn: {},
  dateNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  dateNoteText: { flex: 1, lineHeight: 18 },
  modalScrim: {
    flex: 1,
    backgroundColor: colours.modalScrim,
    paddingHorizontal: layout.screenPadding,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: 92,
  },
  editDialog: {
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    padding: spacing.lg,
  },
  editField: { marginTop: spacing.md },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  editAction: { flex: 1 },
});
