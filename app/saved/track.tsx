import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Button } from '@oskarfigura/ui-native';
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
import { CURRENCIES, CurrencyCode } from '@/shared/domain/currency/currencies';
import { formatCurrency } from '@/shared/domain/currency/format';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCategory, MortgageRepaymentType } from '@/shared/domain/types/SavedLoan';
import {
  buildTrackedMortgageFromForm,
  deriveTrackSeedFromLoan,
  TrackMortgageFormValues,
} from '@/shared/domain/mortgage/trackBuilder';
import { buildMortgageProjection } from '@/shared/domain/mortgage/projection';
import { calculateDealMonthlyPayment } from '@/shared/domain/mortgage/tracker';
import { validateTrackLumpRows } from '@/shared/domain/mortgage/validation';
import { getMinimumAmortisingPayment } from '@/shared/lib/utils/paymentValidation';
import { validateDurationText, validateMoneyText } from '@/shared/lib/utils/formValidation';
import { addMonthsToIsoDate, formatIsoDate, isValidIsoDate, parseDateLabelValue } from '@/shared/lib/utils/date';
import { createLocalId } from '@/shared/lib/utils/id';
import { useSavedLoans } from '@/shared/lib/hooks/useSavedLoans';
import { useStoreReview } from '@/shared/lib/services/review';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { storage } from '@/shared/lib/storage/mmkv';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import { CurrencyPicker } from '@/features/calculator/components/CurrencyPicker';
import { LenderTextInput } from '@/features/tracker/components/editing/LenderTextInput';
import { OverpaymentEntryRow, OverpaymentRow } from '@/features/tracker/components/overpayments/OverpaymentEntryRow';
import { DatePickerField } from '@/shared/ui/components/DatePickerField';
import { KeyboardAwareFormScreen } from '@/shared/ui/components/KeyboardAwareFormScreen';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';

const numberText = (value?: number): string => (
  value === undefined || !Number.isFinite(value) || value <= 0 ? '' : String(value)
);

type PaymentBasis = 'payment' | 'term';

