import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { LoanProfileCard } from '@/components/loans/LoanProfileCard';
import { ChevronRightIcon } from '@/components/loans/LoanIcons';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { AppTextInput, InputSurface } from '@/components/ui/FormPrimitives';
import { SearchIcon } from '@/components/ui/Icons/SearchIcon/SearchIcon';
import { ClockIcon } from '@/components/ui/Icons/ClockIcon/ClockIcon';
import { TrashIcon } from '@/components/ui/Icons/TrashIcon/TrashIcon';
import { recentCalculationsStorage } from '@/storage/recentCalculations';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, layout, radii, spacing } from '@/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ fromDashboard?: string }>();
  const { loans, togglePinned, remove, refresh } = useSavedLoans();
  const openedFromDashboard = params.fromDashboard === '1';

  const [query, setQuery] = useState('');
  const [hasRecent, setHasRecent] = useState(() => recentCalculationsStorage.getAll().length > 0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectionMode = selectedIds.size > 0;
  const visibleLoans = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase();
    const filtered = normalisedQuery
      ? loans.filter(loan => [
        loan.nickname,
        loan.lender ?? '',
        t(`saved.category.${loan.category}`),
      ].some(value => value.toLocaleLowerCase().includes(normalisedQuery)))
      : loans;

    return [...filtered].sort((a, b) => {
      // Pinned loans float to the top so the list order matches the prominence the
      // pin implies; within each group fall back to most-recently-updated first.
      if (a.pinnedToDashboard !== b.pinnedToDashboard) {
        return a.pinnedToDashboard ? -1 : 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [loans, query, t]);

  const allSelected = visibleLoans.length > 0 && selectedIds.size === visibleLoans.length;

  const refreshScreen = useCallback(() => {
    refresh();
    setHasRecent(recentCalculationsStorage.getAll().length > 0);
    setSelectedIds(current => {
      if (current.size === 0) return current;
      const validIds = new Set(savedLoansStorage.getAll().map(loan => loan.id));
      const next = new Set([...current].filter(id => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [refresh]);

  useFocusEffect(refreshScreen);

  const openRecentCalculations = useCallback(() => {
    router.push('/saved/recent');
  }, [router]);

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
      current.size === visibleLoans.length
        ? new Set()
        : new Set(visibleLoans.map(loan => loan.id))
    ));
  }, [visibleLoans]);

  const deleteSelected = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    Alert.alert(
      t('saved.deleteSelectedTitle'),
      t('saved.deleteSelectedMessage', { count: ids.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            ids.forEach(id => remove(id));
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }, [remove, selectedIds, t]);

  // Recent calculations live on their own page now; surface a link at the bottom
  // of the list (and a clock action in the header) rather than the full list here.
  const recentFooter = hasRecent ? (
    <TouchableOpacity
      style={styles.recentLink}
      onPress={openRecentCalculations}
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={t('recent.title')}
    >
      <ClockIcon size={20} color={colours.primary} strokeWidth={1.9} />
      <View style={styles.recentLinkCopy}>
        <AppText variant="labelMd">{t('recent.title')}</AppText>
        <AppText variant="bodySm" tone="muted">{t('recent.intro')}</AppText>
      </View>
      <ChevronRightIcon size={18} color={colours.textSecondary} />
    </TouchableOpacity>
  ) : null;

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t('saved.title')}
        variant="top-level"
        leftAction={openedFromDashboard ? (
          <HeaderBackAction onPress={() => router.replace('/')} />
        ) : undefined}
        rightAction={hasRecent ? (
          <HeaderIconButton onPress={openRecentCalculations} accessibilityLabel={t('recent.title')}>
            <ClockIcon size={22} color={colours.primary} strokeWidth={1.9} />
          </HeaderIconButton>
        ) : undefined}
      />
      <FlatList
        style={styles.flatList}
        data={visibleLoans}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, selectionMode && styles.listWithActionBar]}
        ListEmptyComponent={
          loans.length === 0 ? (
            <EmptyState title={t('saved.empty')} subtitle={t('saved.emptySubtitle')} />
          ) : (
            <EmptyState title={t('saved.noMatches')} />
          )
        }
        ListHeaderComponent={(
          <View style={styles.headerAction}>
            {selectionMode ? (
              <View style={styles.selectionBar}>
                <AppText variant="labelMd">
                  {t('saved.selectedCount', { count: selectedIds.size })}
                </AppText>
                <Button
                  label={allSelected ? t('saved.deselectAll') : t('saved.selectAll')}
                  onPress={toggleSelectAll}
                  variant="ghost"
                  style={styles.selectionAction}
                />
              </View>
            ) : (
              <>
                <AppText variant="bodyLg" tone="muted" style={styles.intro}>
                  {t('saved.intro')}
                </AppText>
                <View style={styles.headerButtons}>
                  <Button
                    label={t('saved.createNewCalculation')}
                    onPress={() => router.push('/calculate' as never)}
                    variant="secondary"
                    style={styles.headerButton}
                  />
                </View>
                {loans.length > 0 ? (
                  <View style={styles.controls}>
                    <InputSurface>
                      <SearchIcon size={18} color={colours.textSecondary} strokeWidth={1.9} />
                      <AppTextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder={t('saved.searchPlaceholder')}
                        returnKeyType="search"
                        style={styles.searchInput}
                      />
                    </InputSurface>
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <LoanProfileCard
            loan={item}
            onPress={() => router.push(
              item.status === 'draft' ? `/saved/track?id=${item.id}` : `/saved/${item.id}`,
            )}
            onTogglePinned={() => togglePinned(item.id)}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
            onLongPress={() => startSelection(item.id)}
            onToggleSelected={() => toggleSelected(item.id)}
          />
        )}
        ListFooterComponent={selectionMode ? null : recentFooter}
      />
      {selectionMode ? (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            label={t('common.cancel')}
            onPress={clearSelection}
            variant="secondary"
            style={styles.actionBarButton}
          />
          <Button
            label={t('common.delete')}
            onPress={deleteSelected}
            variant="destructive"
            leftIcon={<TrashIcon size={18} color={colours.white} strokeWidth={1.9} />}
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
  list: {
    padding: layout.screenPadding,
    flexGrow: 1,
  },
  listWithActionBar: { paddingBottom: 96 },
  headerAction: {
    marginBottom: spacing.md,
  },
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
  intro: {
    marginBottom: spacing.md,
  },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  headerButton: {
    flexGrow: 1,
    flexBasis: '100%',
  },
  controls: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  searchInput: {
    marginLeft: spacing.xs,
  },
  recentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: layout.cardPadding,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  recentLinkCopy: {
    flex: 1,
    gap: spacing.xxxs,
  },
});
