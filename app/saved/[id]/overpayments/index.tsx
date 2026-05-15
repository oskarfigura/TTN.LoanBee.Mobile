import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { savedLoansStorage } from '@/storage/savedLoans';
import { getLoanCalculations } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { formatCurrency } from '@/currency/format';
import { buildResultSnapshot } from '@/loans/loanGroupFactory';
import { computeLoanOverpayments, LumpSumEntry } from '@/loans/loanOverpaymentCalc';
import { MortgageEvent } from '@/types/SavedLoan';
import { formatFriendlyDate, formatIsoDate, parseDateLabelValue } from '@/utils/date';
import { createLocalId } from '@/utils/id';
import { colours, layout, radii, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ChevronRightIcon, CoinsStackedIcon, PlusIcon } from '@/components/ui/Icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MonthlyOverpaymentSheet } from '@/components/loans/MonthlyOverpaymentSheet';
import { LumpSumSheet } from '@/components/loans/LumpSumSheet';

const formatDuration = (totalMonths: number, yrs: string, mo: string): string => {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} ${mo}`;
  if (months === 0) return `${years} ${yrs}`;
  return `${years} ${yrs} ${months} ${mo}`;
};

export default function OverpaymentsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const [monthlySheetVisible, setMonthlySheetVisible] = useState(false);
  const [lumpSumSheetVisible, setLumpSumSheetVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MortgageEvent | null>(null);

  const refresh = useCallback(() => {
    setLoan(savedLoansStorage.getById(id));
  }, [id]);

  useFocusEffect(refresh);

  const form = loan?.formSnapshot;
  const currency = loan?.currency ?? 'GBP';
  const monthlyOverpayment = form?.additionalMonthlyPayment ?? 0;

  const lumpSumEvents: MortgageEvent[] = useMemo(
    () => (loan?.events ?? [])
      .filter(e => e.type === 'lumpOverpayment' && !e.dealId)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [loan?.events],
  );

  const lumpSumEntries: LumpSumEntry[] = useMemo(
    () => lumpSumEvents.map(e => ({ date: e.date, amount: e.amount ?? 0 })),
    [lumpSumEvents],
  );

  const impact = useMemo(() => {
    if (!form) return null;
    const hasOverpayments = monthlyOverpayment > 0 || lumpSumEntries.length > 0;
    if (!hasOverpayments) return null;
    return computeLoanOverpayments(form, monthlyOverpayment, lumpSumEntries);
  }, [form, monthlyOverpayment, lumpSumEntries]);

  const { loanMinDate, loanMaxDate } = useMemo(() => {
    if (!form) return { loanMinDate: new Date(), loanMaxDate: new Date() };
    const start = parseDateLabelValue(form.startDate) ?? new Date();
    const baseline = getLoanCalculations(
      form.loanAmount, form.interest, form.termInYears, form.termInMonths,
      form.desiredMonthlyPayment ?? 0,
      form.calculationType.toLowerCase() as LoanCalculationType,
      form.downPayment,
      form.downPaymentType.toLowerCase() as DownPaymentType,
      0, form.startDate,
    );
    const end = new Date(start);
    end.setMonth(end.getMonth() + baseline.tableItems.length - 1);
    // Lump sums require at least one payment period (monthIndex must be >= 1)
    const minDate = new Date(start);
    minDate.setMonth(minDate.getMonth() + 1);
    return { loanMinDate: minDate, loanMaxDate: end };
  }, [form]);

  const handleSaveMonthly = useCallback((amount: number) => {
    if (!loan) return;
    const f = loan.formSnapshot;
    const calcType = f.calculationType.toLowerCase() as LoanCalculationType;
    const dpType = f.downPaymentType.toLowerCase() as DownPaymentType;
    const result = getLoanCalculations(
      f.loanAmount, f.interest, f.termInYears, f.termInMonths,
      f.desiredMonthlyPayment ?? 0, calcType, f.downPayment, dpType,
      amount, f.startDate,
    );
    const baseline = getLoanCalculations(
      f.loanAmount, f.interest, f.termInYears, f.termInMonths,
      f.desiredMonthlyPayment ?? 0, calcType, f.downPayment, dpType,
      0, f.startDate,
    );
    savedLoansStorage.update({
      ...loan,
      formSnapshot: { ...f, additionalMonthlyPayment: amount },
      resultSnapshot: buildResultSnapshot(result, baseline.totalInterestPaid),
    });
    setMonthlySheetVisible(false);
    refresh();
  }, [loan, refresh]);

  const handleRemoveMonthly = useCallback(() => {
    if (!loan) return;
    const f = loan.formSnapshot;
    const calcType = f.calculationType.toLowerCase() as LoanCalculationType;
    const dpType = f.downPaymentType.toLowerCase() as DownPaymentType;
    const result = getLoanCalculations(
      f.loanAmount, f.interest, f.termInYears, f.termInMonths,
      f.desiredMonthlyPayment ?? 0, calcType, f.downPayment, dpType,
      0, f.startDate,
    );
    savedLoansStorage.update({
      ...loan,
      formSnapshot: { ...f, additionalMonthlyPayment: null },
      resultSnapshot: buildResultSnapshot(result, result.totalInterestPaid),
    });
    setMonthlySheetVisible(false);
    refresh();
  }, [loan, refresh]);

  const handleSaveLumpSum = useCallback((date: string, amount: number) => {
    if (!loan) return;
    const now = new Date().toISOString();
    if (editingEvent) {
      savedLoansStorage.updateEvent(loan.id, {
        ...editingEvent,
        date,
        amount,
        updatedAt: now,
      });
    } else {
      const event: MortgageEvent = {
        id: createLocalId('op'),
        createdAt: now,
        updatedAt: now,
        type: 'lumpOverpayment',
        date,
        amount,
      };
      savedLoansStorage.addEvent(loan.id, event);
    }
    setLumpSumSheetVisible(false);
    setEditingEvent(null);
    refresh();
  }, [loan, editingEvent, refresh]);

  const handleDeleteLumpSum = useCallback((eventId: string) => {
    if (!loan) return;
    savedLoansStorage.removeEvent(loan.id, eventId);
    setLumpSumSheetVisible(false);
    setEditingEvent(null);
    refresh();
  }, [loan, refresh]);

  const openAddLumpSum = () => {
    setEditingEvent(null);
    setLumpSumSheetVisible(true);
  };

  const openEditLumpSum = (event: MortgageEvent) => {
    setEditingEvent(event);
    setLumpSumSheetVisible(true);
  };

  const yrs = t('results.years');
  const mo = t('results.months');

  if (!loan || !form) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('overpayments.title')}
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('overpayments.title')}
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Impact Banner */}
        {impact && impact.interestSaved > 0 ? (
          <Card style={styles.impactCard} variant="status">
            <View style={styles.impactInner}>
              <CoinsStackedIcon size={20} color={colours.secondary} strokeWidth={1.8} />
              <View style={styles.impactText}>
                <AppText variant="labelMd" tone="success">
                  {t('overpayments.interestSaved')}: {formatCurrency(impact.interestSaved, currency)}
                </AppText>
                {impact.monthsSaved > 0 ? (
                  <AppText variant="bodySm" tone="muted">
                    {t('overpayments.timeSaved')}: {formatDuration(impact.monthsSaved, yrs, mo)}
                  </AppText>
                ) : null}
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.emptyImpact}>
            <AppText variant="bodySm" tone="muted" style={styles.emptyImpactText}>
              {t('overpayments.noImpact')}
            </AppText>
          </View>
        )}

        {/* Monthly Overpayment */}
        <View style={styles.section}>
          <AppText variant="title3" style={styles.sectionTitle}>
            {t('overpayments.monthlySection')}
          </AppText>
          {monthlyOverpayment > 0 ? (
            <TouchableOpacity
              style={styles.rowCard}
              onPress={() => setMonthlySheetVisible(true)}
              activeOpacity={0.75}
            >
              <View style={styles.rowMain}>
                <AppText variant="labelMd">
                  {formatCurrency(monthlyOverpayment, currency)} / {mo}
                </AppText>
              </View>
              <AppText variant="labelSm" tone="muted">{t('overpayments.monthlyEdit')}</AppText>
            </TouchableOpacity>
          ) : (
            <Button
              label={t('overpayments.monthlyNotSet')}
              onPress={() => setMonthlySheetVisible(true)}
              variant="secondary"
            />
          )}
        </View>

        {/* Lump-Sum Payments */}
        <View style={styles.section}>
          <AppText variant="title3" style={styles.sectionTitle}>
            {t('overpayments.lumpSumSection')}
          </AppText>

          {lumpSumEvents.length === 0 ? (
            <View style={styles.emptyLumpSums}>
              <AppText variant="bodySm" tone="muted" style={styles.emptyImpactText}>
                {t('overpayments.lumpSumEmpty')}
              </AppText>
            </View>
          ) : (
            <Card style={styles.lumpSumList}>
              {lumpSumEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <TouchableOpacity
                    style={styles.lumpSumRow}
                    onPress={() => openEditLumpSum(event)}
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
            label={t('overpayments.lumpSumAdd')}
            onPress={openAddLumpSum}
            variant="secondary"
            style={styles.addLumpSumBtn}
            leftIcon={<PlusIcon size={16} color={colours.primary} />}
          />
        </View>
      </ScrollView>

      <MonthlyOverpaymentSheet
        visible={monthlySheetVisible}
        current={monthlyOverpayment}
        form={form}
        existingLumpSums={lumpSumEntries}
        currency={currency}
        onSave={handleSaveMonthly}
        onRemove={handleRemoveMonthly}
        onClose={() => setMonthlySheetVisible(false)}
      />

      <LumpSumSheet
        visible={lumpSumSheetVisible}
        event={editingEvent}
        form={form}
        monthlyOverpayment={monthlyOverpayment}
        minDate={loanMinDate}
        maxDate={loanMaxDate}
        currency={currency}
        onSave={handleSaveLumpSum}
        onDelete={handleDeleteLumpSum}
        onClose={() => {
          setLumpSumSheetVisible(false);
          setEditingEvent(null);
        }}
      />
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
  impactCard: {
    padding: spacing.md,
  },
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
  emptyImpactText: { textAlign: 'center' },
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
});