export default function TrackMortgageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, category: categoryParam } = useLocalSearchParams<{ id?: string; category?: string }>();
  const { add, update } = useSavedLoans();
  const { recordUsefulAction, requestReview } = useStoreReview();
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const existing = useMemo(() => (id ? savedLoansStorage.getById(id) : undefined), [id]);
  const seed = useMemo(() => (existing ? deriveTrackSeedFromLoan(existing, today) : undefined), [existing, today]);
  const defaultCurrency = (storage.getString(STORAGE_KEYS.USER_CURRENCY) as CurrencyCode) ?? 'GBP';
  const category: LoanCategory = existing?.category ?? (categoryParam === 'loan' ? 'loan' : 'mortgage');
  const isMortgage = category === 'mortgage';

  const [balance, setBalance] = useState(numberText(seed?.currentBalance));
  const [rate, setRate] = useState(numberText(seed?.interestRate));
  const [repaymentType, setRepaymentType] = useState<MortgageRepaymentType>(seed?.repaymentType ?? 'repayment');
  const [paymentBasis, setPaymentBasis] = useState<PaymentBasis>('payment');
  const [monthlyPayment, setMonthlyPayment] = useState(numberText(seed?.monthlyPayment));
  const initialTermMonths = seed?.remainingTermInMonths ?? 0;
  const [termYears, setTermYears] = useState(initialTermMonths ? String(Math.floor(initialTermMonths / 12)) : '');
  const [termMonths, setTermMonths] = useState(initialTermMonths ? String(initialTermMonths % 12) : '');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [nickname, setNickname] = useState(seed?.nickname ?? '');
  const [lender, setLender] = useState(seed?.lender ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(seed?.currency ?? defaultCurrency);
  const [hasDealEnd, setHasDealEnd] = useState(Boolean(seed?.dealEndDate));
  const [dealEndDate, setDealEndDate] = useState(seed?.dealEndDate ?? addMonthsToIsoDate(today, 24));

  const [overpaymentsOpen, setOverpaymentsOpen] = useState(false);
  const [regularOverpayment, setRegularOverpayment] = useState(numberText(seed?.regularOverpayment));
  const [lumpRows, setLumpRows] = useState<OverpaymentRow[]>(() => (
    (seed?.lumpOverpayments ?? []).map(item => ({
      id: createLocalId('op'),
      date: item.date,
      amount: String(item.amount),
    }))
  ));

  const currencySymbol = CURRENCIES.find(item => item.code === currency)?.symbol ?? '£';
  const balanceValidation = validateMoneyText(balance);
  const rateValidation = validateMoneyText(rate, { max: 100, maxErrorKey: 'forms.interestMax' });
  const paymentValidation = validateMoneyText(monthlyPayment);
  const durationValidation = validateDurationText(termYears, termMonths);
  const regularValidation = validateMoneyText(regularOverpayment, { required: false, allowZero: true });

  const minimumPayment = balanceValidation.isValid && rateValidation.isValid
    ? getMinimumAmortisingPayment(balanceValidation.numeric, rateValidation.numeric, 0, DownPaymentType.CASH)
    : 0;
  const paymentTooLow = paymentBasis === 'payment'
    && paymentValidation.isValid
    && paymentValidation.numeric < minimumPayment;

  const calculatedTermMonths = useMemo(() => {
    if (
      paymentBasis !== 'payment'
      || !balanceValidation.isValid
      || !rateValidation.isValid
      || !paymentValidation.isValid
      || paymentTooLow
    ) {
      return 0;
    }

    const result = getLoanCalculations(
      balanceValidation.numeric,
      rateValidation.numeric,
      0,
      0,
      paymentValidation.numeric,
      LoanCalculationType.PAYMENT,
      0,
      DownPaymentType.CASH,
      0,
      today,
    );
    return result.tableItems.length;
  }, [balanceValidation, paymentBasis, paymentTooLow, paymentValidation, rateValidation, today]);

  const remainingTermInMonths = paymentBasis === 'payment'
    ? calculatedTermMonths
    : durationValidation.totalMonths;
  const effectiveMonthlyPayment = paymentBasis === 'payment'
    ? paymentValidation.numeric
    : (
      balanceValidation.isValid && rateValidation.isValid && durationValidation.isValid
        ? calculateDealMonthlyPayment(
          balanceValidation.numeric,
          rateValidation.numeric,
          durationValidation.totalMonths,
          repaymentType,
        )
        : 0
    );
  const payoffDateIso = remainingTermInMonths > 0
    ? addMonthsToIsoDate(today, remainingTermInMonths)
    : undefined;
  const dealEndInvalid = isMortgage && hasDealEnd && (
    !isValidIsoDate(dealEndDate)
    || dealEndDate <= today
    || (payoffDateIso !== undefined && dealEndDate > payoffDateIso)
  );
  const lumpValidations = useMemo(
    () => validateTrackLumpRows(lumpRows, today, payoffDateIso, balanceValidation.numeric),
    [balanceValidation.numeric, lumpRows, payoffDateIso, today],
  );
  const lumpsValid = lumpValidations.every(item => item.isValid);
  const paymentBasisValid = paymentBasis === 'payment'
    ? paymentValidation.isValid && !paymentTooLow && calculatedTermMonths > 0
    : durationValidation.isValid;
  const canSave = balanceValidation.isValid
    && rateValidation.isValid
    && paymentBasisValid
    && !dealEndInvalid
    && regularValidation.isValid
    && lumpsValid;

  useEffect(() => {
    if (!isMortgage) setRepaymentType('repayment');
  }, [isMortgage]);

  useEffect(() => {
    if (repaymentType === 'interestOnly') setPaymentBasis('term');
  }, [repaymentType]);

  const summary = useMemo(() => {
    if (!canSave || remainingTermInMonths <= 0 || effectiveMonthlyPayment <= 0) return null;
    const regular = regularValidation.numeric;
    const lumps = lumpRows
      .map(item => ({ date: item.date, amount: validateMoneyText(item.amount).numeric }))
      .filter(item => isValidIsoDate(item.date) && item.amount > 0);
    let payoffDate = payoffDateIso ?? addMonthsToIsoDate(today, remainingTermInMonths);

    if (regular > 0 || lumps.length > 0) {
      const preview = buildTrackedMortgageFromForm({
        nickname: nickname.trim() || (isMortgage ? t('track.defaultMortgageName') : t('track.defaultLoanName')),
        currency,
        category,
        currentBalance: balanceValidation.numeric,
        interestRate: rateValidation.numeric,
        repaymentType,
        remainingTermInMonths,
        monthlyPayment: effectiveMonthlyPayment,
        regularOverpayment: regular,
        lumpOverpayments: lumps,
        startDate: today,
      });
      payoffDate = buildMortgageProjection(preview).projectedEndDate ?? payoffDate;
    }

    return { monthlyPayment: effectiveMonthlyPayment, payoffDate };
  }, [
    balanceValidation.numeric,
    canSave,
    category,
    currency,
    effectiveMonthlyPayment,
    isMortgage,
    lumpRows,
    nickname,
    payoffDateIso,
    rateValidation.numeric,
    regularValidation.numeric,
    remainingTermInMonths,
    repaymentType,
    t,
    today,
  ]);

  const handleSave = () => {
    if (!canSave || remainingTermInMonths <= 0) return;
    const values: TrackMortgageFormValues = {
      nickname: nickname.trim() || (isMortgage ? t('track.defaultMortgageName') : t('track.defaultLoanName')),
      lender: lender.trim() || undefined,
      currency,
      category,
      currentBalance: balanceValidation.numeric,
      interestRate: rateValidation.numeric,
      repaymentType,
      remainingTermInMonths,
      monthlyPayment: effectiveMonthlyPayment,
      dealEndDate: isMortgage && hasDealEnd ? dealEndDate : undefined,
      regularOverpayment: regularValidation.numeric,
      lumpOverpayments: lumpRows
        .map(item => ({ date: item.date, amount: validateMoneyText(item.amount).numeric }))
        .filter(item => isValidIsoDate(item.date) && item.amount > 0),
      startDate: today,
    };
    const built = buildTrackedMortgageFromForm(
      values,
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
    if (existing && existing.status === 'draft' && existing.formSnapshot.loanAmount === 0 && existing.deals.length === 0) {
      savedLoansStorage.remove(existing.id);
    }
    if (router.canGoBack()) router.back();
    else router.replace('/saved');
  };

  const addLumpRow = () => setLumpRows(current => [
    ...current,
    { id: createLocalId('op'), date: today, amount: '' },
  ]);

  const durationErrorKey = (!durationValidation.months.isEmpty && durationValidation.months.errorKey)
    || (!durationValidation.years.isEmpty && durationValidation.years.errorKey)
    || (durationValidation.errorKey
      && (!durationValidation.years.isEmpty || !durationValidation.months.isEmpty)
      ? durationValidation.errorKey
      : undefined)
    || undefined;

  return (
    <KeyboardAwareFormScreen
      title={isMortgage ? t('track.titleMortgage') : t('track.titleLoan')}
      subtitle={t('track.currentStateSubtitle')}
      onClose={handleClose}
      closeAccessibilityLabel={t('common.close')}
      footer={(
        <Button
          label={t('track.save')}
          onPress={handleSave}
          disabled={!canSave}
          leftIcon={<Icon icon={IconName.ArrowTrendingDownIcon} color={colours.white} size={18} />}
          style={styles.saveButton}
        />
      )}
    >
      <FormSection title={t('track.currentStateTitle')} accent>
        <AppText variant="bodySm" tone="muted" style={styles.sectionIntro}>
          {t('track.currentStateHelp')}
        </AppText>

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
            <AppTextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="4.5" />
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
          <FieldLabel>{t('track.whatDoYouKnow')}</FieldLabel>
          <SegmentedControl
            value={paymentBasis}
            onChange={setPaymentBasis}
            options={[
              { label: t('track.actualPayment'), value: 'payment' },
              { label: t('track.remainingTerm'), value: 'term' },
            ]}
          />
          <FieldHint>{t('track.whatDoYouKnowHelp')}</FieldHint>
        </View>

        {paymentBasis === 'payment' ? (
          <View style={styles.fieldGroup}>
            <FieldLabel>{t('track.actualMonthlyPayment')}</FieldLabel>
            <InputSurface error={(!paymentValidation.isValid && !paymentValidation.isEmpty) || paymentTooLow}>
              <InputAffix>{currencySymbol}</InputAffix>
              <AppTextInput
                value={monthlyPayment}
                onChangeText={setMonthlyPayment}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </InputSurface>
            <FieldHint>{t('track.actualMonthlyPaymentHint')}</FieldHint>
            <FieldError
              message={paymentTooLow
                ? t('track.paymentTooLow', { amount: formatCurrency(minimumPayment, currency) })
                : (!paymentValidation.isEmpty && paymentValidation.errorKey ? t(paymentValidation.errorKey) : undefined)}
            />
          </View>
        ) : (
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
            <FieldError message={durationErrorKey ? t(durationErrorKey) : undefined} />
          </View>
        )}
      </FormSection>

      <TouchableOpacity
        style={styles.disclosure}
        onPress={() => setDetailsOpen(open => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: detailsOpen }}
        activeOpacity={0.82}
      >
        <View style={styles.disclosureCopy}>
          <AppText variant="labelMd">{t('track.optionalDetails')}</AppText>
          <AppText variant="bodySm" tone="muted">{t('track.optionalDetailsHelp')}</AppText>
        </View>
        <AppText variant="title3" tone="accent">{detailsOpen ? '−' : '+'}</AppText>
      </TouchableOpacity>

      {detailsOpen ? (
        <FormSection>
          <View style={styles.fieldGroup}>
            <FieldLabel>{t('track.nickname')}</FieldLabel>
            <InputSurface>
              <AppTextInput
                placeholder={isMortgage ? t('track.defaultMortgageName') : t('track.defaultLoanName')}
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
            <>
              <TouchableOpacity
                style={[styles.inlineToggle, hasDealEnd && styles.inlineToggleActive]}
                onPress={() => setHasDealEnd(value => !value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hasDealEnd }}
                activeOpacity={0.82}
              >
                <View style={[styles.checkbox, hasDealEnd && styles.checkboxActive]}>
                  {hasDealEnd ? <Icon icon={IconName.CheckIcon} size={14} color={colours.white} /> : null}
                </View>
                <View style={styles.disclosureCopy}>
                  <AppText variant="labelMd">{t('track.hasDealEnd')}</AppText>
                  <AppText variant="bodySm" tone="muted">{t('track.hasDealEndHelp')}</AppText>
                </View>
              </TouchableOpacity>
              {hasDealEnd ? (
                <>
                  <DatePickerField
                    label={t('track.dealEndDate')}
                    value={dealEndDate}
                    onChange={setDealEndDate}
                    hint={t('track.dealEndDateHint')}
                    minimumDate={parseDateLabelValue(today) ?? undefined}
                  />
                  <FieldError message={dealEndInvalid ? t('track.dealEndDateError') : undefined} />
                </>
              ) : null}
            </>
          ) : null}
        </FormSection>
      ) : null}

      <TouchableOpacity
        style={styles.disclosure}
        onPress={() => setOverpaymentsOpen(open => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: overpaymentsOpen }}
        activeOpacity={0.82}
      >
        <View style={styles.disclosureCopy}>
          <AppText variant="labelMd">{t('track.sectionOverpayments')}</AppText>
          <AppText variant="bodySm" tone="muted">{t('track.overpaymentsHelp')}</AppText>
        </View>
        <AppText variant="title3" tone="accent">{overpaymentsOpen ? '−' : '+'}</AppText>
      </TouchableOpacity>

      {overpaymentsOpen ? (
        <FormSection>
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
              const validation = lumpValidations.find(item => item.id === row.id);
              return (
                <OverpaymentEntryRow
                  key={row.id}
                  row={row}
                  currencySymbol={currencySymbol}
                  minimumDate={parseDateLabelValue(today) ?? undefined}
                  maximumDate={payoffDateIso ? parseDateLabelValue(payoffDateIso) ?? undefined : undefined}
                  dateError={validation?.dateErrorKey ? t(validation.dateErrorKey) : undefined}
                  amountError={validation?.amountErrorKey ? t(validation.amountErrorKey) : undefined}
                  onDateChange={(rowId, date) => setLumpRows(current => current.map(item => (
                    item.id === rowId ? { ...item, date } : item
                  )))}
                  onAmountChange={(rowId, amount) => setLumpRows(current => current.map(item => (
                    item.id === rowId ? { ...item, amount } : item
                  )))}
                  onRemove={rowId => setLumpRows(current => current.filter(item => item.id !== rowId))}
                />
              );
            })}
            <Button label={t('track.addLumpOverpayment')} onPress={addLumpRow} variant="iconPill" />
          </View>
        </FormSection>
      ) : null}

      {summary ? (
        <View style={styles.summaryCard}>
          <AppText variant="labelSm" tone="accent" style={styles.summaryHeading}>
            {t('track.summaryTitle')}
          </AppText>
          <View style={styles.summaryRow}>
            <AppText variant="bodySm" tone="muted">{t('track.summaryMonthly')}</AppText>
            <AppText variant="bodyMd" style={styles.summaryValue}>
              {formatCurrency(summary.monthlyPayment, currency)}
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
  saveButton: {
    marginBottom: spacing.xs,
    paddingVertical: spacing.md,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: layout.cardPadding,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    backgroundColor: colours.surfaceMuted,
  },
  disclosureCopy: { flex: 1, gap: spacing.xxxs },
  inlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceRaised,
  },
  inlineToggleActive: {
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceAccent,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colours.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colours.primary,
    backgroundColor: colours.primary,
  },
  summaryCard: {
    padding: layout.cardPadding,
    gap: spacing.xs,
    borderRadius: radii.card,
    backgroundColor: colours.surfaceAccent,
  },
  summaryHeading: { textTransform: 'uppercase' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryValue: { color: colours.textPrimary },
});
