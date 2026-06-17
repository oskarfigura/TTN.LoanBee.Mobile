import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, ButtonVariant } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { Card } from '@oskarfigura/ui-native';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { formatCurrency } from '@/shared/domain/currency/format';
import { buildRecentResultParams } from '@/shared/domain/results/loanResultRoute';
import { RecentCalculation, recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { formatFriendlyDate } from '@/shared/lib/utils/date';

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
  const suppressPressRef = useRef(false);
  const handlePress = selectionMode ? onToggleSelected : onOpen;
  const handleLongPress = () => {
    suppressPressRef.current = true;
    onLongPress();
    setTimeout(() => {
      suppressPressRef.current = false;
    }, 0);
  };
  const handleCardPress = () => {
    if (suppressPressRef.current) return;
    handlePress();
  };

  // Display values come straight from the snapshot recorded at calculation time —
  // no amortisation is re-run on list render. `loanAmount`/`interest` are echoed
  // inputs (see getLoanCalculations), so they read from formValues directly.
  const { resultSnapshot: snapshot, formValues, currency } = item;
  const totalMonths = Math.max(
    snapshot.totalTermInMonths,
    snapshot.termInYears * 12 + snapshot.termInMonths,
  );
  const termLabel = formatTermDuration(totalMonths, t('results.years'), t('results.months'));

  return (
    <Card
      style={[styles.recentCard, selected && styles.recentCardSelected]}
      padding={0}
    >
      <TouchableOpacity
        onPress={handleCardPress}
        onLongPress={handleLongPress}
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
                  {formatCurrency(snapshot.monthlyPayments, currency)}
                </AppText>
                <AppText variant="bodySm" tone="muted">
                  {t('recent.created', { date: formatFriendlyDate(item.createdAt.slice(0, 10), i18n.language) })}
                </AppText>
              </View>
              <View style={styles.recentMetric}>
                <AppText variant="helper" tone="muted">{t('results.totalInterest')}</AppText>
                <AppText variant="labelMd" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(snapshot.totalInterestPaid, currency)}
                </AppText>
              </View>
            </View>
            <View style={styles.recentDetails}>
              <RecentStat
                label={t('calculator.loanAmount')}
                value={formatCurrency(formValues.loanAmount, currency)}
              />
              <RecentStat
                label={t('calculator.interestRate')}
                value={`${formValues.interest}%`}
              />
              <RecentStat
                label={t('results.loanTerm')}
                value={termLabel}
              />
            </View>
          </View>
          {selectionMode ? (
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected ? <Icon icon={IconName.CheckIcon} size={14} color={colours.white} strokeWidth={2.4} /> : null}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      {!selectionMode ? (
        <View style={styles.recentActions}>
          <Button label={t('recent.track')} onPress={onTrack} variant="iconPill" style={styles.trackAction} />
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={onDelete}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
          >
            <Icon icon={IconName.TrashIcon} size={19} color={colours.error} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>
      ) : null}
    </Card>
  );
};

export default function RecentCalculationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          <AppText variant="labelMd">
            {t('recent.selectedCount', { count: selectedIds.size })}
          </AppText>
          <Button
            label={allSelected ? t('recent.deselectAll') : t('recent.selectAll')}
            onPress={toggleSelectAll}
            variant={ButtonVariant.Ghost}
            style={styles.selectionAction}
          />
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
        style={styles.flatList}
        data={recentItems}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, selectionMode && styles.listWithActionBar]}
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
      {selectionMode ? (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            label={t('common.cancel')}
            onPress={clearSelection}
            variant={ButtonVariant.Secondary}
            style={styles.actionBarButton}
          />
          <Button
            label={t('common.delete')}
            onPress={deleteSelected}
            variant={ButtonVariant.Destructive}
            leftIcon={<Icon icon={IconName.TrashIcon} size={18} color={colours.white} strokeWidth={1.9} />}
            style={styles.actionBarButton}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  flatList: { flex: 1 },
  list: { padding: layout.screenPadding, flexGrow: 1 },
  listWithActionBar: { paddingBottom: 96 },
  listHeader: { marginBottom: spacing.md, gap: spacing.sm },
  intro: {},
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingLeft: layout.cardPadding,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.card,
    borderColor: colours.primaryMuted,
    backgroundColor: colours.surfaceAccent,
  },
  selectionAction: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    backgroundColor: colours.surfaceRaised,
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  actionBarButton: {
    flex: 1,
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
