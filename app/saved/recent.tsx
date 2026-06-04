import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CheckIcon } from '@/components/ui/Icons/CheckIcon/CheckIcon';
import { TrashIcon } from '@/components/ui/Icons/TrashIcon/TrashIcon';
import { formatCurrency } from '@/currency/format';
import { buildRecentResultParams, getResultForFormValues } from '@/results/loanResultRoute';
import { RecentCalculation, recentCalculationsStorage } from '@/storage/recentCalculations';
import { colours, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate } from '@/utils/date';

const formatTermDuration = (months: number, yearsLabel: string, monthsLabel: string): string => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} ${monthsLabel}`;
  if (remainingMonths === 0) return `${years} ${yearsLabel}`;
  return `${years} ${yearsLabel} ${remainingMonths} ${monthsLabel}`;
};

const RecentStat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <AppText variant="helper" tone="muted" numberOfLines={1}>{label}</AppText>
    <AppText variant="labelMd" numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
  </View>
);

const RecentCalculationCard = ({
  item,
  onOpen,
  onTrack,
  onDelete,
  onLongPress,
  onToggleSelected,
  selected,
  selectionMode,
}: {
  item: RecentCalculation;
  onOpen: () => void;
  onTrack: () => void;
  onDelete: () => void;
  onLongPress: () => void;
  onToggleSelected: () => void;
  selected: boolean;
  selectionMode: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const result = useMemo(() => getResultForFormValues(item.formValues), [item.formValues]);
  const handlePress = selectionMode ? onToggleSelected : onOpen;

  const totalMonths = Math.max(
    result.tableItems.length,
    result.termInYears * 12 + result.termInMonths,
  );
  const termLabel = formatTermDuration(totalMonths, t('results.years'), t('results.months'));

  return (
    <Card
      style={[styles.recentCard, selected && styles.recentCardSelected]}
      padding={0}
    >
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={onLongPress}
        activeOpacity={0.84}
        accessibilityRole="button"
      >
        <View style={styles.recentCardInner}>
          <View style={styles.recentCardMain}>
            <View style={styles.recentCardHeader}>
              <View style={styles.recentCardCopy}>
                <AppText variant="labelSm" tone="muted" style={styles.kicker}>
                  {item.category ? t(`saved.category.${item.category}`) : t('recent.calculation')}
                </AppText>
                <AppText variant="title3">
                  {formatCurrency(result.monthlyPayments, item.currency)}
                </AppText>
                <AppText variant="bodySm" tone="muted">
                  {`${t('results.monthlyPayment')} · ${t('recent.created', { date: formatFriendlyDate(item.createdAt.slice(0, 10), i18n.language) })}`}
                </AppText>
              </View>
              <View style={styles.recentMetric}>
                <AppText variant="helper" tone="muted">{t('results.totalInterest')}</AppText>
                <AppText variant="labelMd" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(result.totalInterestPaid, item.currency)}
                </AppText>
              </View>
            </View>
            <View style={styles.recentDetails}>
              <RecentStat
                label={t('calculator.loanAmount')}
                value={formatCurrency(result.amount, item.currency)}
              />
              <RecentStat
                label={t('calculator.interestRate')}
                value={`${result.interest}%`}
              />
              <RecentStat
                label={t('results.loanTerm')}
                value={termLabel}
              />
            </View>
          </View>
          {selectionMode ? (
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected ? <CheckIcon size={14} color={colours.white} strokeWidth={2.4} /> : null}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      {!selectionMode ? (
        <View style={styles.recentActions}>
          <Button label={t('recent.track')} onPress={onTrack} variant="icon-pill" style={styles.trackAction} />
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={onDelete}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
          >
            <TrashIcon size={19} color={colours.error} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>
      ) : null}
    </Card>
  );
};

export default function RecentCalculationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [recentItems, setRecentItems] = useState(() => recentCalculationsStorage.getAll());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectionMode = selectedIds.size > 0;
  const allSelected = recentItems.length > 0 && selectedIds.size === recentItems.length;

  const refresh = useCallback(() => {
    const nextItems = recentCalculationsStorage.getAll();
    setRecentItems(nextItems);
    setSelectedIds(current => {
      if (current.size === 0) return current;
      const validIds = new Set(nextItems.map(item => item.id));
      const next = new Set([...current].filter(id => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, []);

  useFocusEffect(refresh);

  const openRecent = useCallback((id: string) => {
    router.push({ pathname: '/result' as never, params: buildRecentResultParams(id) });
  }, [router]);

  const trackRecent = useCallback((item: RecentCalculation) => {
    router.push({ pathname: '/saved/new' as never, params: { recentId: item.id, currency: item.currency } });
  }, [router]);

  const removeIds = useCallback((ids: string[]) => {
    ids.forEach(id => recentCalculationsStorage.remove(id));
    setRecentItems(recentCalculationsStorage.getAll());
    setSelectedIds(current => {
      if (current.size === 0) return current;
      const next = new Set(current);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const deleteRecent = useCallback((id: string) => {
    Alert.alert(
      t('recent.deleteTitle'),
      t('recent.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removeIds([id]) },
      ],
    );
  }, [removeIds, t]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const startSelection = useCallback((id: string) => {
    setSelectedIds(current => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(current => (
      current.size === recentItems.length
        ? new Set()
        : new Set(recentItems.map(item => item.id))
    ));
  }, [recentItems]);

  const deleteSelected = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    Alert.alert(
      t('recent.deleteSelectedTitle'),
      t('recent.deleteSelectedMessage', { count: ids.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removeIds(ids) },
      ],
    );
  }, [removeIds, selectedIds, t]);

  const listHeader = recentItems.length > 0 ? (
    <View style={styles.listHeader}>
      <AppText variant="bodyLg" tone="muted" style={styles.intro}>
        {t('recent.intro')}
      </AppText>
      {selectionMode ? (
        <View style={styles.selectionBar}>
          <View style={styles.selectionBarTop}>
            <AppText variant="labelMd">
              {t('recent.selectedCount', { count: selectedIds.size })}
            </AppText>
            <Button
              label={allSelected ? t('recent.deselectAll') : t('recent.selectAll')}
              onPress={toggleSelectAll}
              variant="ghost"
              style={styles.selectionAction}
            />
          </View>
          <View style={styles.selectionActions}>
            <Button
              label={t('common.cancel')}
              onPress={clearSelection}
              variant="ghost"
              style={styles.selectionAction}
            />
            <Button
              label={t('recent.deleteSelected')}
              onPress={deleteSelected}
              variant="destructive-ghost"
              leftIcon={<TrashIcon size={17} color={colours.error} strokeWidth={1.9} />}
              style={styles.selectionAction}
            />
          </View>
        </View>
      ) : null}
    </View>
  ) : null;

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
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyState title={t('recent.empty')} subtitle={t('recent.emptySubtitle')} />}
        renderItem={({ item }) => (
          <RecentCalculationCard
            item={item}
            onOpen={() => openRecent(item.id)}
            onTrack={() => trackRecent(item)}
            onDelete={() => deleteRecent(item.id)}
            onLongPress={() => startSelection(item.id)}
            onToggleSelected={() => toggleSelected(item.id)}
            selected={selectedIds.has(item.id)}
            selectionMode={selectionMode}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  list: { padding: layout.screenPadding, flexGrow: 1 },
  listHeader: { marginBottom: spacing.md, gap: spacing.sm },
  intro: {},
  selectionBar: {
    gap: spacing.sm,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.card,
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceAccent,
  },
  selectionBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  selectionAction: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recentCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  recentCardSelected: {
    borderColor: colours.primary,
    backgroundColor: colours.surfaceAccent,
  },
  recentCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.cardPadding,
    paddingBottom: spacing.sm,
  },
  recentCardMain: {
    flex: 1,
    gap: spacing.sm,
  },
  recentCardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  recentCardCopy: { flex: 1, gap: spacing.xxs },
  kicker: { textTransform: 'uppercase' },
  recentMetric: { width: 116, alignItems: 'flex-end', gap: spacing.xxs },
  recentDetails: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
  stat: {
    flex: 1,
    gap: spacing.xxs,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colours.borderStrong,
    backgroundColor: colours.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colours.primary,
    backgroundColor: colours.primary,
  },
  recentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.cardPadding,
    paddingTop: spacing.xs,
    paddingBottom: layout.cardPadding,
  },
  trackAction: {
    flex: 1,
  },
  deleteAction: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colours.errorSurface,
    backgroundColor: colours.errorSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
