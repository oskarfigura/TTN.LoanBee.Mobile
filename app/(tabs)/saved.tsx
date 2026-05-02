import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { LoanProfileCard } from '@/components/loans/LoanProfileCard';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { colours, layout, spacing } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { loans, remove, togglePinned } = useSavedLoans();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={t('saved.title')} variant="top-level" />
      <FlatList
        data={loans}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title={t('saved.empty')} subtitle={t('saved.emptySubtitle')} />
        }
        ListHeaderComponent={(
          <View style={styles.headerAction}>
            <AppText variant="bodyLg" tone="muted" style={styles.intro}>
              Save calculations, keep a clean portfolio view, and pin the items that belong on your home dashboard.
            </AppText>
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
        )}
        renderItem={({ item }) => (
          <LoanProfileCard
            loan={item}
            onPress={() => router.push(`/saved/${item.id}`)}
            onDelete={() => remove(item.id)}
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
  headerButton: {
    alignSelf: 'flex-start',
  },
});
