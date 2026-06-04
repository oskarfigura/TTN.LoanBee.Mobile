import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatCurrency } from '@/currency/format';
import { buildRecentResultParams, getResultForFormValues } from '@/results/loanResultRoute';
import { RecentCalculation, recentCalculationsStorage } from '@/storage/recentCalculations';
import { colours, layout, spacing } from '@/theme';
import { formatFriendlyDate } from '@/utils/date';

const RecentCalculationCard = ({
  item,
  onOpen,
  onTrack,
  onDelete,
}: {
  item: RecentCalculation;
  onOpen: () => void;
  onTrack: () => void;
  onDelete: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const result = useMemo(() => getResultForFormValues(item.formValues), [item.formValues]);

  return (
    <Card style={styles.recentCard} padding={layout.cardPadding}>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.84}>
        <View style={styles.recentCardHeader}>
          <View style={styles.recentCardCopy}>
            <AppText variant="labelSm" tone="muted" style={styles.kicker}>
              {item.category ? t(`saved.category.${item.category}`) : t('recent.calculation')}
            </AppText>
            <AppText variant="title3">
              {formatCurrency(result.monthlyPayments, item.currency)}
            </AppText>
            <AppText variant="bodySm" tone="muted">
              {t('recent.created', { date: formatFriendlyDate(item.createdAt.slice(0, 10), i18n.language) })}
            </AppText>
          </View>
          <View style={styles.recentMetric}>
            <AppText variant="helper" tone="muted">{t('results.totalInterest')}</AppText>
            <AppText variant="labelMd" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(result.totalInterestPaid, item.currency)}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.recentActions}>
        <Button label={t('recent.reopen')} onPress={onOpen} variant="secondary" style={styles.recentAction} />
        <Button label={t('recent.track')} onPress={onTrack} style={styles.recentAction} />
        <Button label={t('common.delete')} onPress={onDelete} variant="ghost" style={styles.recentDeleteAction} />
      </View>
    </Card>
  );
};

export default function RecentCalculationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [recentItems, setRecentItems] = useState(() => recentCalculationsStorage.getAll());

  const refresh = useCallback(() => {
    setRecentItems(recentCalculationsStorage.getAll());
  }, []);

  useFocusEffect(refresh);

  const openRecent = useCallback((id: string) => {
    router.push({ pathname: '/result' as never, params: buildRecentResultParams(id) });
  }, [router]);

  const trackRecent = useCallback((item: RecentCalculation) => {
    router.push({ pathname: '/saved/new' as never, params: { recentId: item.id, currency: item.currency } });
  }, [router]);

  const deleteRecent = useCallback((id: string) => {
    recentCalculationsStorage.remove(id);
    setRecentItems(recentCalculationsStorage.getAll());
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('recent.title')}
        variant="detail"
        leftAction={<HeaderBackAction onPress={() => router.back()} variant="circle" />}
        showBottomBorder={false}
        backgroundColor={colours.background}
      />
      <FlatList
        data={recentItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={recentItems.length > 0 ? (
          <AppText variant="bodyLg" tone="muted" style={styles.intro}>
            {t('recent.intro')}
          </AppText>
        ) : null}
        ListEmptyComponent={<EmptyState title={t('recent.empty')} subtitle={t('recent.emptySubtitle')} />}
        renderItem={({ item }) => (
          <RecentCalculationCard
            item={item}
            onOpen={() => openRecent(item.id)}
            onTrack={() => trackRecent(item)}
            onDelete={() => deleteRecent(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  list: { padding: layout.screenPadding, flexGrow: 1 },
  intro: { marginBottom: spacing.md },
  recentCard: { marginBottom: spacing.md },
  recentCardHeader: { flexDirection: 'row', gap: spacing.md },
  recentCardCopy: { flex: 1, gap: spacing.xxs },
  kicker: { textTransform: 'uppercase' },
  recentMetric: { width: 128, alignItems: 'flex-end', gap: spacing.xxs },
  recentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  recentAction: { flexGrow: 1, flexBasis: '40%' },
  recentDeleteAction: { flexGrow: 1, flexBasis: '100%' },
});
