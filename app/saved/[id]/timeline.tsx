import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatCurrency } from '@/currency/format';
import { getCurrentDeal, getDraftDeals, getPublishedDeals, getTimelineWarnings } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal } from '@/types/SavedLoan';
import { CurrencyCode } from '@/currency/currencies';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

const StatusPill = ({ label, active }: { label: string; active?: boolean }) => (
  <View style={[styles.statusPill, active && styles.statusPillActive]}>
    <Text style={[styles.statusText, active && styles.statusTextActive]}>{label}</Text>
  </View>
);

const DealStats = ({ deal, currency }: { deal: LoanDeal; currency: CurrencyCode }) => (
  <View style={styles.dealStats}>
    <View style={styles.dealStat}>
      <Text style={styles.statLabel}>Interest Rate</Text>
      <Text style={styles.statValue}>{deal.interestRate}%</Text>
    </View>
    <View style={styles.dealStat}>
      <Text style={styles.statLabel}>Monthly Payment</Text>
      <Text style={styles.statValue}>{formatCurrency(deal.monthlyPayment, currency)}</Text>
    </View>
  </View>
);

export default function MortgageTimelineScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const timeline = useMemo(() => {
    if (!loan) return null;
    return {
      drafts: getDraftDeals(loan),
      current: getCurrentDeal(loan),
      completed: getPublishedDeals(loan).filter(deal => deal.status === 'completed').reverse(),
      warnings: getTimelineWarnings(loan),
    };
  }, [loan]);

  if (!loan || !timeline) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.timelineTitle')}
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('saved.notFound')}</Text>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.timelineTitle')}
        subtitle={loan.nickname}
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
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
                  <StatusPill label={t('mortgage.inactive')} />
                </View>
                <Text style={styles.meta}>{t('mortgage.startsOn', { date: deal.startDate })}</Text>
                <Button
                  label={t('mortgage.planNextDeal')}
                  onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}
                  variant="secondary"
                  style={styles.cardButton}
                />
              </Card>
            </View>
          ))}

          {timeline.current && (
            <View style={styles.timelineItem}>
              <View style={styles.nodeActive} />
              <Card style={styles.currentCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.currentKicker}>{t('mortgage.currentDeal')}</Text>
                  <StatusPill label={t('mortgage.active')} active />
                </View>
                <Text style={styles.currentTitle}>{timeline.current.name}</Text>
                <Text style={styles.meta}>{timeline.current.startDate} - {timeline.current.endDate}</Text>
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
                    <StatusPill label={t('saved.completed')} />
                    <TouchableOpacity onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}>
                      <Text style={styles.editLink}>{t('saved.edit')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.meta}>{deal.startDate} - {deal.endDate}</Text>
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

        <Button label={t('mortgage.addNextDeal')} onPress={() => router.push(`/saved/${loan.id}/deals/new`)} style={styles.footerAction} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 20, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  header: { marginBottom: 28 },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
    marginTop: 4,
  },
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
    borderRadius: 17,
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
    borderRadius: 21,
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
    borderRadius: 17,
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
    borderRadius: 17,
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
    borderRadius: 17,
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
  statusPill: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  statusPillActive: { backgroundColor: colours.teal, borderColor: colours.teal },
  statusText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  statusTextActive: { color: colours.white },
  cardButton: { marginTop: 24 },
  dealStats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 12,
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
  footerAction: { marginTop: 4 },
});
