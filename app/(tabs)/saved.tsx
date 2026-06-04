import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { colours, layout, radii, spacing } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ fromDashboard?: string }>();
  const { loans, togglePinned, refresh } = useSavedLoans();
  const openedFromDashboard = params.fromDashboard === '1';

  const [query, setQuery] = useState('');
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

  const refreshScreen = useCallback(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(refreshScreen);

  const openRecentCalculations = useCallback(() => {
    router.push('/saved/recent');
  }, [router]);

  // Recent calculations live on their own page now; surface a link at the bottom
  // of the list (and a clock action in the header) rather than the full list here.
  const recentFooter = (
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
  );

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t('saved.title')}
        variant="top-level"
        leftAction={openedFromDashboard ? (
          <HeaderBackAction onPress={() => router.replace('/')} />
        ) : undefined}
        rightAction={(
          <HeaderIconButton onPress={openRecentCalculations} accessibilityLabel={t('recent.title')}>
            <ClockIcon size={22} color={colours.primary} strokeWidth={1.9} />
          </HeaderIconButton>
        )}
      />
      <FlatList
        data={visibleLoans}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loans.length === 0 ? (
            <EmptyState title={t('saved.empty')} subtitle={t('saved.emptySubtitle')} />
          ) : (
            <EmptyState title={t('saved.noMatches')} />
          )
        }
        ListHeaderComponent={(
          <View style={styles.headerAction}>
            <AppText variant="bodyLg" tone="muted" style={styles.intro}>
              {t('saved.intro')}
            </AppText>
            <View style={styles.headerButtons}>
              <Button
                label={t('saved.createNewCalculation')}
                onPress={() => router.push({
                  pathname: '/' as never,
                  params: { calculator: '1' },
                })}
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
          </View>
        )}
        renderItem={({ item }) => (
          <LoanProfileCard
            loan={item}
            onPress={() => router.push(
              item.status === 'draft' ? `/saved/track?id=${item.id}` : `/saved/${item.id}`,
            )}
            onTogglePinned={() => togglePinned(item.id)}
          />
        )}
        ListFooterComponent={recentFooter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  list: {
    padding: layout.screenPadding,
    flexGrow: 1,
  },
  headerAction: {
    marginBottom: spacing.md,
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
