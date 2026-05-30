import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import {
  AppTextInput,
  FieldError,
  FieldHint,
  FieldLabel,
  InputAffix,
  InputSurface,
  SegmentedControl,
} from '@/components/ui/FormPrimitives';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { OverpaymentEntryRow, OverpaymentRow } from '@/components/mortgage/OverpaymentEntryRow';
import { CURRENCIES, CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { buildMortgageProjection } from '@/mortgage/projection';
import { getChronologicalDeals } from '@/mortgage/tracker';
import { readStepInitial } from '@/mortgage/journey/stepValues';
import { JourneyAnswer, JourneyStep } from '@/mortgage/journey/types';
import { LoanGroup } from '@/types/SavedLoan';
import { colours, layout, radii, spacing } from '@/theme';
import { isValidIsoDate, parseDateLabelValue } from '@/utils/date';
import { createLocalId } from '@/utils/id';
import { validateDurationText, validateMoneyText } from '@/utils/formValidation';

interface Props {
  step: JourneyStep;
  loan: LoanGroup;
  stepIndex: number;
  stepTotal: number;
  onBack?: () => void;
  onContinue: (answer: JourneyAnswer) => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onExit: () => void;
  onJumpToReview?: () => void;
}

const numberText = (value?: number): string =>
  value === undefined || !Number.isFinite(value) ? '' : String(value);

export const JourneyStepDrawer = ({
  step,
  loan,
  stepIndex,
  stepTotal,
  onBack,
  onContinue,
  onPublish,
  onSaveDraft,
  onExit,
  onJumpToReview,
}: Props) => {
  const { t } = useTranslation();
  const currencySymbol = CURRENCIES.find(c => c.code === loan.currency)?.symbol ?? '£';
  const dealNumber = (step.dealIndex ?? 0) + 1;

  const [text, setText] = useState('');
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [date, setDate] = useState('');
  const [choice, setChoice] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(loan.currency);
  const [rows, setRows] = useState<OverpaymentRow[]>([]);
  const [missedRows, setMissedRows] = useState<OverpaymentRow[]>([]);

  // Re-seed local input state whenever the step changes (forward, back, resume).
  useEffect(() => {
    const initial = readStepInitial(loan, step);
    setText(initial.text ?? numberText(initial.number));
    const split = initial.months !== undefined
      ? { years: Math.floor(initial.months / 12), months: initial.months % 12 }
      : { years: 0, months: 0 };
    setYears(initial.months !== undefined ? String(split.years) : '');
    setMonths(initial.months !== undefined ? String(split.months) : '');
    setDate(initial.date ?? '');
    setChoice(initial.choice ?? initial.gate ?? '');
    setCurrency(initial.currency ?? loan.currency);
    setRows((initial.overpayments ?? []).map(row => ({
      id: createLocalId('op'),
      date: row.date,
      amount: String(row.amount),
    })));
    setMissedRows((initial.missed ?? []).map(d => ({ id: createLocalId('mp'), date: d, amount: '' })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  // Only the original borrowed amount must be strictly positive; a deal can end
  // at a zero balance (paid off) and overpayments/fees can be zero.
  const allowZeroMoney = step.kind !== 'loan.openingBalance';
  const moneyValidation = validateMoneyText(text, { required: !step.optional, allowZero: allowZeroMoney });
  const percentValidation = validateMoneyText(text);
  const durationValidation = validateDurationText(years, months);

  const isValid = useMemo(() => {
    switch (step.inputType) {
      case 'intro':
      case 'review':
      case 'currency':
        return true;
      case 'text':
        return step.optional ? true : text.trim().length > 0;
      case 'money':
        return step.optional ? (text.trim() === '' || moneyValidation.isValid) : moneyValidation.isValid;
      case 'percent':
        return percentValidation.isValid;
      case 'duration':
        return durationValidation.isValid;
      case 'date':
        return isValidIsoDate(date);
      case 'choice':
        return choice.length > 0;
      case 'gate':
        return choice === 'ongoing' || choice === 'ended';
      case 'overpaymentList':
      case 'missedList':
        return true;
      default:
        return true;
    }
  }, [step.inputType, step.optional, text, moneyValidation.isValid, percentValidation.isValid, durationValidation.isValid, date, choice]);

  const buildAnswer = (): JourneyAnswer => {
    switch (step.inputType) {
      case 'currency':
        return { type: 'currency', currency };
      case 'text':
        return { type: 'text', text };
      case 'money':
        return { type: 'number', value: text.trim() === '' ? 0 : moneyValidation.numeric };
      case 'percent':
        return { type: 'number', value: percentValidation.numeric };
      case 'duration':
        return { type: 'duration', months: durationValidation.totalMonths };
      case 'date':
        return { type: 'date', date };
      case 'choice':
        return { type: 'choice', value: choice };
      case 'gate':
        return { type: 'gate', value: choice === 'ended' ? 'ended' : 'ongoing' };
      case 'overpaymentList':
        return {
          type: 'overpayments',
          rows: rows
            .map(row => ({ date: row.date, amount: validateMoneyText(row.amount).numeric }))
            .filter(row => isValidIsoDate(row.date) && row.amount > 0),
        };
      case 'missedList':
        return { type: 'missed', dates: missedRows.map(row => row.date).filter(isValidIsoDate) };
      default:
        return { type: 'none' };
    }
  };

  const title = step.kind === 'intro'
    ? t('journey.introTitle')
    : step.kind === 'review'
      ? t('journey.review.title')
      : t(`journey.q.${step.kind}.title`, { number: dealNumber });
  const helper = step.kind === 'intro'
    ? t('journey.introBody')
    : step.kind === 'review'
      ? t('journey.review.helper')
      : t(`journey.q.${step.kind}.helper`, { number: dealNumber });

  const sectionLabel = step.group === 'loan'
    ? t('journey.sectionLoan')
    : step.group === 'deal'
      ? t('journey.sectionDeal', { number: dealNumber })
      : step.group === 'review'
        ? t('journey.sectionReview')
        : t('journey.sectionIntro');

  const addRow = () => setRows(prev => [...prev, { id: createLocalId('op'), date: loan.formSnapshot.startDate, amount: '' }]);
  const addMissed = () => setMissedRows(prev => [...prev, { id: createLocalId('mp'), date: loan.formSnapshot.startDate, amount: '' }]);

  const renderBody = () => {
    switch (step.inputType) {
      case 'intro':
        return null;
      case 'currency':
        return <CurrencyPicker value={currency} onChange={setCurrency} />;
      case 'text':
        return (
          <InputSurface>
            <AppTextInput
              value={text}
              onChangeText={setText}
              placeholder={t(`journey.q.${step.kind}.placeholder`, { defaultValue: '' })}
              autoFocus
            />
          </InputSurface>
        );
      case 'money':
        return (
          <>
            <InputSurface error={!moneyValidation.isValid && !moneyValidation.isEmpty}>
              <InputAffix>{currencySymbol}</InputAffix>
              <AppTextInput value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="0" autoFocus />
            </InputSurface>
            <FieldError message={!moneyValidation.isEmpty && moneyValidation.errorKey ? t(moneyValidation.errorKey) : undefined} />
          </>
        );
      case 'percent':
        return (
          <>
            <InputSurface error={!percentValidation.isValid && !percentValidation.isEmpty}>
              <AppTextInput value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="2.5" autoFocus />
              <InputAffix trailing>%</InputAffix>
            </InputSurface>
            <FieldError message={!percentValidation.isEmpty && percentValidation.errorKey ? t(percentValidation.errorKey) : undefined} />
          </>
        );
      case 'duration':
        return (
          <View style={styles.row}>
            <View style={styles.half}>
              <InputSurface>
                <AppTextInput value={years} onChangeText={setYears} keyboardType="number-pad" placeholder="5" />
                <InputAffix trailing>{t('mortgage.totalMortgageTermYears')}</InputAffix>
              </InputSurface>
            </View>
            <View style={styles.half}>
              <InputSurface>
                <AppTextInput value={months} onChangeText={setMonths} keyboardType="number-pad" placeholder="0" />
                <InputAffix trailing>{t('mortgage.totalMortgageTermMonths')}</InputAffix>
              </InputSurface>
            </View>
          </View>
        );
      case 'date':
        return (
          <DatePickerField
            label={t(`journey.q.${step.kind}.fieldLabel`, { defaultValue: title })}
            value={date || loan.formSnapshot.startDate}
            onChange={setDate}
            hint={t('mortgage.dateFormatHint')}
          />
        );
      case 'choice':
        return (
          <SegmentedControl
            value={choice}
            onChange={setChoice}
            options={[
              { label: t('mortgage.repayment'), value: 'repayment' },
              { label: t('mortgage.interestOnly'), value: 'interestOnly' },
            ]}
          />
        );
      case 'gate':
        return (
          <SegmentedControl
            value={choice}
            onChange={setChoice}
            options={[
              { label: t('journey.q.deal.outcome.ongoing'), value: 'ongoing' },
              { label: t('journey.q.deal.outcome.ended'), value: 'ended' },
            ]}
          />
        );
      case 'overpaymentList':
        return (
          <View style={styles.listGroup}>
            {rows.map(row => (
              <OverpaymentEntryRow
                key={row.id}
                row={row}
                currencySymbol={currencySymbol}
                onDateChange={(id, d) => setRows(prev => prev.map(r => (r.id === id ? { ...r, date: d } : r)))}
                onAmountChange={(id, amount) => setRows(prev => prev.map(r => (r.id === id ? { ...r, amount } : r)))}
                onRemove={id => setRows(prev => prev.filter(r => r.id !== id))}
              />
            ))}
            <Button label={t('journey.q.deal.lumpOverpayments.add')} onPress={addRow} variant="icon-pill" style={styles.addBtn} />
          </View>
        );
      case 'missedList':
        return (
          <View style={styles.listGroup}>
            {missedRows.map((row, index) => (
              <View key={row.id} style={styles.missedRow}>
                <View style={styles.missedDate}>
                  <DatePickerField
                    label={t('journey.q.deal.missedPayments.rowLabel', { number: index + 1 })}
                    value={row.date}
                    onChange={d => setMissedRows(prev => prev.map(r => (r.id === row.id ? { ...r, date: d } : r)))}
                    hint=""
                  />
                </View>
                <TouchableOpacity
                  style={styles.missedRemove}
                  onPress={() => setMissedRows(prev => prev.filter(r => r.id !== row.id))}
                  activeOpacity={0.84}
                >
                  <AppText style={styles.removeGlyph}>×</AppText>
                </TouchableOpacity>
              </View>
            ))}
            <Button label={t('journey.q.deal.missedPayments.add')} onPress={addMissed} variant="icon-pill" style={styles.addBtn} />
          </View>
        );
      case 'review':
        return <JourneyReview loan={loan} />;
      default:
        return null;
    }
  };

  const isReview = step.inputType === 'review';
  const isIntro = step.inputType === 'intro';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="labelSm" tone="accent" style={styles.eyebrow}>{sectionLabel}</AppText>
          <View style={styles.heroActions}>
            {onJumpToReview ? (
              <TouchableOpacity onPress={onJumpToReview} hitSlop={8} activeOpacity={0.7}>
                <AppText variant="labelMd" tone="accent">{t('journey.sectionReview')}</AppText>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onExit} hitSlop={8} activeOpacity={0.7}>
              <AppText variant="labelMd" tone="muted">{t('journey.saveExit')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
        <AppText variant="bodySm" tone="muted">
          {t('journey.progressLabel', { current: stepIndex + 1, total: stepTotal })}
        </AppText>
        <ProgressBar progress={(stepIndex + 1) / Math.max(stepTotal, 1)} />
      </View>

      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="title2" style={styles.title}>{title}</AppText>
            <AppText variant="bodyMd" tone="muted" style={styles.helper}>{helper}</AppText>
            <View style={styles.body}>{renderBody()}</View>
          </ScrollView>

          <View style={styles.footer}>
            {isReview ? (
              <>
                <Button label={t('journey.publish')} onPress={onPublish} />
                <Button label={t('journey.saveDraft')} onPress={onSaveDraft} variant="secondary" style={styles.footerSecondary} />
                {onBack ? (
                  <Button label={t('journey.back')} onPress={onBack} variant="ghost" style={styles.footerGhost} />
                ) : null}
              </>
            ) : (
              <>
                <Button
                  label={isIntro ? t('journey.introCta') : step.optional && isValid ? t('journey.continueOrSkip') : t('journey.continue')}
                  onPress={() => onContinue(buildAnswer())}
                  disabled={!isValid}
                />
                {onBack ? (
                  <Button label={t('journey.back')} onPress={onBack} variant="ghost" style={styles.footerGhost} />
                ) : null}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const JourneyReview = ({ loan }: { loan: LoanGroup }) => {
  const { t } = useTranslation();
  const projection = useMemo(() => buildMortgageProjection(loan), [loan]);
  const deals = getChronologicalDeals(loan);

  const stat = (labelKey: string, value: string) => (
    <View style={styles.statRow}>
      <AppText variant="bodySm" tone="muted">{t(labelKey)}</AppText>
      <AppText variant="bodyMd" style={styles.statValue}>{value}</AppText>
    </View>
  );

  return (
    <View style={styles.reviewCard}>
      {stat('journey.review.totalCost', formatCurrency(projection.totalAmountPaid, loan.currency))}
      {stat('journey.review.totalInterest', formatCurrency(projection.totalInterestPaid, loan.currency))}
      {stat('journey.review.currentBalance', formatCurrency(projection.currentBalance, loan.currency))}
      {projection.overpaymentSavingsEstimate > 0
        ? stat('journey.review.savings', formatCurrency(projection.overpaymentSavingsEstimate, loan.currency))
        : null}
      <View style={styles.reviewDeals}>
        <AppText variant="labelSm" tone="muted" style={styles.reviewDealsTitle}>
          {t('journey.review.deals', { count: deals.length })}
        </AppText>
        {deals.map(deal => (
          <AppText key={deal.id} variant="bodySm" style={styles.reviewDeal}>
            {`${deal.name} · ${deal.interestRate}%`}
          </AppText>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },
  hero: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: { textTransform: 'uppercase' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colours.surfaceRaised,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderTopWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colours.borderSoft,
    marginBottom: spacing.md,
  },
  sheetContent: { paddingBottom: spacing.md },
  title: { color: colours.primaryInk, marginBottom: spacing.xs },
  helper: { marginBottom: spacing.lg },
  body: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  listGroup: { gap: spacing.xs },
  addBtn: { marginTop: spacing.xs },
  missedRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  missedDate: { flex: 1 },
  missedRemove: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeGlyph: { color: colours.error, fontSize: 22 },
  footer: { gap: spacing.xs, paddingTop: spacing.sm },
  footerSecondary: {},
  footerGhost: {},
  reviewCard: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.card,
    backgroundColor: colours.surface,
    padding: layout.cardPadding,
    gap: spacing.sm,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statValue: { color: colours.textPrimary },
  reviewDeals: { marginTop: spacing.xs, gap: spacing.xxs },
  reviewDealsTitle: { textTransform: 'uppercase' },
  reviewDeal: { color: colours.textSecondary },
});
