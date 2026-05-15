import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DealEditorForm } from '@/components/loans/DealEditorForm';
import { AppTextInput, FieldLabel, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import {
  canActivateDeal,
  canDeleteDeal,
  canEditDeal,
  formatDealDuration,
  getChronologicalDeals,
  getDealOverpaymentImpact,
  getMortgageTermInMonths,
  getNextDealStartDate,
  normaliseDealChain,
  removeLatestDealAndEvents,
  withMortgageTermInMonths,
} from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal, MortgageEvent, SavedLoan } from '@/types/SavedLoan';
import { colours, radii, spacing } from '@/theme';
import { formatFriendlyDateRange, formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { createLocalId } from '@/utils/id';

type OverpaymentRow = { id: string; date: string; amount: string };

type OverpaymentEntryRowProps = {
  row: OverpaymentRow;
  currencySymbol: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onDateChange: (id: string, date: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onRemove: (id: string) => void;
};

const OverpaymentEntryRow = ({
  row,
  currencySymbol,
  minimumDate,
  maximumDate,
  onDateChange,
  onAmountChange,
  onRemove,
}: OverpaymentEntryRowProps) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerValue = parseDateLabelValue(row.date) ?? new Date();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setPickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onDateChange(row.id, formatIsoDate(selectedDate));
  };

  return (
    <View style={styles.overpaymentRow}>
      <View style={styles.overpaymentDateInput}>
        {Platform.OS === 'ios' ? (
          <InputSurface style={styles.iosDateSurface}>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="compact"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={handleDateChange}
            />
          </InputSurface>
        ) : (
          <>
            <TouchableOpacity onPress={() => setPickerVisible(true)} activeOpacity={0.84}>
              <InputSurface>
                <AppTextInput
                  value={row.date}
                  editable={false}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateText}
                />
              </InputSurface>
            </TouchableOpacity>
            {pickerVisible ? (
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="default"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleDateChange}
              />
            ) : null}
          </>
        )}
      </View>
      <InputSurface style={styles.overpaymentAmountInput}>
        <InputAffix>{currencySymbol}</InputAffix>
        <AppTextInput
          value={row.amount}
          onChangeText={amount => onAmountChange(row.id, amount)}
          keyboardType="decimal-pad"
          placeholder="5000"
        />
      </InputSurface>
      <TouchableOpacity style={styles.overpaymentRemove} onPress={() => onRemove(row.id)} activeOpacity={0.84}>
        <AppText style={styles.overpaymentRemoveText}>×</AppText>
      </TouchableOpacity>
    </View>
  );
};

