import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { LoanProfileCard } from '@/components/loans/LoanProfileCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { colours } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { loans, remove, togglePinned } = useSavedLoans();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={t('saved.title')} />
      <FlatList
        data={loans}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title={t('saved.empty')} subtitle={t('saved.emptySubtitle')} />
        }
        ListHeaderComponent={(
          <View style={styles.headerAction}>
            <Button
              label={t('saved.createNewCalculation')}
              onPress={() => router.push({
                pathname: '/' as never,
                params: { calculator: '1' },
              })}
              variant="secondary"
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
    padding: 16,
    flexGrow: 1,
  },
  headerAction: {
    marginBottom: 12,
  },
});
