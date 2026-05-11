import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlusIcon } from '@/components/loans/LoanIcons';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';
import {
  getCurrentDeal,
  getDraftDeals,
  getPublishedDeals,
  getTimelineWarnings,
  removeDealAndRecalculateLater,
} from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, fonts, fontSizes, fontWeights, radii } from '@/theme';
import { LoanDeal, SavedLoan } from '@/types/SavedLoan';
import { formatFriendlyDate, formatFriendlyDateRange } from '@/utils/date';

interface Props {
  loan: SavedLoan;
  showFooterAction?: boolean;
  onLoanUpdated?: (loan: SavedLoan) => void;
}

const StatusBadge = ({ label, variant = 'neutral' }: { label: string; variant?: 'neutral' | 'active' | 'success' }) => (
  <Badge label={label} variant={variant} />
);

const DealStats = ({ deal, currency }: { deal: LoanDeal; currency: CurrencyCode }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.dealStats}>
      <View style={styles.dealStat}>
        <Text style={styles.statLabel}>{t('calculator.interestRate')}</Text>
        <Text style={styles.statValue}>{deal.interestRate}%</Text>
      </View>
      <View style={styles.dealStat}>
        <Text style={styles.statLabel}>{t('results.monthlyPayment')}</Text>
        <Text style={styles.statValue}>{formatCurrency(deal.monthlyPayment, currency)}</Text>
      </View>
    </View>
  );
};

