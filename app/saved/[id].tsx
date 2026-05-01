import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { savedLoansStorage } from '@/storage/savedLoans';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { ResultsSummary } from '@/components/calculator/ResultsSummary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { formatCurrency } from '@/currency/format';
import { monthsBetween } from '@/utils/date';
import { buildSavedLoanResultParams } from '@/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MortgageGroupDetail } from '@/components/loans/MortgageGroupDetail';
import { DashboardPinButton } from '@/components/loans/DashboardPinButton';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function LoanDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, fromSave } = useLocalSearchParams<{ id: string; fromSave?: string }>();
  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const allowSavedBackRef = useRef(false);

  const refresh = useCallback(() => {
    setLoan(savedLoansStorage.getById(id));
  }, [id]);

  useFocusEffect(refresh);

  const handleBack = useCallback(() => {
    if (fromSave !== '1') {
      router.back();
      return;
    }

    allowSavedBackRef.current = true;
    router.replace('/saved');
    setTimeout(() => {
      allowSavedBackRef.current = false;
    }, 0);
  }, [fromSave, router]);

  useEffect(() => {
    if (fromSave !== '1') return undefined;

    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (allowSavedBackRef.current) return;
      event.preventDefault();
      handleBack();
    });

    return unsubscribe;
  }, [fromSave, handleBack, navigation]);

  const result = useMemo(() => {
    if (!loan) return null;
    const fs = loan.formSnapshot;
    return getLoanCalculations(
      fs.loanAmount, fs.interest, fs.termInYears, fs.termInMonths,
      fs.desiredMonthlyPayment ?? 0,
      fs.calculationType.toLowerCase() as LoanCalculationType,
      fs.downPayment,
      fs.downPaymentType.toLowerCase() as DownPaymentType,
      fs.additionalMonthlyPayment ?? 0,
      fs.startDate,
    );
  }, [loan]);

  if (!loan || !result) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('saved.loanDetail')}
          leftAction={<HeaderBackAction onPress={handleBack} />}
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('saved.notFound')}</Text>
          <Button label={t('common.goBack')} onPress={handleBack} />
        </View>
      </SafeAreaView>
    );
  }

  const now = new Date();
  const elapsed = monthsBetween(loan.formSnapshot.startDate, now);
  const total = loan.resultSnapshot.totalTermInMonths;
  const progress = Math.min(elapsed / total, 1.0);
  const remaining = Math.max(0, total - elapsed);
  const hasSavings = (loan.formSnapshot.additionalMonthlyPayment ?? 0) > 0;
  const savings = loan.resultSnapshot.totalInterestPaidBaseline - loan.resultSnapshot.totalInterestPaid;
  const openResult = () => router.push({
    pathname: '/result' as never,
    params: buildSavedLoanResultParams(loan),
  });

  if (loan.category === 'mortgage') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('saved.loanDetail')}
          leftAction={<HeaderBackAction onPress={handleBack} />}
        />
        <ScrollView contentContainerStyle={styles.container}>
          <MortgageGroupDetail
            loan={loan}
            onTogglePinned={() => {
              savedLoansStorage.togglePinned(loan.id);
              refresh();
            }}
            onViewCalculation={openResult}
          />
          <Button
            label={t('edit.manageShort')}
            onPress={() => router.push(`/saved/${id}/edit`)}
            variant="secondary"
            style={styles.secondaryAction}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('saved.loanDetail')}
        leftAction={<HeaderBackAction onPress={handleBack} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.nickname}>{loan.nickname}</Text>
            {loan.lender && <Text style={styles.lender}>{loan.lender}</Text>}
          </View>
          <DashboardPinButton
            pinned={loan.pinnedToDashboard}
            onPress={() => {
              savedLoansStorage.togglePinned(loan.id);
              refresh();
            }}
            style={styles.pinButton}
          />
        </View>

        <ResultsSummary
          monthlyPayments={result.monthlyPayments}
          principalAmount={result.amount - result.downPayment}
          totalInterestPaid={result.totalInterestPaid}
          totalAmountPaid={result.totalAmountPaid}
          termInYears={result.termInYears}
          termInMonths={result.termInMonths}
          startDate={loan.formSnapshot.startDate}
          currency={loan.currency}
        />

        <Card style={styles.progressCard}>
          <Text style={styles.sectionTitle}>{t('saved.loanProgress')}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {remaining > 0
              ? t('saved.progress', { months: remaining, total })
              : t('saved.completed')}
          </Text>
        </Card>

        {hasSavings && savings > 0 && (
          <Card style={styles.savingsCard}>
            <Text style={styles.savingsTitle}>{t('saved.overpaymentSavings')}</Text>
            <Text style={styles.savingsAmount}>
              {formatCurrency(savings, loan.currency)}
            </Text>
            <Text style={styles.savingsSubtitle}>{t('saved.savedInInterest')}</Text>
          </Card>
        )}

        <Button
          label={t('saved.viewFullCalculation')}
          onPress={openResult}
          style={styles.primaryAction}
        />
        <Button
          label={t('edit.manageShort')}
          onPress={() => router.push(`/saved/${id}/edit`)}
          variant="secondary"
          style={styles.secondaryAction}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  titleCopy: { flex: 1 },
  pinButton: {
    marginBottom: 0,
    marginTop: 4,
  },
  nickname: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  lender: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginTop: 2,
  },
  progressCard: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginBottom: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colours.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colours.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
  savingsCard: {
    backgroundColor: colours.successSurface,
    borderColor: colours.successBorder,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  savingsTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.secondary,
    marginBottom: 4,
  },
  savingsAmount: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.secondary,
  },
  savingsSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.secondary,
    marginTop: 2,
  },
  primaryAction: {
    marginTop: 16,
  },
  secondaryAction: {
    marginTop: 8,
  },
});
