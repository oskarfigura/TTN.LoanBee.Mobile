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
import { CheckIcon } from '@/components/ui/Icons/CheckIcon/CheckIcon';
import { TrashIcon } from '@/components/ui/Icons/TrashIcon/TrashIcon';
import { formatCurrency } from '@/currency/format';
import { buildRecentResultParams, getResultForFormValues } from '@/results/loanResultRoute';
import { RecentCalculation, recentCalculationsStorage } from '@/storage/recentCalculations';
import { colours, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate } from '@/utils/date';

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
        {selectionMode ? (
          <View style={[styles.selectionDot, selected && styles.selectionDotSelected]}>
            {selected ? <CheckIcon size={14} color={colours.white} strokeWidth={2.4} /> : null}
          </View>
        ) : null}
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

  const deleteRecent = useCallback((id: string) => {
    recentCalculationsStorage.remove(id);
    setRecentItems(recentCalculationsStorage.getAll());
    setSelectedIds(current => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

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

  const deleteSelected = useCallback(() => {
    selectedIds.forEach(id => recentCalculationsStorage.remove(id));
    setSelectedIds(new Set());
    setRecentItems(recentCalculationsStorage.getAll());
  }, [selectedIds]);

  const listHeader = recentItems.length > 0 ? (
    <View style={styles.listHeader}>
      <AppText variant="bodyLg" tone="muted" style={styles.intro}>
        {t('recent.intro')}
      </AppText>
      {selectionMode ? (
        <View style={styles.selectionBar}>
          <AppText variant="labelMd">
            {t('recent.selectedCount', { count: selectedIds.size })}
          </AppText>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.card,
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceAccent,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  recentCardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: layout.cardPadding,
    paddingBottom: spacing.sm,
  },
  recentCardCopy: { flex: 1, gap: spacing.xxs },
  kicker: { textTransform: 'uppercase' },
  recentMetric: { width: 128, alignItems: 'flex-end', gap: spacing.xxs },
  selectionDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colours.borderStrong,
    backgroundColor: colours.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDotSelected: {
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