export const MortgageTimelineView = ({ loan, showFooterAction = true, onLoanUpdated }: Props) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const timeline = useMemo(() => ({
    drafts: getDraftDeals(loan),
    current: getCurrentDeal(loan),
    completed: getPublishedDeals(loan).filter(deal => deal.status === 'completed').reverse(),
    warnings: getTimelineWarnings(loan),
  }), [loan]);
  const addDealButton = (
    <Button
      label={t('mortgage.addNextDeal')}
      leftIcon={<PlusIcon color={colours.primaryInk} size={18} />}
      onPress={() => router.push(`/saved/${loan.id}/deals/new`)}
      variant="secondary"
    />
  );
  const deleteDraft = (deal: LoanDeal) => {
    Alert.alert(
      t('mortgage.deleteDraftTitle'),
      t('mortgage.deleteDraftMessage'),
      [
        { text: t('results.cancelLeave'), style: 'cancel' },
        {
          text: t('mortgage.deleteDraft'),
          style: 'destructive',
          onPress: () => {
            const updatedLoan = removeDealAndRecalculateLater(loan, deal.id);
            savedLoansStorage.update(updatedLoan);
            onLoanUpdated?.(updatedLoan);
          },
        },
      ],
    );
  };

  return (
    <View>
      {showFooterAction ? (
        <View style={styles.topAction}>
          {addDealButton}
        </View>
      ) : null}

      <View style={styles.timelineShell}>
        <View style={styles.rail} />

        {timeline.drafts.map(deal => (
          <View key={deal.id} style={styles.timelineItem}>
            <View style={styles.nodeMuted} />
            <Card style={styles.futureCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.kicker}>{t('mortgage.future')}</Text>
                  <Text style={styles.futureTitle}>{deal.name}</Text>
                </View>
                <StatusBadge label={t('mortgage.inactive')} />
              </View>
              <Text style={styles.meta}>
                {t('mortgage.startsOn', { date: formatFriendlyDate(deal.startDate, i18n.language) })}
              </Text>
              <View style={styles.futureActions}>
                <Button
                  label={t('mortgage.planNextDeal')}
                  onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}
                  variant="secondary"
                />
                <Button
                  label={t('mortgage.deleteDraft')}
                  onPress={() => deleteDraft(deal)}
                  variant="ghost"
                />
              </View>
            </Card>
          </View>
        ))}

        {timeline.current && (
          <View style={styles.timelineItem}>
            <View style={styles.nodeActive} />
            <Card style={styles.currentCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.currentKicker}>{t('mortgage.currentDeal')}</Text>
                <StatusBadge label={t('mortgage.active')} variant="active" />
              </View>
              <Text style={styles.currentTitle}>{timeline.current.name}</Text>
              <Text style={styles.meta}>
                {formatFriendlyDateRange(timeline.current.startDate, timeline.current.endDate, i18n.language)}
              </Text>
              <DealStats deal={timeline.current} currency={loan.currency} />
              <View style={styles.currentActions}>
                <Button
                  label={t('mortgage.editDeal')}
                  onPress={() => router.push(`/saved/${loan.id}/deals/${timeline.current?.id}`)}
                  variant="ghost"
                />
                <Button
                  label={t('mortgage.completeCurrentDeal')}
                  onPress={() => router.push(`/saved/${loan.id}/complete-current`)}
                  variant="secondary"
                />
              </View>
            </Card>
          </View>
        )}

        {timeline.warnings.map(warning => (
          <View key={`${warning.type}-${warning.dealId ?? 'group'}`} style={styles.timelineItem}>
            <View style={styles.nodeWarning} />
            <Card style={styles.warningCard}>
              <Text style={styles.warningTitle}>{warning.title}</Text>
              <Text style={styles.warningText}>{warning.message}</Text>
            </Card>
          </View>
        ))}

        {timeline.completed.map(deal => (
          <View key={deal.id} style={styles.timelineItem}>
            <View style={styles.nodeComplete} />
            <Card style={styles.pastCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.kicker}>{t('mortgage.past')}</Text>
                  <Text style={styles.pastTitle}>{deal.name}</Text>
                </View>
                <View style={styles.completedActions}>
                  <StatusBadge label={t('saved.completed')} variant="success" />
                  <TouchableOpacity onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}>
                    <Text style={styles.editLink}>{t('saved.edit')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.meta}>{formatFriendlyDateRange(deal.startDate, deal.endDate, i18n.language)}</Text>
              <DealStats deal={deal} currency={loan.currency} />
              {deal.completion && (
                <Text style={styles.completionText}>
                  {t('mortgage.closedAt', { amount: formatCurrency(deal.completion.closingBalance, loan.currency) })}
                </Text>
              )}
            </Card>
          </View>
        ))}

        <View style={styles.timelineItem}>
          <View style={styles.nodeStart} />
          <Text style={styles.startText}>{t('mortgage.mortgageStart')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topAction: { marginBottom: 16 },
  timelineShell: { position: 'relative', paddingLeft: 50 },
  rail: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colours.border,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 28,
  },
  nodeMuted: {
    position: 'absolute',
    left: -49,
    top: 28,
    width: 34,
    height: 34,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  nodeActive: {
    position: 'absolute',
    left: -53,
    top: 36,
    width: 42,
    height: 42,
    borderRadius: radii.full,
    borderWidth: 5,
    borderColor: colours.teal,
    backgroundColor: colours.white,
  },
  nodeWarning: {
    position: 'absolute',
    left: -49,
    top: 20,
    width: 34,
    height: 34,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colours.error,
    backgroundColor: colours.background,
  },
  nodeComplete: {
    position: 'absolute',
    left: -49,
    top: 28,
    width: 34,
    height: 34,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colours.textSecondary,
    backgroundColor: colours.background,
  },
  nodeStart: {
    position: 'absolute',
    left: -49,
    top: 0,
    width: 34,
    height: 34,
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  futureCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: colours.border,
  },
  currentCard: {
    borderTopWidth: 4,
    borderTopColor: colours.teal,
  },
  pastCard: {},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  futureTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginTop: 4,
  },
  currentKicker: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
    textTransform: 'uppercase',
  },
  currentTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
    marginTop: 8,
  },
  pastTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginTop: 4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    marginTop: 16,
  },
  futureActions: {
    marginTop: 24,
    gap: 8,
  },
  dealStats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.input,
    marginTop: 22,
    overflow: 'hidden',
  },
  dealStat: {
    flex: 1,
    padding: 14,
    backgroundColor: colours.white,
  },
  statLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colours.primary,
    marginTop: 8,
  },
  currentActions: {
    marginTop: 16,
    gap: 8,
  },
  warningCard: {
    borderColor: colours.error,
    borderWidth: 1,
  },
  warningTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.error,
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    marginTop: 6,
    lineHeight: 20,
  },
  completedActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  editLink: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  completionText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 12,
  },
  startText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
    paddingTop: 4,
  },
});
