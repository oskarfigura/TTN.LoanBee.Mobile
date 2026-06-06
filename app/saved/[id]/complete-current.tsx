import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { AppTextInput, FieldError, FieldHint, FieldLabel, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { OverpaymentEntryRow, OverpaymentRow } from '@/components/mortgage/OverpaymentEntryRow';
import { HeaderCloseAction } from '@/components/ui/HeaderCloseAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CURRENCIES } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { getCurrentDeal, projectDeal, recalculateLaterDealOpeningBalances } from '@/mortgage/tracker';
import {
  validateCompletionAmounts,
  validateCompletionOverpaymentRow,
  validateCompletionOverpaymentRows,
} from '@/mortgage/validation';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, layout, spacing } from '@/theme';
import { MortgageEvent } from '@/types/SavedLoan';
import { formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { createLocalId } from '@/utils/id';

export default function CompleteCurrentDealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);
  const currentDeal = loan ? getCurrentDeal(loan) : undefined;
  const currencySymbol = CURRENCIES.find(c => c.code === loan?.currency)?.symbol ?? '£';
  const defaultCompletedAt = currentDeal?.endDate ?? formatIsoDate(new Date());
  const getExpectedClosingBalance = (completionDate: string): number => {
    const projectionDate = parseDateLabelValue(completionDate) ?? new Date();
    return currentDeal && loan
      ? projectDeal(currentDeal, loan.events, projectionDate).balance
      : currentDeal?.openingBalance ?? 0;
  };

  const [completedAt, setCompletedAt] = useState(defaultCompletedAt);
  const [closingBalance, setClosingBalance] = useState(() => String(getExpectedClosingBalance(defaultCompletedAt)));
  const [closingBalanceEdited, setClosingBalanceEdited] = useState(false);
  const [feesOverride, setFeesOverride] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [overpayments, setOverpayments] = useState<OverpaymentRow[]>([]);
  const minimumCompletionDate = currentDeal ? parseDateLabelValue(currentDeal.startDate) ?? undefined : undefined;

  // The lender only confirms a balance; derive the fees from the gap to our prediction so
  // the user never has to do the subtraction. They can still override the figure.
  const predictedClosingBalance = getExpectedClosingBalance(completedAt);
  const closingBalanceNumeric = Number.parseFloat(closingBalance);
  const autoFees = Number.isFinite(closingBalanceNumeric)
    ? Math.max(0, Math.round((closingBalanceNumeric - predictedClosingBalance) * 100) / 100)
    : 0;
  const feesAutoApplied = feesOverride === null;
  const feesAdded = feesAutoApplied ? String(autoFees) : feesOverride;

  // A deal that hasn't started yet has no history to settle, so completion is blocked
  // even if the screen is reached directly (the detail view also hides the entry point).
  const dealNotStarted = Boolean(currentDeal && currentDeal.startDate > formatIsoDate(new Date()));

  const completionAmounts = validateCompletionAmounts(closingBalance, feesAdded);
  const completedAtErrorKey: string | undefined = currentDeal
    ? (
      dealNotStarted
        ? 'mortgage.dealNotStartedError'
        : !isValidIsoDate(completedAt)
          ? 'mortgage.invalidEventDate'
          : completedAt < currentDeal.startDate
            ? 'mortgage.eventOutsideDealDates'
            : undefined
    )
    : undefined;
  const overpaymentValidations = useMemo(() => {
    if (!currentDeal) return new Map<string, ReturnType<typeof validateCompletionOverpaymentRow>>();
    return validateCompletionOverpaymentRows(overpayments, currentDeal, completedAt);
  }, [completedAt, currentDeal, overpayments]);
  const hasInvalidOverpayment = [...overpaymentValidations.values()].some(validation => !validation.isValid);
  const canComplete = (
    completionAmounts.closingBalance.isValid
    && completionAmounts.feesAdded.isValid
    && !completedAtErrorKey
    && !hasInvalidOverpayment
  );

  const addOverpaymentRow = () =>
    setOverpayments(prev => [...prev, { id: createLocalId('op'), date: currentDeal?.startDate ?? formatIsoDate(new Date()), amount: '' }]);

  const updateOverpaymentRow = (id: string, field: keyof Omit<OverpaymentRow, 'id'>, value: string) =>
    setOverpayments(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));

  const removeOverpaymentRow = (id: string) =>
    setOverpayments(prev => prev.filter(row => row.id !== id));

  const handleCompletedAtChange = (value: string) => {
    setCompletedAt(value);
    if (!closingBalanceEdited) {
      setClosingBalance(String(getExpectedClosingBalance(value)));
    }
  };

  const handleClosingBalanceChange = (value: string) => {
    setClosingBalanceEdited(true);
    setClosingBalance(value);
  };

  const handleFeesChange = (value: string) => setFeesOverride(value);
  const resetFeesAuto = () => setFeesOverride(null);

  if (!loan || !currentDeal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.completeCurrentDeal')}
          variant="editor"
          leftAction={<HeaderCloseAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <AppText variant="title3" style={styles.notFoundText}>{t('mortgage.noCurrentDeal')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.completeCurrentDeal')}
        subtitle={t('mortgage.completeDealHelp')}
        variant="editor"
        leftAction={<HeaderCloseAction onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.field}>
          <DatePickerField
            label={t('mortgage.completionDate')}
            value={completedAt}
            onChange={handleCompletedAtChange}
            hint={t('mortgage.dateFormatHint')}
            minimumDate={minimumCompletionDate}
          />
          <FieldError message={completedAtErrorKey ? t(completedAtErrorKey) : undefined} />
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.closingBankBalance')}</FieldLabel>
          <InputSurface error={Boolean(completionAmounts.closingBalance.errorKey)}>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={closingBalance}
              onChangeText={handleClosingBalanceChange}
              keyboardType="decimal-pad"
              placeholder="238420"
            />
          </InputSurface>
          <FieldError message={completionAmounts.closingBalance.errorKey ? t(completionAmounts.closingBalance.errorKey) : undefined} />
          <FieldHint>{t('mortgage.closingBankBalanceHint')}</FieldHint>
        </View>

        <View style={styles.predictedRow}>
          <AppText variant="bodySm" tone="muted">{t('mortgage.predictedBalanceLabel')}</AppText>
          <AppText variant="bodySm" style={styles.predictedValue}>
            {formatCurrency(predictedClosingBalance, loan.currency)}
          </AppText>
        </View>
        <FieldHint>{t('mortgage.predictedBalanceHint')}</FieldHint>

        <View style={styles.field}>
          <View style={styles.feesLabelRow}>
            <FieldLabel>{t('mortgage.feesAdded')}</FieldLabel>
            {!feesAutoApplied ? (
              <TouchableOpacity onPress={resetFeesAuto} activeOpacity={0.7}>
                <AppText variant="bodySm" style={styles.resetLink}>{t('mortgage.feesResetAuto')}</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
          <InputSurface error={Boolean(completionAmounts.feesAdded.errorKey)}>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={feesAdded}
              onChangeText={handleFeesChange}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </InputSurface>
          <FieldError message={completionAmounts.feesAdded.errorKey ? t(completionAmounts.feesAdded.errorKey) : undefined} />
          <FieldHint>{t('mortgage.feesAutoHint')}</FieldHint>
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.overpaymentsDuringDeal')}</FieldLabel>
          {overpayments.map(row => (
            <OverpaymentEntryRow
              key={row.id}
              row={row}
              currencySymbol={currencySymbol}
              minimumDate={minimumCompletionDate}
              maximumDate={parseDateLabelValue(completedAt) ?? undefined}
              dateError={overpaymentValidations.get(row.id)?.dateErrorKey ? t(overpaymentValidations.get(row.id)!.dateErrorKey!) : undefined}
              amountError={overpaymentValidations.get(row.id)?.amount.errorKey ? t(overpaymentValidations.get(row.id)!.amount.errorKey!) : undefined}
              onDateChange={(rowId, date) => updateOverpaymentRow(rowId, 'date', date)}
              onAmountChange={(rowId, amount) => updateOverpaymentRow(rowId, 'amount', amount)}
              onRemove={removeOverpaymentRow}
            />
          ))}
          <Button
            label={t('mortgage.addOverpaymentRow')}
            onPress={addOverpaymentRow}
            variant="icon-pill"
            style={styles.addOverpaymentButton}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('mortgage.notes')}</FieldLabel>
          <InputSurface multiline>
            <AppTextInput
              style={styles.noteInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('mortgage.notesPlaceholder')}
              multiline
            />
          </InputSurface>
        </View>

        <Button
          label={t('mortgage.completeDeal')}
          onPress={() => {
            if (completedAtErrorKey || !completionAmounts.closingBalance.isValid || !completionAmounts.feesAdded.isValid) {
              Alert.alert(t('mortgage.invalidDealTitle'), t('mortgage.invalidCompletionDetails'));
              return;
            }
            if (hasInvalidOverpayment) {
              Alert.alert(t('mortgage.invalidEventTitle'), t('mortgage.invalidEventAmount'));
              return;
            }

            const now = new Date().toISOString();
            const validOverpayments: MortgageEvent[] = overpayments
              .map(row => ({
                id: createLocalId('ev'),
                createdAt: now,
                updatedAt: now,
                dealId: currentDeal.id,
                type: 'lumpOverpayment' as const,
                date: row.date,
                amount: overpaymentValidations.get(row.id)!.amount.numeric,
              }));

            const updatedLoan = {
              ...loan,
              events: [...loan.events, ...validOverpayments],
              deals: loan.deals.map(deal => deal.id === currentDeal.id
                ? {
                  ...deal,
                  status: 'completed' as const,
                  completion: {
                    completedAt,
                    closingBalance: completionAmounts.closingBalance.numeric,
                    feesAdded: completionAmounts.feesAdded.numeric,
                    notes: notes.trim() || undefined,
                  },
                  updatedAt: now,
                }
                : deal),
            };
            savedLoansStorage.update(recalculateLaterDealOpeningBalances(updatedLoan, currentDeal.id));
            router.back();
          }}
          disabled={!canComplete}
          style={styles.action}
        />
        <Button
          label={t('save.cancel')}
          onPress={() => router.back()}
          variant="ghost"
          style={styles.cancelBtn}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  keyboardView: { flex: 1 },
  container: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { marginBottom: spacing.md },
  field: { marginTop: spacing.md },
  predictedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: colours.surface,
  },
  predictedValue: { color: colours.textPrimary },
  feesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetLink: { color: colours.primary },
  addOverpaymentButton: { marginTop: spacing.xs },
  noteInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  action: { marginTop: spacing.xl },
  cancelBtn: { marginTop: spacing.xs },
});
