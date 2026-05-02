import React, { useCallback, useState } from 'react';
import {
  Alert,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { CumulativeAreaChart } from '@/components/charts/CumulativeAreaChart';
import { LoanBreakdownDonut } from '@/components/charts/LoanBreakdownDonut';
import { RepaymentBarChart } from '@/components/charts/RepaymentBarChart';
import { Card } from '@/components/ui/Card';
import { FinancialDisclaimer } from '@/components/ui/FinancialDisclaimer';
import { SegmentedControl } from '@/components/ui/FormPrimitives';
import { CurrencyCode } from '@/currency/currencies';
import { LoanResult } from '@/results/loanResultRoute';
import { colours, fonts, fontSizes, fontWeights, layout, radii, spacing } from '@/theme';
import { AmortisationTable } from './AmortisationTable';
import { buildAmortisationCsv } from './amortisationTableUtils';
import { LoanSummaryOverview } from './LoanSummaryOverview';

type CalculationTab = 'summary' | 'charts' | 'schedule';

interface Props {
  result: LoanResult;
  startDate: string;
  currency: CurrencyCode;
  style?: StyleProp<ViewStyle>;
  onShare?: () => void;
  shareLabel?: string;
  shareIcon?: React.ReactNode;
  summaryContent?: React.ReactNode;
  tabStyle?: 'segmented' | 'underline';
  showFinancialDisclaimer?: boolean;
}

export const LoanCalculationView = ({
  result,
  startDate,
  currency,
  style,
  onShare,
  shareLabel,
  shareIcon,
  summaryContent,
  tabStyle = 'segmented',
  showFinancialDisclaimer = false,
}: Props) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<CalculationTab>('summary');
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const principalAmount = result.amount - result.downPayment;
  const tabs: Array<{ value: CalculationTab; label: string }> = [
    { value: 'summary', label: t('results.summary') },
    { value: 'charts', label: t('results.charts') },
    { value: 'schedule', label: t('results.schedule') },
  ];

  const handleExportCsv = useCallback(async () => {
    if (isExportingCsv) return;

    setIsExportingCsv(true);

    try {
      const csvContent = buildAmortisationCsv({
        items: result.tableItems,
        startDate,
        language: i18n.language,
        headers: {
          period: t('results.period'),
          openingBalance: t('results.openingBalance'),
          principal: t('results.principal'),
          interest: t('results.interest'),
          closingBalance: t('results.closingBalance'),
        },
      });

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        await Share.share({
          title: t('results.exportCsv'),
          message: csvContent,
        });
        return;
      }

      const fileName = `loanbee-amortisation-${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new File(Paths.cache, fileName);

      file.create({ intermediates: true, overwrite: true });
      file.write(csvContent);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: t('results.exportCsv'),
      });
    } catch {
      Alert.alert(t('results.exportErrorTitle'), t('results.exportErrorMessage'));
    } finally {
      setIsExportingCsv(false);
    }
  }, [i18n.language, isExportingCsv, result.tableItems, startDate, t]);

  return (
    <View style={[styles.root, style]}>
      <SegmentedControl
        value={activeTab}
        onChange={setActiveTab}
        options={tabs}
        variant={tabStyle === 'underline' ? 'underline' : 'primary'}
        textVariant={tabStyle === 'underline' ? 'labelMd' : 'labelSm'}
        style={[styles.tabControl, tabStyle === 'underline' && styles.underlineTabControl]}
      />
      {showFinancialDisclaimer ? (
        <FinancialDisclaimer dismissible style={styles.financialDisclaimer} />
      ) : null}

      {activeTab === 'summary' && (
        <View style={[styles.tabPanel, tabStyle === 'underline' && styles.underlineTabPanel]}>
          {summaryContent ?? (
            <LoanSummaryOverview
              result={result}
              startDate={startDate}
              currency={currency}
              onShare={onShare}
              shareLabel={shareLabel}
              shareIcon={shareIcon}
            />
          )}
        </View>
      )}

      {activeTab === 'charts' && (
        <View style={[styles.tabPanel, tabStyle === 'underline' && styles.underlineTabPanel]}>
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>{t('results.repaymentBreakdown')}</Text>
            </View>
            <RepaymentBarChart
              monthlyArray={result.loanChartMonthlyArray}
              interestArray={result.loanChartInterestArray}
              labelArray={result.loanChartLabelArray}
              currency={currency}
            />
          </Card>
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>{t('results.loanBreakdown')}</Text>
            </View>
            <LoanBreakdownDonut
              principal={principalAmount}
              totalInterest={result.totalInterestPaid}
              currency={currency}
            />
          </Card>
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>{t('results.cumulativePayments')}</Text>
            </View>
            <CumulativeAreaChart
              monthlyArray={result.loanChartMonthlyArray}
              interestArray={result.loanChartInterestArray}
              remainingArray={result.loanChartRemainingArray}
              currency={currency}
            />
          </Card>
        </View>
      )}

      {activeTab === 'schedule' && (
        <Card style={[styles.chartCard, styles.scheduleCard, tabStyle === 'underline' && styles.underlineTabPanel]}>
          <View style={[styles.chartHeader, styles.scheduleHeader]}>
            <Text style={[styles.chartTitle, styles.scheduleTitle]}>{t('results.amortisationTable')}</Text>
            <TouchableOpacity
              style={[styles.exportButton, isExportingCsv && styles.exportButtonDisabled]}
              onPress={handleExportCsv}
              disabled={isExportingCsv}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <Text style={styles.exportButtonText}>
                {isExportingCsv ? t('results.exportingCsv') : t('results.exportCsv')}
              </Text>
            </TouchableOpacity>
          </View>
          <AmortisationTable
            items={result.tableItems}
            startDate={startDate}
            currency={currency}
          />
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {},
  tabControl: { marginBottom: spacing.sm },
  underlineTabControl: {
    marginHorizontal: -layout.screenPadding,
    marginBottom: 0,
  },
  financialDisclaimer: {
    marginTop: spacing.sm,
  },
  underlineTabPanel: {
    marginTop: spacing.sm,
  },
  tabPanel: {
    marginTop: 2,
  },
  chartCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
  },
  chartHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.textSecondary,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  scheduleTitle: {
    flex: 1,
  },
  exportButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scheduleCard: {
    paddingBottom: 8,
  },
});
