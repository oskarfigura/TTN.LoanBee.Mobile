import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLoanCalculations } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { formatCurrency } from '@/currency/format';
import { buildResultSnapshot } from '@/loans/loanGroupFactory';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, layout, radii, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppTextInput, FieldLabel, InputSurface } from '@/components/ui/FormPrimitives';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { formatIsoDate, monthsBetween, parseDateLabelValue } from '@/utils/date';

const formatDuration = (totalMonths: number, yrsLabel: string, moLabel: string): string => {
  const years = Math.floor(Math.abs(totalMonths) / 12);
  const months = Math.abs(totalMonths) % 12;
  if (years === 0) return `${months} ${moLabel}`;
  if (months === 0) return `${years} ${yrsLabel}`;
  return `${years} ${yrsLabel} ${months} ${moLabel}`;
};

const oneYearFromNow = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return formatIsoDate(d);
};

type ScenarioTotals = {
  totalInterestPaid: number;
  totalTermInMonths: number;
  monthlyPayments: number;
};

const computeScenario = (
  loanAmount: number,
  interest: number,
  termInYears: number,
  termInMonths: number,
  desiredMonthlyPayment: number,
  calcType: LoanCalculationType,
  downPayment: number,
  dpType: DownPaymentType,
  startDate: string,
  monthlyOverpayment: number,
  lumpSum: number,
  lumpSumDate: string,
): ScenarioTotals => {
  const withOverpayment = getLoanCalculations(
    loanAmount, interest, termInYears, termInMonths,
    desiredMonthlyPayment, calcType, downPayment, dpType,
    monthlyOverpayment, startDate,
  );

  if (lumpSum <= 0) {
    return {
      totalInterestPaid: withOverpayment.totalInterestPaid,
      totalTermInMonths: withOverpayment.tableItems.length,
      monthlyPayments: withOverpayment.monthlyPayments,
    };
  }

  const lumpSumMonthIndex = monthsBetween(startDate, parseDateLabelValue(lumpSumDate) ?? new Date());
  if (lumpSumMonthIndex <= 0 || lumpSumMonthIndex >= withOverpayment.tableItems.length) {
    return {
      totalInterestPaid: withOverpayment.totalInterestPaid,
      totalTermInMonths: withOverpayment.tableItems.length,
      monthlyPayments: withOverpayment.monthlyPayments,
    };
  }

  const phase1Interest = withOverpayment.tableItems
    .slice(0, lumpSumMonthIndex)
    .reduce((sum, row) => sum + parseFloat(row.interest), 0);

  const balanceAtLumpSum = parseFloat(withOverpayment.tableItems[lumpSumMonthIndex - 1].ending);
  const newBalance = Math.max(0, balanceAtLumpSum - lumpSum);

  if (newBalance <= 0) {
    return {
      totalInterestPaid: phase1Interest,
      totalTermInMonths: lumpSumMonthIndex,
      monthlyPayments: withOverpayment.monthlyPayments,
    };
  }

  const phase2 = getLoanCalculations(
    newBalance, interest, 0, 0,
    withOverpayment.monthlyPayments, 'payment', 0, 'percent',
    0, lumpSumDate,
  );

  return {
    totalInterestPaid: phase1Interest + phase2.totalInterestPaid,
    totalTermInMonths: lumpSumMonthIndex + phase2.tableItems.length,
    monthlyPayments: withOverpayment.monthlyPayments,
  };
};

