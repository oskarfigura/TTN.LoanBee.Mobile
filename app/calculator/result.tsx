import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ResultsSummary } from '@/components/calculator/ResultsSummary';
import { AmortisationTable } from '@/components/calculator/AmortisationTable';
import { RepaymentBarChart } from '@/components/charts/RepaymentBarChart';
import { LoanBreakdownDonut } from '@/components/charts/LoanBreakdownDonut';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BannerAd } from '@/ads/BannerAd';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { CurrencyCode } from '@/currency/currencies';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer } from '@/components/ui/Disclaimer';

type LoanResult = ReturnType<typeof import('@/core/amortisation').getLoanCalculations>;

export default function ResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ result: string; formValues: string; currency: string }>();

  const result = JSON.parse(params.result) as LoanResult;
  const formValues = JSON.parse(params.formValues);
  const currency = (params.currency as CurrencyCode) ?? 'GBP';

  const [activeTab, setActiveTab] = useState<'summary' | 'charts' | 'table'>('summary');

  const totalTermInMonths = result.tableItems.length;
  const principalAmount = result.amount - result.downPayment;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Summary always visible */}
        <ResultsSummary
          monthlyPayments={result.monthlyPayments}
          totalInterestPaid={result.totalInterestPaid}
          totalAmountPaid={result.totalAmountPaid}
          termInYears={result.termInYears}
          termInMonths={result.termInMonths}
          currency={currency}
        />

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['summary', 'charts', 'table'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'summary' ? t('results.summary') : tab === 'charts' ? t('results.charts') : t('results.amortisationTable')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Charts */}
        {activeTab === 'charts' && (
          <View>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('results.repaymentBreakdown')}</Text>
              <RepaymentBarChart
                monthlyArray={result.loanChartMonthlyArray}
                interestArray={result.loanChartInterestArray}
                labelArray={result.loanChartLabelArray}
                currency={currency}
              />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('results.loanBreakdown')}</Text>
              <LoanBreakdownDonut
                principal={principalAmount}
                totalInterest={result.totalInterestPaid}
                currency={currency}
              />
            </Card>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('results.cumulativePayments')}</Text>
              <CumulativeAreaChart
                monthlyArray={result.loanChartMonthlyArray}
                interestArray={result.loanChartInterestArray}
                remainingArray={result.loanChartRemainingArray}
                currency={currency}
              />
            </Card>
          </View>
        )}

        {/* Table */}
        {activeTab === 'table' && (
          <Card>
            <AmortisationTable
              items={result.tableItems}
              currency={currency}
            />
          </Card>
        )}

        <BannerAd />
        <Disclaimer />

        <Button
          label={t('results.saveThisLoan')}
          onPress={() => router.push({
            pathname: '/saved/new',
            params: {
              result: params.result,
              formValues: params.formValues,
              currency: params.currency,
            },
          })}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 16, paddingBottom: 40 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    marginVertical: 16,
    height: 44,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colours.primary,
  },
  tabText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  tabTextActive: {
    color: colours.white,
  },
  chartCard: {
    marginBottom: 12,
  },
  chartTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 16,
  },
});
