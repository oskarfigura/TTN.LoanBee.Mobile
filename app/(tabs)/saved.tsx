import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { LoanProfileCard } from '@/components/loans/LoanProfileCard';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { AppTextInput, InputSurface } from '@/components/ui/FormPrimitives';
import { SearchIcon } from '@/components/ui/Icons/SearchIcon/SearchIcon';
import { colours, layout, spacing } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '@/storage/mmkv';
import { STORAGE_KEYS } from '@/storage/keys';
import { CurrencyCode } from '@/currency/currencies';
import { createMortgageHistoryDraft } from '@/mortgage/journey/reducers';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ fromDashboard?: string }>();
  const { loans, add, togglePinned, refresh } = useSavedLoans();
  const openedFromDashboard = params.fromDashboard === '1';

  const startMortgageHistory = () => {
    const currency = (storage.getString(STORAGE_KEYS.USER_CURRENCY) as CurrencyCode) ?? 'GBP';
    const draft = createMortgageHistoryDraft(currency);
    add(draft);
    router.push({ pathname: '/saved/[id]/journey', params: { id: draft.id } });
  };
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

  useFocusEffect(refresh);

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t('saved.title')}
        variant="top-level"
        leftAction={openedFromDashboard ? (
          <HeaderBackAction onPress={() => router.replace('/')} />
        ) : undefined}
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
              <Button
                label={t('journey.cta')}
                onPress={startMortgageHistory}
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
              item.status === 'draft' ? `/saved/${item.id}/journey` : `/saved/${item.id}`,
            )}
            onTogglePinned={() => togglePinned(item.id)}
          />
        )}
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
    flexBasis: '45%',
  },
  controls: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  searchInput: {
    marginLeft: spacing.xs,
  },
});