export default function RecalculateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const savedOverpayment = loan?.formSnapshot.additionalMonthlyPayment ?? 0;
  const savedLumpSum = loan?.formSnapshot.lumpSumAmount ?? 0;
  const savedLumpSumDate = loan?.formSnapshot.lumpSumDate ?? null;
  const [overpayment, setOverpayment] = useState(
    savedOverpayment > 0 ? String(savedOverpayment) : '',
  );
  const [lumpSum, setLumpSum] = useState(
    savedLumpSum > 0 ? String(savedLumpSum) : '',
  );
  const [lumpSumDate, setLumpSumDate] = useState(
    savedLumpSumDate ?? oneYearFromNow(),
  );

  const overpaymentAmount = parseFloat(overpayment) || 0;
  const lumpSumAmount = parseFloat(lumpSum) || 0;
  const showLumpSumDate = lumpSumAmount > 0;

  const { baselineTotals, scenarioTotals } = useMemo(() => {
    if (!loan) return { baselineTotals: null, scenarioTotals: null };
    const form = loan.formSnapshot;
    const calcType = form.calculationType.toLowerCase() as LoanCalculationType;
    const dpType = form.downPaymentType.toLowerCase() as DownPaymentType;

    const baseline = getLoanCalculations(
      form.loanAmount, form.interest, form.termInYears, form.termInMonths,
      form.desiredMonthlyPayment ?? 0, calcType, form.downPayment, dpType,
      0, form.startDate,
    );

    const scenario = computeScenario(
      form.loanAmount, form.interest, form.termInYears, form.termInMonths,
      form.desiredMonthlyPayment ?? 0, calcType, form.downPayment, dpType,
      form.startDate, overpaymentAmount, lumpSumAmount, lumpSumDate,
    );

    return {
      baselineTotals: {
        totalInterestPaid: baseline.totalInterestPaid,
        totalTermInMonths: baseline.tableItems.length,
        monthlyPayments: baseline.monthlyPayments,
      } as ScenarioTotals,
      scenarioTotals: scenario,
    };
  }, [loan, overpaymentAmount, lumpSumAmount, lumpSumDate]);

  if (!loan || !baselineTotals || !scenarioTotals) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('recalculate.title')}
          variant="editor"
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <AppText variant="title3">{t('saved.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} style={styles.notFoundBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const interestSaved = baselineTotals.totalInterestPaid - scenarioTotals.totalInterestPaid;
  const monthsSaved = baselineTotals.totalTermInMonths - scenarioTotals.totalTermInMonths;
  const hasImpact = overpaymentAmount > 0 || lumpSumAmount > 0;
  const isUnchanged = (
    overpaymentAmount === savedOverpayment
    && lumpSumAmount === savedLumpSum
    && (lumpSumAmount === 0 || lumpSumDate === (savedLumpSumDate ?? lumpSumDate))
  );

  const handleSave = () => {
    const form = loan.formSnapshot;
    const calcType = form.calculationType.toLowerCase() as LoanCalculationType;
    const dpType = form.downPaymentType.toLowerCase() as DownPaymentType;
    const scenarioForSave = getLoanCalculations(
      form.loanAmount, form.interest, form.termInYears, form.termInMonths,
      form.desiredMonthlyPayment ?? 0, calcType, form.downPayment, dpType,
      overpaymentAmount, form.startDate,
    );
    savedLoansStorage.update({
      ...loan,
      formSnapshot: {
        ...form,
        additionalMonthlyPayment: overpaymentAmount,
        lumpSumAmount: lumpSumAmount > 0 ? lumpSumAmount : null,
        lumpSumDate: lumpSumAmount > 0 ? lumpSumDate : null,
      },
      resultSnapshot: {
        ...buildResultSnapshot(scenarioForSave, loan.resultSnapshot.totalInterestPaidBaseline),
        totalInterestPaid: scenarioTotals.totalInterestPaid,
        totalTermInMonths: scenarioTotals.totalTermInMonths,
      },
      updatedAt: new Date().toISOString(),
    });
    router.back();
  };

  const yrs = t('results.years');
  const mo = t('results.months');
  const loanStartDate = parseDateLabelValue(loan.formSnapshot.startDate) ?? new Date();
  const today = new Date();
  const lumpSumMinDate = loanStartDate > today ? loanStartDate : today;
  const lumpSumMaxDate = (() => {
    const d = new Date(loanStartDate);
    d.setMonth(d.getMonth() + baselineTotals.totalTermInMonths - 1);
    return d;
  })();
  const termLabel = formatDuration(
    (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths,
    yrs, mo,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('recalculate.title')}
        subtitle={t('recalculate.subtitle')}
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FinancialDisclaimer dismissible style={styles.disclaimer} />

        <Card style={styles.summaryCard}>
          <AppText variant="title3">{t('recalculate.loanSummaryTitle')}</AppText>
          <View style={styles.summaryRows}>
            <SummaryRow
              label={t('calculator.loanAmount')}
              value={formatCurrency(loan.formSnapshot.loanAmount, loan.currency)}
            />
            <SummaryRow
              label={t('calculator.interestRate')}
              value={`${loan.formSnapshot.interest}%`}
            />
            <SummaryRow label={t('results.loanTerm')} value={termLabel} />
            <SummaryRow
              label={t('results.monthlyPayment')}
              value={formatCurrency(baselineTotals.monthlyPayments, loan.currency)}
            />
          </View>
        </Card>

        <View style={styles.section}>
          <AppText variant="title3" style={styles.sectionTitle}>{t('recalculate.monthlySection')}</AppText>
          <View style={styles.field}>
            <FieldLabel>{t('recalculate.extraPaymentLabel')}</FieldLabel>
            <InputSurface>
              <AppTextInput
                value={overpayment}
                onChangeText={setOverpayment}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </InputSurface>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="title3" style={styles.sectionTitle}>{t('recalculate.lumpSumSection')}</AppText>
          <View style={styles.field}>
            <FieldLabel>{t('recalculate.lumpSumLabel')}</FieldLabel>
            <InputSurface>
              <AppTextInput
                value={lumpSum}
                onChangeText={setLumpSum}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </InputSurface>
          </View>
          {showLumpSumDate ? (
            <View style={styles.field}>
              <DatePickerField
                label={t('recalculate.lumpSumDateLabel')}
                value={lumpSumDate}
                onChange={setLumpSumDate}
                hint={t('recalculate.lumpSumDateHint')}
                minimumDate={lumpSumMinDate}
                maximumDate={lumpSumMaxDate}
              />
            </View>
          ) : null}
        </View>

        {hasImpact ? (
          <Card style={styles.impactCard}>
            <AppText variant="title3">{t('recalculate.impactTitle')}</AppText>
            <View style={styles.impactRows}>
              <ImpactRow
                label={t('recalculate.interestSaved')}
                value={formatCurrency(interestSaved, loan.currency)}
                positive={interestSaved > 0}
              />
              <ImpactRow
                label={t('recalculate.timeSaved')}
                value={monthsSaved > 0 ? formatDuration(monthsSaved, yrs, mo) : '—'}
                positive={monthsSaved > 0}
              />
              <ImpactRow
                label={t('recalculate.newMonthlyTotal')}
                value={formatCurrency(scenarioTotals.monthlyPayments + overpaymentAmount, loan.currency)}
              />
            </View>
          </Card>
        ) : (
          <View style={styles.emptyState}>
            <AppText variant="bodySm" tone="muted" style={styles.emptyStateText}>
              {t('recalculate.noImpactMessage')}
            </AppText>
          </View>
        )}

        <Button
          label={t('recalculate.saveToLoan')}
          onPress={handleSave}
          disabled={isUnchanged}
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

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryRow}>
    <AppText variant="bodySm" tone="muted">{label}</AppText>
    <AppText variant="bodySm">{value}</AppText>
  </View>
);

const ImpactRow = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <View style={styles.impactRow}>
    <AppText variant="bodySm" tone="muted">{label}</AppText>
    <AppText variant="labelMd" tone={positive ? 'success' : 'default'}>{value}</AppText>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundBtn: { marginTop: spacing.md },
  disclaimer: { marginBottom: spacing.md },
  summaryCard: {},
  summaryRows: { marginTop: spacing.sm, gap: spacing.xs },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: { marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.sm },
  field: { gap: spacing.xs },
  impactCard: {
    marginTop: spacing.xl,
    borderColor: colours.successBorder,
    backgroundColor: colours.successSurface,
  },
  impactRows: { marginTop: spacing.sm, gap: spacing.sm },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyState: {
    marginTop: spacing.xl,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: { textAlign: 'center' },
  saveBtn: { marginTop: spacing.xl },
  cancelBtn: { marginTop: spacing.xs },
});
