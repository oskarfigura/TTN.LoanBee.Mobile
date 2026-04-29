import React from 'react';
import { FlatList, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSavedLoans } from '@/hooks/useSavedLoans';
import { LoanProfileCard } from '@/components/loans/LoanProfileCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { BannerAd } from '@/ads/BannerAd';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { loans, remove } = useSavedLoans();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('saved.title')}</Text>
        <BannerAd />
      </View>
      <FlatList
        data={loans}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title={t('saved.empty')} subtitle={t('saved.emptySubtitle')} />
        }
        renderItem={({ item }) => (
          <LoanProfileCard
            loan={item}
            onPress={() => router.push(`/saved/${item.id}`)}
            onDelete={() => remove(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  header: {
    backgroundColor: colours.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.white,
    marginBottom: 8,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
});
