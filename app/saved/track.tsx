import React, { useEffect, useMemo, useState } from 'react';
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
import { AppText } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
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
} from '@oskarfigura/ui-native';
import { Icon, IconName } from '@/components/ui/Icon';
import {
  buildTrackedMortgageFromForm,
  deriveTrackSeedFromLoan,
  TrackMortgageFormValues,
} from '@/mortgage/trackBuilder';
import { buildMortgageProjection } from '@/mortgage/projection';
import { calculateDealMonthlyPayment } from '@/mortgage/tracker';
import { LoanCategory, MortgageRepaymentType } from '@/types/SavedLoan';
import { createLocalId } from '@/utils/id';
import { addMonthsToIsoDate, formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { validateDurationText, validateMoneyText } from '@/utils/formValidation';
import { validateTrackLumpRows } from '@/mortgage/validation';
import { useStoreReview } from '@/review';
import { colours, layout, radii, spacing } from '@/theme';

const numberText = (value?: number): string =>
  value === undefined || !Number.isFinite(value) || value <= 0 ? '' : String(value);

export default function TrackMortgageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, category: categoryParam } = useLocalSearchParams<{ id?: string; category?: string }>();
  const { add, update } = useSavedLoans();
  const { recordUsefulAction, requestReview } = useStoreReview();

  const today = useMemo(() => formatIsoDate(new Date()), []);

  // Resume path: an existing (legacy) draft is finalised in place rather than
  // duplicated. New mortgages never pre-create a draft, so this is rare. The
  // form is today-anchored, so seed values are derived from the loan's current
  // state (projected balance, current deal, remaining term) — not its original
  // figures. See deriveTrackSeedFromLoan.
  const existing = useMemo(() => (id ? savedLoansStorage.getById(id) : undefined), [id]);
  const seed = useMemo(
    () => (existing ? deriveTrackSeedFromLoan(existing, today) : undefined),
    [existing, today],
  );
  const defaultCurrency = (storage.getString(STORAGE_KEYS.USER_CURRENCY) as CurrencyCode) ?? 'GBP';

  const [nickname, setNickname] = useState(seed?.nickname ?? '');
  const [lender, setLender] = useState(seed?.lender ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(seed?.currency ?? defaultCurrency);
  // Category is fixed by the intent step (or the resumed draft); the form no
  // longer offers a Loan/Mortgage toggle, so it stays single-purpose.
  const [category] = useState<LoanCategory>(
    existing?.category ?? (categoryParam === 'loan' ? 'loan' : 'mortgage'),
  );
  // Mortgages can be tracked "from today" (current balance) or "from the
  // beginning" (original purchase price + deposit, from which the borrowed
  // balance is derived). Resuming a legacy draft always lands on today.
  const [mode, setMode] = useState<'today' | 'beginning'>('today');
  const [startDate, setStartDate] = useState(today);
  const [balance, setBalance] = useState(numberText(seed?.currentBalance));
  const [propertyPrice, setPropertyPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [rate, setRate] = useState(numberText(seed?.interestRate));
  const [repaymentType, setRepaymentType] = useState<MortgageRepaymentType>(
    seed?.repaymentType ?? 'repayment',
  );
  const initialTermMonths = seed?.remainingTermInMonths ?? 0;
  const [termYears, setTermYears] = useState(initialTermMonths ? String(Math.floor(initialTermMonths / 12)) : '');
  const [termMonths, setTermMonths] = useState(initialTermMonths ? String(initialTermMonths % 12) : '');

  const [dealEndDate, setDealEndDate] = useState(seed?.dealEndDate ?? addMonthsToIsoDate(startDate, 24));

  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const [regularOverpayment, setRegularOverpayment] = useState(
    numberText(seed?.regularOverpayment),
  );
  const [lumpRows, setLumpRows] = useState<OverpaymentRow[]>(() => (
    (seed?.lumpOverpayments ?? [])
      .map(op => ({ id: createLocalId('op'), date: op.date, amount: String(op.amount) }))
  ));

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';
  const isMortgage = category === 'mortgage';
  // Deposit capture is a mortgage-only concept; loans never expose the toggle.
  const useBeginning = isMortgage && mode === 'beginning';
  const startDatePosition = startDate < today ? 'past' : startDate > today ? 'future' : 'today';
  const balanceLabel = startDatePosition === 'today' ? t('track.currentBalance') : t('track.startingBalance');
  const balanceHint = startDatePosition === 'today' ? t('track.currentBalanceHint') : t('track.startingBalanceHint');
  const termLabel = useBeginning || startDatePosition === 'past'
    ? t('track.originalTerm')
    : startDatePosition === 'today'
      ? t('track.remainingTerm')
      : t('track.termLength');
  const termHint = useBeginning || startDatePosition === 'past'
    ? t('track.originalTermHint')
    : startDatePosition === 'today'
      ? t('track.remainingTermHint')
      : t('track.termLengthHint');

  const balanceValidation = validateMoneyText(balance);
  const rateValidation = validateMoneyText(rate, { max: 100, maxErrorKey: 'forms.interestMax' });
  const durationValidation = validateDurationText(termYears, termMonths);
  const regularValidation = validateMoneyText(regularOverpayment, { required: false, allowZero: true });

  // From-beginning mode: the borrowed balance is derived as price − deposit.
  // A single (numeric, isValid) pair feeds the rest of the form so the summary,
  // overpayment guards, save guard and builder stay balance-driven regardless of mode.
  const priceValidation = validateMoneyText(propertyPrice);
  const depositValidation = validateMoneyText(deposit, { required: false, allowZero: true });
  const depositTooLarge = useBeginning
    && priceValidation.isValid
    && !depositValidation.isEmpty
    && depositValidation.numeric >= priceValidation.numeric;
  const derivedBorrowed = Math.max(0, priceValidation.numeric - depositValidation.numeric);
  const beginningBalanceValid = priceValidation.isValid
    && depositValidation.isValid
    && !depositTooLarge
    && derivedBorrowed > 0;
  const effectiveBalanceNumeric = useBeginning ? derivedBorrowed : balanceValidation.numeric;
  const effectiveBalanceValid = useBeginning ? beginningBalanceValid : balanceValidation.isValid;

  // Surface whichever duration problem actually blocks the save: an out-of-range
  // sub-field (e.g. 15 months) or the combined "total term must be positive"
  // guard. Empty sub-fields are not errors — they count as zero.
  const durationErrorKey = (!durationValidation.months.isEmpty && durationValidation.months.errorKey)
    || (!durationValidation.years.isEmpty && durationValidation.years.errorKey)
    || (durationValidation.errorKey
      && (!durationValidation.years.isEmpty || !durationValidation.months.isEmpty)
      ? durationValidation.errorKey
      : undefined)
    || undefined;

  // A mortgage's current deal must declare when the fixed/tracker period ends, so
  // the deal is labelled by its real term (e.g. "5-year Fixed") rather than the
  // whole remaining mortgage term. It must land after the start and within payoff.
  const payoffDateIso = durationValidation.isValid
    ? addMonthsToIsoDate(startDate, durationValidation.totalMonths)
    : undefined;
  const dealEndInvalid = isMortgage && (
    !isValidIsoDate(dealEndDate)
    || dealEndDate <= startDate
    || (payoffDateIso !== undefined && dealEndDate > payoffDateIso)
  );

  // Lump overpayments must fall within [start, payoff] and not collectively
  // exceed the balance — otherwise the projection silently clamps/drops them.
  const lumpValidations = useMemo(
    () => validateTrackLumpRows(lumpRows, startDate, payoffDateIso, effectiveBalanceNumeric),
    [lumpRows, startDate, payoffDateIso, effectiveBalanceNumeric],
  );
  const lumpsValid = lumpValidations.every(row => row.isValid);

  const canSave = nickname.trim().length > 0
    && isValidIsoDate(startDate)
    && effectiveBalanceValid
    && rateValidation.isValid
    && durationValidation.isValid
    && !dealEndInvalid
    && lumpsValid;

  useEffect(() => {
    if (category !== 'loan') return;
    setRepaymentType('repayment');
  }, [category]);

  // Live summary. The monthly payment is a single cheap formula. The payoff date
  // is the plain term end unless overpayments are in play — those shorten the
  // real payoff, so only then is the (cheap, single-deal) projection run to get
  // the true date rather than overstating it.
  const summary = useMemo(() => {
    if (!effectiveBalanceValid || !rateValidation.isValid || !durationValidation.isValid) {
      return null;
    }
    const monthly = calculateDealMonthlyPayment(
      effectiveBalanceNumeric,
      rateValidation.numeric,
      durationValidation.totalMonths,
      repaymentType,
    );

    const regular = regularValidation.isValid ? regularValidation.numeric : 0;
    const lumps = lumpRows
      .map(row => ({ date: row.date, amount: validateMoneyText(row.amount).numeric }))
      .filter(row => isValidIsoDate(row.date) && row.amount > 0);

    let payoffDate = addMonthsToIsoDate(startDate, durationValidation.totalMonths);
    if (regular > 0 || lumps.length > 0) {
      const projection = buildMortgageProjection(buildTrackedMortgageFromForm({
        nickname,
        currency,
        category,
        currentBalance: effectiveBalanceNumeric,
        interestRate: rateValidation.numeric,
        repaymentType,
        remainingTermInMonths: durationValidation.totalMonths,
        regularOverpayment: regular,
        lumpOverpayments: lumps,
        startDate,
      }));
      payoffDate = projection.projectedEndDate ?? payoffDate;
    }

    return { monthly, payoffDate };
  }, [effectiveBalanceValid, effectiveBalanceNumeric, rateValidation, durationValidation, repaymentType, regularValidation, lumpRows, nickname, currency, category, startDate]);

  const buildValues = (): TrackMortgageFormValues => ({
    nickname,
    lender: lender.trim() || undefined,
    currency,
    category,
    currentBalance: effectiveBalanceNumeric,
    ...(useBeginning ? { propertyValue: priceValidation.numeric, deposit: depositValidation.numeric } : {}),
    interestRate: rateValidation.numeric,
    repaymentType,
    remainingTermInMonths: durationValidation.totalMonths,
    dealEndDate: isMortgage && isValidIsoDate(dealEndDate) ? dealEndDate : undefined,
    regularOverpayment: regularValidation.isValid ? regularValidation.numeric : 0,
    lumpOverpayments: lumpRows
      .map(row => ({ date: row.date, amount: validateMoneyText(row.amount).numeric }))
      .filter(row => isValidIsoDate(row.date) && row.amount > 0),
    startDate,
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
    { id: createLocalId('op'), date: startDate, amount: '' },
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
          leftIcon={<Icon icon={IconName.SaveIcon} color={canSave ? colours.white : colours.textSecondary} size={18} />}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
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

        {isMortgage ? (
          <View style={styles.fieldGroup}>
            <SegmentedControl
              value={mode}
              onChange={next => {
                setMode(next);
                // A historical purchase can't be in the future: clamp a future
                // start date back to today when entering from-beginning mode.
                if (next === 'beginning' && startDate > today) setStartDate(today);
              }}
              options={[
                { label: t('track.modeToday'), value: 'today' },
                { label: t('track.modeBeginning'), value: 'beginning' },
              ]}
            />
            <FieldHint>{t(useBeginning ? 'track.modeBeginningHint' : 'track.modeTodayHint')}</FieldHint>
          </View>
        ) : null}

        <DatePickerField
          label={useBeginning ? t('track.purchaseDate') : t('track.dealStartDate')}
          value={startDate}
          onChange={value => {
            setStartDate(value);
            if (!seed?.dealEndDate) setDealEndDate(addMonthsToIsoDate(value, 24));
          }}
          hint={t(useBeginning ? 'track.purchaseDateHint' : isMortgage ? 'track.dealStartDateHint' : 'track.dealStartDateHintLoan')}
          maximumDate={useBeginning ? parseDateLabelValue(today) ?? undefined : undefined}
        />

        {useBeginning ? (
          <>
            <View style={styles.fieldGroup}>
              <FieldLabel>{t('track.propertyPrice')}</FieldLabel>
              <InputSurface error={!priceValidation.isValid && !priceValidation.isEmpty}>
                <InputAffix>{currencySymbol}</InputAffix>
                <AppTextInput
                  value={propertyPrice}
                  onChangeText={setPropertyPrice}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </InputSurface>
              <FieldHint>{t('track.propertyPriceHint')}</FieldHint>
              <FieldError message={!priceValidation.isEmpty && priceValidation.errorKey ? t(priceValidation.errorKey) : undefined} />
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel>{t('track.deposit')}</FieldLabel>
              <InputSurface error={depositTooLarge || (!depositValidation.isValid && !depositValidation.isEmpty)}>
                <InputAffix>{currencySymbol}</InputAffix>
                <AppTextInput
                  value={deposit}
                  onChangeText={setDeposit}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </InputSurface>
              <FieldHint>{t('track.depositHint')}</FieldHint>
              <FieldError message={depositTooLarge ? t('forms.downPaymentCash') : undefined} />
            </View>

            {beginningBalanceValid ? (
              <View style={styles.derivedRow}>
                <AppText variant="bodySm" tone="muted">{t('track.borrowedAmount')}</AppText>
                <AppText variant="labelMd" style={styles.derivedValue}>
                  {formatCurrency(derivedBorrowed, currency)}
                </AppText>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.fieldGroup}>
            <FieldLabel>{balanceLabel}</FieldLabel>
            <InputSurface error={!balanceValidation.isValid && !balanceValidation.isEmpty}>
              <InputAffix>{currencySymbol}</InputAffix>
              <AppTextInput
                value={balance}
                onChangeText={setBalance}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </InputSurface>
            <FieldHint>{balanceHint}</FieldHint>
            <FieldError message={!balanceValidation.isEmpty && balanceValidation.errorKey ? t(balanceValidation.errorKey) : undefined} />
          </View>
        )}

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

        {isMortgage ? (
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
        ) : null}

        <View style={styles.fieldGroup}>
          <FieldLabel>{termLabel}</FieldLabel>
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
          <FieldHint>{termHint}</FieldHint>
          <FieldError message={durationErrorKey ? t(durationErrorKey) : undefined} />
        </View>
      </FormSection>

      {isMortgage ? (
        <FormSection title={t('track.sectionDeal')}>
          <AppText variant="bodySm" tone="muted" style={styles.sectionIntro}>
            {t('track.dealHelp')}
          </AppText>
          <DatePickerField
            label={t('track.dealEndDate')}
            value={dealEndDate}
            onChange={setDealEndDate}
            hint={t('track.dealEndDateHint')}
            minimumDate={parseDateLabelValue(startDate) ?? undefined}
          />
          <FieldError message={dealEndInvalid ? t('track.dealEndDateError') : undefined} />
        </FormSection>
      ) : null}

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
              {lumpRows.map(row => {
                const validation = lumpValidations.find(v => v.id === row.id);
                return (
                  <OverpaymentEntryRow
                    key={row.id}
                    row={row}
                    currencySymbol={currencySymbol}
                    minimumDate={parseDateLabelValue(startDate) ?? undefined}
                    maximumDate={payoffDateIso ? parseDateLabelValue(payoffDateIso) ?? undefined : undefined}
                    dateError={validation?.dateErrorKey ? t(validation.dateErrorKey) : undefined}
                    amountError={validation?.amountErrorKey ? t(validation.amountErrorKey) : undefined}
                    onDateChange={(rowId, date) => setLumpRows(prev => prev.map(r => (r.id === rowId ? { ...r, date } : r)))}
                    onAmountChange={(rowId, amount) => setLumpRows(prev => prev.map(r => (r.id === rowId ? { ...r, amount } : r)))}
                    onRemove={rowId => setLumpRows(prev => prev.filter(r => r.id !== rowId))}
                  />
                );
              })}
              <Button
                label={t('track.addLumpOverpayment')}
                onPress={addLumpRow}
                variant="iconPill"
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
          {useBeginning && depositValidation.numeric > 0 ? (
            <View style={styles.summaryRow}>
              <AppText variant="bodySm" tone="muted">{t('track.summaryDeposit')}</AppText>
              <AppText variant="bodyMd" style={styles.summaryValue}>
                {formatCurrency(depositValidation.numeric, currency)}
              </AppText>
            </View>
          ) : null}
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
  derivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: layout.cardPadding,
    borderRadius: radii.card,
    backgroundColor: colours.surfaceMuted,
  },
  derivedValue: { color: colours.textPrimary },
  saveButton: {
    marginBottom: spacing.xs,
    paddingVertical: spacing.md,
  },
  saveButtonDisabled: {
    backgroundColor: colours.surfaceMuted,
    borderColor: colours.surfaceStrong,
  },
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
