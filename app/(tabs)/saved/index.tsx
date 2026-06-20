import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/shared/lib/hooks/useSavedLoans';
import { LoanProfileCard } from '@/features/tracker/components/dashboard/LoanProfileCard';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { AppText, ButtonVariant } from '@oskarfigura/ui-native';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { HeaderIconButton } from '@oskarfigura/ui-native';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { Button } from '@oskarfigura/ui-native';
import { AppTextInput, InputSurface } from '@oskarfigura/ui-native';
import { getLoanPurpose } from '@/shared/domain/loans/loanPurpose';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';
import { recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import {
  SAVED_LOAN_SORT_OPTIONS,
  SavedLoanSortOption,
  sortSavedLoans,
} from '@/shared/domain/loans/savedLoanSort';
import { savedLoanSortPreference } from '@/shared/lib/storage/savedLoanSortPreference';
import { colours, layout, radii, spacing } from '@/shared/ui/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const sortLabelKeys: Record<SavedLoanSortOption, string> = {
  recentlyAdded: 'saved.sortRecentlyAdded',
  oldestAdded: 'saved.sortOldestAdded',
  recentlyUpdated: 'saved.sortRecentlyUpdated',
  nameAscending: 'saved.sortNameAscending',
  nameDescending: 'saved.sortNameDescending',
};

export default function SavedScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ fromDashboard?: string }>();
  const { loans, togglePinned, remove, refresh } = useSavedLoans();
  const openedFromDashboard = params.fromDashboard === '1';

  const [query, setQuery] = useState('');
  const [sortOption, setSortOption] = useState<SavedLoanSortOption>(() => savedLoanSortPreference.get());
  const [sortVisible, setSortVisible] = useState(false);
  const [hasRecent, setHasRecent] = useState(() => recentCalculationsStorage.getAll().length > 0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectionMode = selectedIds.size > 0;
  const visibleLoans = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase();
    const filtered = normalisedQuery
      ? loans.filter(loan => {
        const loanPurpose = getLoanPurpose(loan);
        return [
          loan.nickname,
          loan.lender ?? '',
          t(`saved.category.${loan.category}`),
          loanPurpose ? t(`loanPurpose.${loanPurpose}`) : '',
        ].some(value => value.toLocaleLowerCase().includes(normalisedQuery));
      })
      : loans;

    return sortSavedLoans(filtered, sortOption, i18n.language);
  }, [i18n.language, loans, query, sortOption, t]);

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

  const openLoan = useCallback((loan: SavedLoan) => {
    router.push(loan.status === 'draft' ? `/saved/track?id=${loan.id}` : `/saved/${loan.id}`);
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

  const selectSortOption = useCallback((option: SavedLoanSortOption) => {
    savedLoanSortPreference.set(option);
    setSortOption(option);
    setSortVisible(false);
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

  // Stable renderItem: identity only changes when selection state changes (which
  // legitimately needs every row's `selected`/`selectionMode` to update). Crucially
  // it does NOT depend on `query`, so search keystrokes don't re-render rows — the
  // memoised LoanProfileCard skips any row whose loan reference is unchanged.
  const renderItem = useCallback<ListRenderItem<SavedLoan>>(({ item }) => (
    <LoanProfileCard
      loan={item}
      onPress={openLoan}
      onTogglePinned={togglePinned}
      selectionMode={selectionMode}
      selected={selectedIds.has(item.id)}
      onLongPress={startSelection}
      onToggleSelected={toggleSelected}
    />
  ), [openLoan, togglePinned, selectionMode, selectedIds, startSelection, toggleSelected]);

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
      <Icon icon={IconName.ClockIcon} size={20} color={colours.primary} strokeWidth={1.9} />
      <View style={styles.recentLinkCopy}>
        <AppText variant="labelMd">{t('recent.title')}</AppText>
        <AppText variant="bodySm" tone="muted">{t('recent.intro')}</AppText>
      </View>
      <Icon icon={IconName.ChevronRightIcon} size={18} color={colours.textSecondary} strokeWidth={1.8} />
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
            <Icon icon={IconName.ClockIcon} size={22} color={colours.primary} strokeWidth={1.9} />
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
                  variant={ButtonVariant.Ghost}
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
                    onPress={() => router.push({
                      pathname: '/calculate' as never,
                      params: {
                        fromTracked: '1',
                        returnTo: '/saved',
                      },
                    })}
                    variant={ButtonVariant.Secondary}
                    style={styles.headerButton}
                  />
                </View>
                {loans.length > 0 ? (
                  <View style={styles.controls}>
                    <InputSurface style={styles.searchSurface}>
                      <Icon icon={IconName.SearchIcon} size={18} color={colours.textSecondary} strokeWidth={1.9} />
                      <AppTextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder={t('saved.searchPlaceholder')}
                        returnKeyType="search"
                        style={styles.searchInput}
                      />
                      <TouchableOpacity
                        style={styles.sortButton}
                        onPress={() => setSortVisible(true)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('saved.sortLabel')}: ${t(sortLabelKeys[sortOption])}`}
                        accessibilityHint={t('saved.sortHint')}
                        accessibilityState={{ expanded: sortVisible }}
                      >
                        <Icon
                          icon={IconName.SwitchVertical01Icon}
                          size={20}
                          color={colours.primary}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </InputSurface>
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews
        ListFooterComponent={selectionMode ? null : recentFooter}
      />
      <Modal
        visible={sortVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortVisible(false)}
      >
        <Pressable style={styles.sortScrim} onPress={() => setSortVisible(false)}>
          <Pressable
            style={[styles.sortSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          >
            <View style={styles.sortHandle} />
            <AppText variant="title2" style={styles.sortTitle}>
              {t('saved.sortTitle')}
            </AppText>
            <View style={styles.sortOptions}>
              {SAVED_LOAN_SORT_OPTIONS.map(option => {
                const selected = option === sortOption;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.sortOption, selected && styles.sortOptionSelected]}
                    onPress={() => selectSortOption(option)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={t(sortLabelKeys[option])}
                  >
                    <AppText variant="bodyMd" style={styles.sortOptionLabel}>
                      {t(sortLabelKeys[option])}
                    </AppText>
                    {selected ? (
                      <Icon icon={IconName.CheckIcon} size={20} color={colours.secondary} strokeWidth={2.2} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  searchSurface: {
    paddingRight: 0,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  sortButton: {
    width: 50,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: colours.border,
    backgroundColor: colours.surfaceMuted,
  },
  sortScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colours.modalScrim,
  },
  sortSheet: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  sortHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colours.borderSoft,
  },
  sortTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sortOptions: {
    gap: spacing.xxs,
  },
  sortOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.input,
  },
  sortOptionSelected: {
    backgroundColor: colours.surfaceAccent,
  },
  sortOptionLabel: {
    flex: 1,
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
