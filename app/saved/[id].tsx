import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanCalculationView } from '@/components/calculator/LoanCalculationView';
import { LoanSummaryOverview } from '@/components/calculator/LoanSummaryOverview';
import { Button } from '@/components/ui/Button';
import { colours, fonts, fontSizes, layout, spacing } from '@/theme';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MortgageGroupDetail } from '@/components/loans/MortgageGroupDetail';
import { DashboardPinButton } from '@/components/loans/DashboardPinButton';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function LoanDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, fromSave } = useLocalSearchParams<{ id: string; fromSave?: string }>();
  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const allowSavedBackRef = useRef(false);

  const refresh = useCallback(() => {
    setLoan(savedLoansStorage.getById(id));
  }, [id]);

  useFocusEffect(refresh);

  const handleBack = useCallback(() => {
    if (fromSave !== '1') {
      router.back();
      return;
    }

    allowSavedBackRef.current = true;
    router.replace('/saved');
    setTimeout(() => {
      allowSavedBackRef.current = false;
    }, 0);
  }, [fromSave, router]);

  useEffect(() => {
    if (fromSave !== '1') return undefined;

    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (allowSavedBackRef.current) return;
      event.preventDefault();
      handleBack();
    });

    return unsubscribe;
  }, [fromSave, handleBack, navigation]);

  const result = useMemo(() => {
    if (!loan) return null;
    return getResultForSavedLoan(loan);
  }, [loan]);

  const handleDelete = useCallback(() => {
    if (!loan) return;

    Alert.alert(
      t('saved.delete'),
      loan.nickname,
      [
        { text: t('save.cancel'), style: 'cancel' },
        {
          text: t('saved.delete'),
          style: 'destructive',
          onPress: () => {
            savedLoansStorage.remove(loan.id);
            router.replace('/saved');
          },
        },
      ],
    );
  }, [loan, router, t]);

  if (!loan || !result) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('saved.loanDetail')}
          leftAction={<HeaderBackAction onPress={handleBack} />}
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('saved.notFound')}</Text>
          <Button label={t('common.goBack')} onPress={handleBack} />
        </View>
      </SafeAreaView>
    );
  }

  const manageButton = (
    <View style={styles.detailActions}>
      <Button
        label={t('edit.manageShort')}
        onPress={() => router.push(`/saved/${id}/edit`)}
        variant="secondary"
      />
      <Button
        label={t('saved.delete')}
        onPress={handleDelete}
        variant="destructive"
      />
    </View>
  );

  if (loan.category === 'mortgage') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('saved.loanDetail')}
          leftAction={<HeaderBackAction onPress={handleBack} variant="circle" />}
          showBottomBorder={false}
          backgroundColor={colours.background}
          titleAlign="center"
        />
        <ScrollView contentContainerStyle={styles.container}>
          <LoanCalculationView
            result={result}
            startDate={loan.formSnapshot.startDate}
            currency={loan.currency}
            tabStyle="underline"
            showFinancialDisclaimer
            summaryContent={(
              <>
                <MortgageGroupDetail
                  loan={loan}
                  onTogglePinned={() => {
                    savedLoansStorage.togglePinned(loan.id);
                    refresh();
                  }}
                  onLoanUpdated={refresh}
                />
                {manageButton}
              </>
            )}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('saved.loanDetail')}
        leftAction={<HeaderBackAction onPress={handleBack} variant="circle" />}
        showBottomBorder={false}
        backgroundColor={colours.background}
        titleAlign="center"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <LoanCalculationView
          result={result}
          startDate={loan.formSnapshot.startDate}
          currency={loan.currency}
          tabStyle="underline"
          showFinancialDisclaimer
          summaryContent={(
            <>
              <LoanSummaryOverview
                result={result}
                startDate={loan.formSnapshot.startDate}
                currency={loan.currency}
                mode="saved"
                savedLoan={loan}
                title={loan.nickname}
                subtitle={loan.lender || t('saved.category.loan')}
                headerAction={(
                  <DashboardPinButton
                    pinned={loan.pinnedToDashboard}
                    onPress={() => {
                      savedLoansStorage.togglePinned(loan.id);
                      refresh();
                    }}
                    style={styles.pinButton}
                  />
                )}
              />
              {manageButton}
            </>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['3xl'],
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  pinButton: {
    marginBottom: 0,
    marginTop: 4,
  },
  detailActions: {
    marginTop: 8,
    gap: spacing.sm,
  },
});