const CompletedDealDetailView = ({
  initialLoan,
  deal,
  onDelete,
}: {
  initialLoan: SavedLoan;
  deal: LoanDeal;
  onDelete?: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [currentLoan, setCurrentLoan] = useState(initialLoan);
  const [overpayments, setOverpayments] = useState<OverpaymentRow[]>(() =>
    initialLoan.events
      .filter(e => e.type === 'lumpOverpayment' && e.dealId === deal.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({ id: createLocalId('op'), date: e.date, amount: String(e.amount ?? '') }))
  );

  const currencySymbol = CURRENCIES.find(c => c.code === initialLoan.currency)?.symbol ?? '£';
  const minimumDate = parseDateLabelValue(deal.startDate) ?? undefined;
  const maximumDate = parseDateLabelValue(deal.completion?.completedAt ?? deal.endDate) ?? undefined;

  const addRow = () =>
    setOverpayments(prev => [...prev, { id: createLocalId('op'), date: deal.startDate, amount: '' }]);

  const updateRow = (rowId: string, field: keyof Omit<OverpaymentRow, 'id'>, value: string) =>
    setOverpayments(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));

  const removeRow = (rowId: string) =>
    setOverpayments(prev => prev.filter(r => r.id !== rowId));

  const saveOverpayments = () => {
    const now = new Date().toISOString();
    const validOps: MortgageEvent[] = overpayments
      .filter(row => isValidIsoDate(row.date) && Number(row.amount) > 0)
      .map(row => ({
        id: createLocalId('ev'),
        createdAt: now,
        updatedAt: now,
        dealId: deal.id,
        type: 'lumpOverpayment' as const,
        date: row.date,
        amount: Number(row.amount),
      }));
    const updatedLoan: SavedLoan = {
      ...currentLoan,
      events: [
        ...currentLoan.events.filter(e => !(e.type === 'lumpOverpayment' && e.dealId === deal.id)),
        ...validOps,
      ],
    };
    savedLoansStorage.update(updatedLoan);
    setCurrentLoan(updatedLoan);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.dealDetails')}
        subtitle={deal.name}
        subtitleVariant="context"
        variant="detail"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.readOnlyCard}>
          <AppText variant="labelMd" tone="muted" style={styles.readOnlyKicker}>{t('saved.completed')}</AppText>
          <AppText variant="title1" tone="accent" style={styles.readOnlyTitle}>{deal.name}</AppText>
          <AppText variant="bodySm" tone="muted" style={styles.readOnlyMeta}>
            {formatFriendlyDateRange(deal.startDate, deal.endDate)}
          </AppText>
          <View style={styles.readOnlyGrid}>
            <ReadOnlyMetric label={t('calculator.interestRate')} value={`${deal.interestRate}%`} />
            <ReadOnlyMetric label={t('mortgage.duration')} value={formatDealDuration(deal, i18n.language)} />
            <ReadOnlyMetric label={t('results.monthlyPayment')} value={formatCurrency(deal.monthlyPayment, currentLoan.currency)} />
            <ReadOnlyMetric label={t('mortgage.openingBankBalance')} value={formatCurrency(deal.openingBalance, currentLoan.currency)} />
            <ReadOnlyMetric
              label={t('mortgage.closingBankBalance')}
              value={formatCurrency(deal.completion?.closingBalance ?? 0, currentLoan.currency)}
            />
          </View>
          <CompletedDealSavings deal={deal} events={currentLoan.events} currency={currentLoan.currency} />
          {deal.completion?.notes ? (
            <AppText variant="bodySm" style={styles.readOnlyNotes}>{deal.completion.notes}</AppText>
          ) : null}
        </Card>

        <View style={styles.overpaymentSection}>
          <FieldLabel>{t('mortgage.overpaymentsDuringDeal')}</FieldLabel>
          {overpayments.map(row => (
            <OverpaymentEntryRow
              key={row.id}
              row={row}
              currencySymbol={currencySymbol}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onDateChange={(rowId, date) => updateRow(rowId, 'date', date)}
              onAmountChange={(rowId, amount) => updateRow(rowId, 'amount', amount)}
              onRemove={removeRow}
            />
          ))}
          <Button
            label={t('mortgage.addOverpaymentRow')}
            onPress={addRow}
            variant="icon-pill"
            style={styles.addOverpaymentButton}
          />
          <Button
            label={t('common.save')}
            onPress={saveOverpayments}
            style={styles.saveOverpaymentButton}
          />
        </View>

        <Button
          label={t('mortgage.editDeal')}
          onPress={() => router.replace(`/saved/${initialLoan.id}/deals/${deal.id}?correct=1`)}
          variant="secondary"
          style={styles.correctAction}
        />
        {onDelete ? (
          <Button
            label={t('mortgage.deleteDeal')}
            onPress={onDelete}
            variant="destructive"
            style={styles.correctAction}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default function EditDealScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, dealId, correct } = useLocalSearchParams<{ id: string; dealId: string; correct?: string }>();
  const loan = savedLoansStorage.getById(id);
  const deal = loan?.deals.find(item => item.id === dealId);

  if (!loan || !deal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.editDeal')}
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

  const isCorrectionMode = deal.status === 'completed' && correct === '1';
  const chronologicalDeals = getChronologicalDeals(loan);
  const dealIndex = chronologicalDeals.findIndex(item => item.id === deal.id);
  const previousDeal = dealIndex > 0 ? chronologicalDeals[dealIndex - 1] : undefined;
  const fixedStartDate = previousDeal ? getNextDealStartDate(previousDeal, loan.formSnapshot.startDate) : undefined;
  const isInitialDeal = chronologicalDeals[0]?.id === deal.id;
  const dealIsEditable = canEditDeal(loan, deal.id);
  const canEditMortgageTerm = isInitialDeal && dealIsEditable;

  const deleteLatestDeal = () => {
    if (!canDeleteDeal(loan, deal.id)) return;

    Alert.alert(
      t('mortgage.deleteDealTitle'),
      t('mortgage.deleteDealMessage', { name: deal.name }),
      [
        { text: t('results.cancelLeave'), style: 'cancel' },
        {
          text: t('mortgage.deleteDeal'),
          style: 'destructive',
          onPress: () => {
            savedLoansStorage.update(removeLatestDealAndEvents(loan, deal.id));
            router.back();
          },
        },
      ],
    );
  };

  const saveDeal = (updatedDeal: LoanDeal, updatedMortgageTermInMonths?: number) => {
    if (!canEditDeal(loan, updatedDeal.id)) {
      Alert.alert(t('mortgage.dealLockedByLaterTitle'), t('mortgage.dealLockedByLaterBody'));
      return;
    }

    const loanWithTerm = updatedMortgageTermInMonths
      ? withMortgageTermInMonths(loan, updatedMortgageTermInMonths)
      : loan;
    const nextLoan = {
      ...loanWithTerm,
      deals: loanWithTerm.deals.map(item => item.id === updatedDeal.id ? updatedDeal : item),
    };

    savedLoansStorage.update(normaliseDealChain(nextLoan, updatedDeal.id));
    router.back();
  };

  if (!dealIsEditable) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.dealDetails')}
          subtitle={deal.name}
          subtitleVariant="context"
          variant="detail"
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.readOnlyCard}>
            <AppText variant="labelMd" tone="muted" style={styles.readOnlyKicker}>{t('mortgage.dealLockedByLaterTitle')}</AppText>
            <AppText variant="title1" tone="accent" style={styles.readOnlyTitle}>{deal.name}</AppText>
            <AppText variant="bodySm" tone="muted" style={styles.readOnlyMeta}>
              {formatFriendlyDateRange(deal.startDate, deal.endDate, i18n.language)}
            </AppText>
            <View style={styles.readOnlyGrid}>
              <ReadOnlyMetric label={t('calculator.interestRate')} value={`${deal.interestRate}%`} />
              <ReadOnlyMetric label={t('mortgage.duration')} value={formatDealDuration(deal, i18n.language)} />
              <ReadOnlyMetric label={t('results.monthlyPayment')} value={formatCurrency(deal.monthlyPayment, loan.currency)} />
              <ReadOnlyMetric label={t('mortgage.openingBankBalance')} value={formatCurrency(deal.openingBalance, loan.currency)} />
            </View>
            <AppText variant="bodySm" tone="muted" style={styles.readOnlyNotes}>
              {t('mortgage.dealLockedByLaterBody')}
            </AppText>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (deal.status === 'completed' && !isCorrectionMode) {
    return (
      <CompletedDealDetailView
        initialLoan={loan}
        deal={deal}
        onDelete={canDeleteDeal(loan, deal.id) ? deleteLatestDeal : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={isCorrectionMode ? t('mortgage.editDeal') : undefined}
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <DealEditorForm
        currency={loan.currency}
        initialDeal={deal}
        canPublish={canActivateDeal(loan, deal.id)}
        fixedStartDate={fixedStartDate}
        mortgageStartDate={loan.formSnapshot.startDate}
        mortgageTermInMonths={getMortgageTermInMonths(loan)}
        isInitialDeal={isInitialDeal}
        canEditMortgageTerm={canEditMortgageTerm}
        showSectionTabs={!isCorrectionMode}
        onCancel={() => router.back()}
        onSave={saveDeal}
        onDeleteDraft={deal.status === 'draft' && canDeleteDeal(loan, deal.id) ? () => {
          Alert.alert(
            t('mortgage.deleteDraftTitle'),
            t('mortgage.deleteDraftMessage'),
            [
              { text: t('results.cancelLeave'), style: 'cancel' },
              {
                text: t('mortgage.deleteDraft'),
                style: 'destructive',
                onPress: () => {
                  savedLoansStorage.update(removeLatestDealAndEvents(loan, deal.id));
                  router.back();
                },
              },
            ],
          );
        } : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: 16 },
  readOnlyCard: { marginBottom: spacing.md },
  readOnlyKicker: {
    textTransform: 'uppercase',
  },
  readOnlyTitle: {
    marginTop: spacing.xs,
  },
  readOnlyMeta: {
    marginTop: spacing.xs,
  },
  readOnlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  readOnlySavings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  readOnlyMetric: {
    width: '47%',
    borderWidth: 1,
    borderColor: colours.borderSoft,
    borderRadius: radii.input,
    backgroundColor: colours.surfaceRaised,
    padding: spacing.sm,
  },
  readOnlyMetricAccent: {
    borderColor: colours.successBorder,
    backgroundColor: colours.successSurface,
  },
  readOnlyLabel: {
    textTransform: 'uppercase',
  },
  readOnlyValue: {
    marginTop: spacing.xs,
  },
  readOnlyNotes: {
    lineHeight: 20,
    marginTop: spacing.md,
  },
  correctAction: { marginTop: spacing.sm },
  overpaymentSection: { marginTop: spacing.md },
  overpaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  overpaymentDateInput: { flex: 3 },
  iosDateSurface: { justifyContent: 'center' },
  dateText: { color: colours.textPrimary },
  overpaymentAmountInput: { flex: 2 },
  overpaymentRemove: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  overpaymentRemoveText: { color: colours.error, fontSize: 22 },
  addOverpaymentButton: { marginTop: spacing.xs },
  saveOverpaymentButton: { marginTop: spacing.sm },
});

const CompletedDealSavings = ({
  deal,
  events,
  currency,
}: {
  deal: LoanDeal;
  events: MortgageEvent[];
  currency: CurrencyCode;
}) => {
  const { t } = useTranslation();
  const impact = useMemo(() => getDealOverpaymentImpact(deal, events), [deal, events]);
  if (!impact.hasOverpayments) return null;

  return (
    <View style={styles.readOnlySavings}>
      <ReadOnlyMetric
        label={t('mortgage.dealInterestSaved')}
        value={formatCurrency(impact.interestSaved, currency)}
        tone="accent"
      />
      <ReadOnlyMetric
        label={t('mortgage.dealExtraPrincipal')}
        value={formatCurrency(impact.extraPrincipalRepaid, currency)}
        tone="accent"
      />
      <ReadOnlyMetric
        label={t('mortgage.dealOverpaymentsApplied')}
        value={formatCurrency(impact.totalOverpayments, currency)}
        tone="accent"
      />
    </View>
  );
};

const ReadOnlyMetric = ({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'accent';
}) => (
  <View style={[styles.readOnlyMetric, tone === 'accent' && styles.readOnlyMetricAccent]}>
    <AppText variant="labelSm" tone="muted" style={styles.readOnlyLabel}>{label}</AppText>
    <AppText
      variant="title3"
      tone={tone === 'accent' ? 'success' : 'accent'}
      style={styles.readOnlyValue}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </AppText>
  </View>
);
