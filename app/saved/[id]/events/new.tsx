import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MortgageEventForm, mortgageEventTypes } from '@/features/tracker/components/editing/MortgageEventForm';
import { AppText } from '@oskarfigura/ui-native';
import { Button } from '@oskarfigura/ui-native';
import { HeaderCloseAction } from '@/shared/ui/components/HeaderCloseAction';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { upsertMortgageEvent } from '@/shared/domain/mortgage/events';
import { getCurrentDeal } from '@/shared/domain/mortgage/tracker';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { MortgageEventType } from '@/shared/domain/types/SavedLoan';
import { colours, layout, spacing } from '@/shared/ui/theme';

export default function NewMortgageEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type?: MortgageEventType }>();
  const loan = savedLoansStorage.getById(id);
  const currentDeal = loan ? getCurrentDeal(loan) : undefined;
  const initialType = type && mortgageEventTypes.includes(type) ? type : undefined;

  if (!loan || !currentDeal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.addEvent')}
          variant="editor"
          leftAction={<HeaderCloseAction onPress={() => router.back()} />}
        />
        <View style={styles.notFound}>
          <AppText variant="title3" style={styles.notFoundText}>{t('mortgage.noCurrentDeal')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.addEvent')}
        subtitle={t('mortgage.eventHelp')}
        variant="editor"
        leftAction={<HeaderCloseAction onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <MortgageEventForm
            currency={loan.currency}
            currentDeal={currentDeal}
            events={loan.events}
            initialType={initialType}
            onSave={event => {
              savedLoansStorage.update(upsertMortgageEvent(loan, event));
              router.back();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  keyboardView: { flex: 1 },
  container: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] },
  notFoundText: { marginBottom: spacing.md },
});
