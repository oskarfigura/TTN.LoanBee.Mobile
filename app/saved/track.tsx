import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { savedLoansStorage } from '@/storage/savedLoans';
import { storage } from '@/storage/mmkv';
import { STORAGE_KEYS } from '@/storage/keys';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { OverpaymentEntryRow, OverpaymentRow } from '@/components/mortgage/OverpaymentEntryRow';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { KeyboardAwareFormScreen } from '@/components/ui/KeyboardAwareFormScreen';
import {
  AppTextInput,
  FieldError,
  FieldHint,
  FieldLabel,
  FormSection,
  InputAffix,
  InputSurface,
  SegmentedControl,
} from '@/components/ui/FormPrimitives';
import { SaveIcon } from '@/components/ui/Icons/SaveIcon/SaveIcon';
import {
  buildTrackedMortgageFromForm,
  TrackMortgageFormValues,
} from '@/mortgage/trackBuilder';
import { calculateDealMonthlyPayment } from '@/mortgage/tracker';
import { MortgageRepaymentType } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { addMonthsToIsoDate, formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { validateDurationText, validateMoneyText } from '@/utils/formValidation';
import { useStoreReview } from '@/review';
import { colours, layout, radii, spacing } from '@/theme';

const numberText = (value?: number): string =>
  value === undefined || !Number.isFinite(value) || value <= 0 ? '' : String(value);

export default function TrackMortgageScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { add, update } = useSavedLoans();
  const { recordUsefulAction, requestReview } = useStoreReview();

  // Resume path: an existing (legacy) draft is finalised in place rather than
  // duplicated. New mortgages never pre-create a draft, so this is rare.
  const existing = useMemo(() => (id ? savedLoansStorage.getById(id) : undefined), [id]);
  const existingDeal = existing?.deals[0];
  const defaultCurrency = (storage.getString(STORAGE_KEYS.USER_CURRENCY) as CurrencyCode) ?? 'GBP';

  const today = useMemo(() => formatIsoDate(new Date()), []);

  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [lender, setLender] = useState(existing?.lender ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(existing?.currency ?? defaultCurrency);
  const [balance, setBalance] = useState(numberText(existing?.formSnapshot.loanAmount));
  const [rate, setRate] = useState(numberText(existing?.formSnapshot.interest));
  const [repaymentType, setRepaymentType] = useState<MortgageRepaymentType>(
    existingDeal?.repaymentType ?? 'repayment',
  );
  const initialTermMonths = existing?.mortgageTermInMonths ?? 0;
  const [termYears, setTermYears] = useState(initialTermMonths ? String(Math.floor(initialTermMonths / 12)) : '');
  const [termMonths, setTermMonths] = useState(initialTermMonths ? String(initialTermMonths % 12) : '');

  const [hasDealEnd, setHasDealEnd] = useState(
    Boolean(existingDeal && existingDeal.endDate && existingDeal.endDate > today),
  );
  const [dealEndDate, setDealEndDate] = useState(existingDeal?.endDate ?? addMonthsToIsoDate(today, 24));

  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const [regularOverpayment, setRegularOverpayment] = useState(
    numberText(existingDeal?.regularOverpayment),
  );
  const [lumpRows, setLumpRows] = useState<OverpaymentRow[]>(() => (
    (existing?.events ?? [])
      .filter(event => event.type === 'lumpOverpayment')
      .map(event => ({ id: createLocalId('op'), date: event.date, amount: String(event.amount ?? '') }))
  ));

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';

  const balanceValidation = validateMoneyText(balance);
  const rateValidation = validateMoneyText(rate, { max: 100, maxErrorKey: 'forms.interestMax' });
  const durationValidation = validateDurationText(termYears, termMonths);
  const regularValidation = validateMoneyText(regularOverpayment, { required: false, allowZero: true });

  const canSave = nickname.trim().length > 0
    && balanceValidation.isValid
    && rateValidation.isValid
    && durationValidation.isValid;

  // Cheap live summary — a single payment formula, no full projection — so it can
  // recompute on every keystroke without debouncing.
  const summary = useMemo(() => {
    if (!balanceValidation.isValid || !rateValidation.isValid || !durationValidation.isValid) {
      return null;
    }
    const monthly = calculateDealMonthlyPayment(
      balanceValidation.numeric,
      rateValidation.numeric,
      durationValidation.totalMonths,
      repaymentType,
    );
    return {
      monthly,
      payoffDate: addMonthsToIsoDate(today, durationValidation.totalMonths),
    };
  }, [balanceValidation, rateValidation, durationValidation, repaymentType, today]);

  const buildValues = (): TrackMortgageFormValues => ({
    nickname,
    lender: lender.trim() || undefined,
    currency,
    currentBalance: balanceValidation.numeric,
    interestRate: rateValidation.numeric,
    repaymentType,
    remainingTermInMonths: durationValidation.totalMonths,
    dealEndDate: hasDealEnd && isValidIsoDate(dealEndDate) ? dealEndDate : undefined,
    regularOverpayment: regularValidation.isValid ? regularValidation.numeric : 0,
    lumpOverpayments: lumpRows
      .map(row => ({ date: row.date, amount: validateMoneyText(row.amount).numeric }))
      .filter(row => isValidIsoDate(row.date) && row.amount > 0),
  });

  const handleSave = () => {
    if (!canSave) return;

    const built = buildTrackedMortgageFromForm(
      buildValues(),
      existing ? { id: existing.id, createdAt: existing.createdAt } : {},
    );
    const withOrder = {
      ...built,
      dashboardOrder: existing?.dashboardOrder ?? savedLoansStorage.getMaxDashboardOrder() + 1,
    };

    if (existing) update(withOrder);
    else add(withOrder);

    recordUsefulAction().then(() => requestReview()).catch(() => undefined);

    router.replace({
      pathname: '/saved/[id]' as never,
      params: { id: withOrder.id, fromSave: '1' },
    });
  };

  const handleClose = () => {
    // Drop a legacy draft the user reopened but left empty rather than stranding it.
    if (existing && existing.status === 'draft' && existing.formSnapshot.loanAmount === 0 && existing.deals.length === 0) {
      savedLoansStorage.remove(existing.id);
    }
    if (router.canGoBack()) router.back();
    else router.replace('/saved');
  };

  const addLumpRow = () => setLumpRows(prev => [
    ...prev,
    { id: createLocalId('op'), date: today, amount: '' },
  ]);

  return (
    <KeyboardAwareFormScreen
      title={t('track.title')}
      subtitle={t('track.subtitle')}
      onClose={handleClose}
      closeAccessibilityLabel={t('common.close', { defaultValue: 'Close' })}
      footer={(
        <Button
          label={t('track.save')}
          onPress={handleSave}
          disabled={!canSave}
          leftIcon={<SaveIcon color={colours.white} size={18} />}
        />
      )}
    >
      <FormSection title={t('track.sectionToday')} accent>
        <AppText variant="bodySm" tone="muted" style={styles.sectionIntro}>
          {t('track.todayHelp')}
        </AppText>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('track.nickname')}</FieldLabel>
          <InputSurface>
            <AppTextInput
              placeholder={t('track.nicknamePlaceholder')}
              value={nickname}
              onChangeText={setNickname}
            />
          </InputSurface>
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('track.lender')}</FieldLabel>
          <LenderTextInput value={lender} onChange={setLender} />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('track.currency')}</FieldLabel>
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('track.currentBalance')}</FieldLabel>
          <InputSurface error={!balanceValidation.isValid && !balanceValidation.isEmpty}>
            <InputAffix>{currencySymbol}</InputAffix>
            <AppTextInput
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </InputSurface>
          <FieldHint>{t('track.currentBalanceHint')}</FieldHint>
          <FieldError message={!balanceValidation.isEmpty && balanceValidation.errorKey ? t(balanceValidation.errorKey) : undefined} />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('track.rate')}</FieldLabel>
          <InputSurface error={!rateValidation.isValid && !rateValidation.isEmpty}>
            <AppTextInput
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholder="2.5"
            />
            <InputAffix trailing>%</InputAffix>
          </InputSurface>
          <FieldError message={!rateValidation.isEmpty && rateValidation.errorKey ? t(rateValidation.errorKey) : undefined} />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('track.repaymentType')}</FieldLabel>
          <SegmentedControl
            value={repaymentType}
            onChange={setRepaymentType}
            options={[
              { label: t('mortgage.repayment'), value: 'repayment' },
              { label: t('mortgage.interestOnly'), value: 'interestOnly' },
            ]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>{t('track.remainingTerm')}</FieldLabel>
          <View style={styles.row}>
            <View style={styles.half}>
              <InputSurface>
                <AppTextInput value={termYears} onChangeText={setTermYears} keyboardType="number-pad" placeholder="20" />
                <InputAffix trailing>{t('mortgage.totalMortgageTermYears')}</InputAffix>
              </InputSurface>
            </View>
            <View style={styles.half}>
              <InputSurface>
                <AppTextInput value={termMonths} onChangeText={setTermMonths} keyboardType="number-pad" placeholder="0" />
                <InputAffix trailing>{t('mortgage.totalMortgageTermMonths')}</InputAffix>
              </InputSurface>
            </View>
          </View>
          <FieldHint>{t('track.remainingTermHint')}</FieldHint>
          <FieldError message={durationValidation.errorKey && !durationValidation.years.isEmpty ? t(durationValidation.errorKey) : undefined} />
        </View>
      </FormSection>

      <FormSection title={t('track.sectionDeal')}>
        <AppText variant="bodySm" tone="muted" style={styles.sectionIntro}>
          {t('track.dealHelp')}
        </AppText>
        <SegmentedControl
          value={hasDealEnd ? 'fixed' : 'none'}
          onChange={value => setHasDealEnd(value === 'fixed')}
          options={[
            { label: t('track.dealFixed'), value: 'fixed' },
            { label: t('track.dealNone'), value: 'none' },
          ]}
        />
        {hasDealEnd ? (
          <DatePickerField
            label={t('track.dealEndDate')}
            value={dealEndDate}
            onChange={setDealEndDate}
            hint={t('track.dealEndDateHint')}
            minimumDate={parseDateLabelValue(today) ?? undefined}
          />
        ) : null}
      </FormSection>

      <View>
        <TouchableOpacity
          style={styles.enrichmentToggle}
          onPress={() => setEnrichmentOpen(open => !open)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={styles.enrichmentToggleCopy}>
            <AppText variant="labelMd">{t('track.sectionOverpayments')}</AppText>
            <AppText variant="bodySm" tone="muted">{t('track.overpaymentsHelp')}</AppText>
          </View>
          <AppText variant="title3" tone="accent">{enrichmentOpen ? '−' : '+'}</AppText>
        </TouchableOpacity>

        {enrichmentOpen ? (
          <FormSection style={styles.enrichmentBody}>
            <View style={styles.fieldGroup}>
              <FieldLabel>{t('track.regularOverpayment')}</FieldLabel>
              <InputSurface error={Boolean(regularValidation.errorKey) && !regularValidation.isEmpty}>
                <InputAffix>{currencySymbol}</InputAffix>
                <AppTextInput
                  value={regularOverpayment}
                  onChangeText={setRegularOverpayment}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <InputAffix trailing>{t('track.perMonth')}</InputAffix>
              </InputSurface>
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel>{t('track.lumpOverpayments')}</FieldLabel>
              {lumpRows.map(row => (
                <OverpaymentEntryRow
                  key={row.id}
                  row={row}
                  currencySymbol={currencySymbol}
                  minimumDate={parseDateLabelValue(today) ?? undefined}
                  onDateChange={(rowId, date) => setLumpRows(prev => prev.map(r => (r.id === rowId ? { ...r, date } : r)))}
                  onAmountChange={(rowId, amount) => setLumpRows(prev => prev.map(r => (r.id === rowId ? { ...r, amount } : r)))}
                  onRemove={rowId => setLumpRows(prev => prev.filter(r => r.id !== rowId))}
                />
              ))}
              <Button
                label={t('track.addLumpOverpayment')}
                onPress={addLumpRow}
                variant="icon-pill"
                style={styles.addBtn}
              />
            </View>
          </FormSection>
        ) : null}
      </View>

      {summary ? (
        <View style={styles.summaryCard}>
          <AppText variant="labelSm" tone="accent" style={styles.summaryHeading}>
            {t('track.summaryTitle')}
          </AppText>
          <View style={styles.summaryRow}>
            <AppText variant="bodySm" tone="muted">{t('track.summaryMonthly')}</AppText>
            <AppText variant="bodyMd" style={styles.summaryValue}>
              {formatCurrency(summary.monthly, currency)}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="bodySm" tone="muted">{t('track.summaryPayoff')}</AppText>
            <AppText variant="bodyMd" style={styles.summaryValue}>
              {summary.payoffDate.slice(0, 4)}
            </AppText>
          </View>
        </View>
      ) : null}
    </KeyboardAwareFormScreen>
  );
}

const styles = StyleSheet.create({
  sectionIntro: { marginBottom: spacing.xs },
  fieldGroup: { gap: spacing.xxs },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  addBtn: { marginTop: spacing.xs },
  enrichmentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: layout.cardPadding,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceMuted,
  },
  enrichmentToggleCopy: { flex: 1, gap: spacing.xxxs },
  enrichmentBody: { marginTop: spacing.xs },
  summaryCard: {
    backgroundColor: colours.surfaceAccent,
    borderRadius: radii.card,
    padding: layout.cardPadding,
    gap: spacing.xs,
  },
  summaryHeading: { textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryValue: { color: colours.textPrimary },
});
