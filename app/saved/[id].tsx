import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanCalculationView } from '@/components/calculator/LoanCalculationView';
import { LoanSummaryOverview } from '@/components/calculator/LoanSummaryOverview';
import { MoreIcon } from '@/components/loans/LoanIcons';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput, FieldLabel, InputSurface } from '@/components/ui/FormPrimitives';
import { colours, fontFaces, fontSizes, layout, radii, spacing } from '@/theme';
import { getResultForSavedLoan } from '@/results/loanResultRoute';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MortgageDetailView } from '@/components/loans/MortgageDetailView';
import { DashboardPinButton } from '@/components/loans/DashboardPinButton';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getCurrentDeal } from '@/mortgage/tracker';

export default function LoanDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, fromSave } = useLocalSearchParams<{ id: string; fromSave?: string }>();
  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const [mortgageMenuVisible, setMortgageMenuVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState(loan?.nickname ?? '');
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
  const currentDeal = useMemo(() => (
    loan?.category === 'mortgage' ? getCurrentDeal(loan) : undefined
  ), [loan]);

  const handleDelete = useCallback(() => {
    if (!loan) return;
    setMortgageMenuVisible(false);

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

  const openRenameModal = useCallback(() => {
    if (!loan) return;
    setMortgageMenuVisible(false);
    setRenameValue(loan.nickname);
    setRenameModalVisible(true);
  }, [loan]);

  const navigateFromMortgageMenu = useCallback((href: string) => {
    setMortgageMenuVisible(false);
    router.push(href as Parameters<typeof router.push>[0]);
  }, [router]);

  const handleRename = useCallback(() => {
    if (!loan) return;
    const nickname = renameValue.trim();
    if (!nickname) return;

    savedLoansStorage.update({
      ...loan,
      nickname,
      updatedAt: new Date().toISOString(),
    });
    setRenameModalVisible(false);
    refresh();
  }, [loan, refresh, renameValue]);

  if (!loan || !result) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('saved.loanDetail')}
          variant="detail"
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
    const mortgageHeaderMenu = (
      <HeaderIconButton
        onPress={() => setMortgageMenuVisible(true)}
        accessibilityLabel={t('mortgage.mortgageActions')}
      >
        <MoreIcon color={colours.primary} size={22} />
      </HeaderIconButton>
    );

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.summaryTitle')}
          variant="detail"
          leftAction={<HeaderBackAction onPress={handleBack} variant="circle" />}
          rightAction={mortgageHeaderMenu}
          showBottomBorder={false}
          backgroundColor={colours.background}
        />
        <MortgageDetailView
          loan={loan}
          onTogglePinned={() => {
            savedLoansStorage.togglePinned(loan.id);
            refresh();
          }}
          onLoanUpdated={refresh}
        />
        <Modal
          visible={mortgageMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMortgageMenuVisible(false)}
        >
            <Pressable style={styles.modalScrim} onPress={() => setMortgageMenuVisible(false)}>
              <Pressable style={styles.actionMenu}>
                {currentDeal ? (
                  <>
                    <TouchableOpacity
                      style={styles.actionMenuRow}
                      onPress={() => navigateFromMortgageMenu(`/saved/${loan.id}/deals/${currentDeal.id}`)}
                      activeOpacity={0.84}
                    >
                      <Text style={styles.actionMenuText}>{t('mortgage.reviewCurrentDeal')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionMenuRow}
                      onPress={() => navigateFromMortgageMenu(`/saved/${loan.id}/events/new?type=lumpOverpayment`)}
                      activeOpacity={0.84}
                    >
                      <Text style={styles.actionMenuText}>{t('mortgage.addOverpaymentToCurrentDeal')}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity style={styles.actionMenuRow} onPress={openRenameModal} activeOpacity={0.84}>
                  <Text style={styles.actionMenuText}>{t('mortgage.renameMortgage')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuRowLast} onPress={handleDelete} activeOpacity={0.84}>
                  <Text style={[styles.actionMenuText, styles.actionMenuDanger]}>{t('mortgage.deleteMortgage')}</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
        </Modal>
        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameModalVisible(false)}
        >
          <Pressable style={styles.modalScrim} onPress={() => setRenameModalVisible(false)}>
            <Pressable style={styles.renameDialog}>
              <AppText variant="title2">{t('mortgage.renameMortgage')}</AppText>
              <AppText variant="bodySm" tone="muted" style={styles.renameHelp}>
                {t('mortgage.renameMortgageHelp')}
              </AppText>
              <View style={styles.renameField}>
                <FieldLabel>{t('save.nickname')}</FieldLabel>
                <InputSurface>
                  <AppTextInput
                    value={renameValue}
                    onChangeText={setRenameValue}
                    placeholder={t('save.nicknamePlaceholder')}
                    autoFocus
                  />
                </InputSurface>
              </View>
              <View style={styles.renameActions}>
                <Button
                  label={t('save.cancel')}
                  onPress={() => setRenameModalVisible(false)}
                  variant="ghost"
                  style={styles.renameAction}
                />
                <Button
                  label={t('edit.save')}
                  onPress={handleRename}
                  disabled={!renameValue.trim()}
                  style={styles.renameAction}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('saved.loanDetail')}
        variant="detail"
        leftAction={<HeaderBackAction onPress={handleBack} variant="circle" />}
        showBottomBorder={false}
        backgroundColor={colours.background}
      />
      <LoanCalculationView
        result={result}
        startDate={loan.formSnapshot.startDate}
        currency={loan.currency}
        tabStyle="underline"
        showFinancialDisclaimer
        ownsScroll
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { ...fontFaces.heading.semibold, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  pinButton: {
    marginBottom: 0,
    marginTop: 4,
  },
  detailActions: {
    marginTop: 8,
    gap: spacing.sm,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: colours.modalScrim,
    paddingHorizontal: layout.screenPadding,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 92,
  },
  actionMenu: {
    width: 232,
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    overflow: 'hidden',
  },
  actionMenuRow: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  actionMenuRowLast: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionMenuText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.md,
    color: colours.textPrimary,
  },
  actionMenuDanger: {
    color: colours.error,
  },
  renameDialog: {
    alignSelf: 'stretch',
    marginTop: 96,
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    padding: spacing.lg,
  },
  renameHelp: {
    marginTop: spacing.xs,
  },
  renameField: {
    marginTop: spacing.md,
  },
  renameActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  renameAction: {
    flex: 1,
  },
});
