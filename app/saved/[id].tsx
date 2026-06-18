import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { LoanCalculationView } from '@/features/calculator/components/LoanCalculationView';
import { LoanSummaryPanel } from '@/features/calculator/components/LoanSummaryPanel';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { Button, ButtonVariant } from '@oskarfigura/ui-native';
import { AppText } from '@oskarfigura/ui-native';
import { DestructiveConfirmDialog } from '@/shared/ui/components/DestructiveConfirmDialog';
import { QuickActionTile } from '@oskarfigura/ui-native';
import { AppTextInput, FieldLabel, InputSurface } from '@oskarfigura/ui-native';
import { colours, fontFaces, fontSizes, layout, radii, spacing } from '@/shared/ui/theme';
import { getResultForSavedLoan, getBaselineResultForSavedLoan } from '@/shared/domain/results/loanResultRoute';
import { shareCalculation } from '@/features/sharing/shareCalculation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MortgageDetailView } from '@/features/tracker/components/detail/MortgageDetailView';
import { HeaderBackAction } from '@/shared/ui/components/HeaderBackAction';
import { HeaderIconButton } from '@oskarfigura/ui-native';
import { ScreenHeader } from '@/shared/ui/components/ScreenHeader';
import { getCurrentDeal } from '@/shared/domain/mortgage/tracker';

export default function LoanDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, fromSave } = useLocalSearchParams<{ id: string; fromSave?: string }>();
  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const [mortgageMenuVisible, setMortgageMenuVisible] = useState(false);
  const [loanMenuVisible, setLoanMenuVisible] = useState(false);
  const [loanMoreDrawerVisible, setLoanMoreDrawerVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
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
  // Baseline remaining-balance series for the with/without overpayment comparison chart,
  // only when the loan carries a recurring overpayment (non-mortgage detail uses the calc view).
  const baselineRemainingArray = useMemo(() => (
    loan && (loan.formSnapshot.additionalMonthlyPayment ?? 0) > 0
      ? getBaselineResultForSavedLoan(loan).loanChartRemainingArray
      : undefined
  ), [loan]);
  const currentDeal = useMemo(() => (
    loan?.category === 'mortgage' ? getCurrentDeal(loan) : undefined
  ), [loan]);

  const handleDelete = useCallback(() => {
    if (!loan) return;
    setMortgageMenuVisible(false);
    setLoanMenuVisible(false);
    setDeleteDialogVisible(true);
    setLoanMoreDrawerVisible(false);
  }, [loan]);

  const confirmDelete = useCallback(() => {
    if (!loan) return;
    setDeleteDialogVisible(false);
    savedLoansStorage.remove(loan.id);
    router.replace('/saved');
  }, [loan, router]);

  const openRenameModal = useCallback(() => {
    if (!loan) return;
    setMortgageMenuVisible(false);
    setLoanMenuVisible(false);
    setLoanMoreDrawerVisible(false);
    setRenameValue(loan.nickname);
    setRenameModalVisible(true);
  }, [loan]);

  const handleShare = useCallback(async () => {
    if (!loan || !result) return;

    setMortgageMenuVisible(false);
    setLoanMenuVisible(false);
    setLoanMoreDrawerVisible(false);
    await shareCalculation({
      result,
      formValues: loan.formSnapshot,
      currency: loan.currency,
      category: loan.category,
      t,
    });
  }, [loan, result, t]);

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

  const loanQuickActions = (
    <View style={styles.loanQuickActionsCard}>
      <View style={styles.quickActionsHeader}>
        <Text style={styles.quickActionsTitle}>{t('loan.quickActions')}</Text>
        <Text style={styles.quickActionsHelper}>{t('loan.quickActionsHelp')}</Text>
      </View>
      <View style={styles.loanQuickActionsRow}>
        <QuickActionTile
          label={t('share.short')}
          icon={<Icon icon={IconName.ShareIcon} size={21} color={colours.primary} strokeWidth={1.9} />}
          onPress={handleShare}
        />
        <QuickActionTile
          label={t('saved.edit')}
          icon={<Icon icon={IconName.EditIcon} size={21} color={colours.primary} strokeWidth={1.9} />}
          onPress={() => router.push(`/saved/${id}/edit`)}
        />
        <QuickActionTile
          label={t('common.more')}
          icon={<Icon icon={IconName.MoreIcon} size={21} color={colours.primary} strokeWidth={3} />}
          onPress={() => setLoanMoreDrawerVisible(true)}
        />
      </View>
    </View>
  );

  const renameModal = (
    <Modal
      visible={renameModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setRenameModalVisible(false)}
    >
      <Pressable style={styles.modalScrim} onPress={() => setRenameModalVisible(false)}>
        <Pressable style={styles.renameDialog}>
          <AppText variant="title2">
            {loan.category === 'mortgage' ? t('mortgage.renameMortgage') : t('loan.renameLoan')}
          </AppText>
          <AppText variant="bodySm" tone="muted" style={styles.renameHelp}>
            {loan.category === 'mortgage' ? t('mortgage.renameMortgageHelp') : t('loan.renameLoanHelp')}
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
              variant={ButtonVariant.Ghost}
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
  );

  if (loan.category === 'mortgage') {
    const mortgageHeaderMenu = (
      <HeaderIconButton
        onPress={() => setMortgageMenuVisible(true)}
        accessibilityLabel={t('mortgage.mortgageActions')}
      >
        <Icon icon={IconName.MoreIcon} color={colours.primary} size={22} strokeWidth={3} />
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
        <DestructiveConfirmDialog
          visible={deleteDialogVisible}
          title={t('mortgage.deleteMortgage')}
          message={loan.nickname}
          confirmLabel={t('mortgage.deleteMortgage')}
          cancelLabel={t('save.cancel')}
          onCancel={() => setDeleteDialogVisible(false)}
          onConfirm={confirmDelete}
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
                      onPress={() => navigateFromMortgageMenu(`/saved/${loan.id}/deals/${currentDeal.id}/overpayments`)}
                      activeOpacity={0.84}
                    >
                      <Text style={styles.actionMenuText}>{t('mortgage.addOverpaymentToCurrentDeal')}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity
                  style={styles.actionMenuRow}
                  onPress={() => navigateFromMortgageMenu(`/saved/${loan.id}/edit`)}
                  activeOpacity={0.84}
                >
                  <Text style={styles.actionMenuText}>{t('mortgage.manageDetails')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuRow} onPress={handleShare} activeOpacity={0.84}>
                  <Text style={styles.actionMenuText}>{t('share.short')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuRow} onPress={openRenameModal} activeOpacity={0.84}>
                  <Text style={styles.actionMenuText}>{t('mortgage.renameMortgage')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuRowLast} onPress={handleDelete} activeOpacity={0.84}>
                  <Text style={[styles.actionMenuText, styles.actionMenuDanger]}>{t('mortgage.deleteMortgage')}</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
        </Modal>
        {renameModal}
      </SafeAreaView>
    );
  }

  const loanHeaderMenu = (
    <HeaderIconButton
      onPress={() => setLoanMenuVisible(true)}
      accessibilityLabel={t('loan.loanActions')}
    >
      <Icon icon={IconName.MoreIcon} color={colours.primary} size={22} strokeWidth={3} />
    </HeaderIconButton>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('loan.summaryTitle')}
        variant="detail"
        leftAction={<HeaderBackAction onPress={handleBack} variant="circle" />}
        rightAction={loanHeaderMenu}
        showBottomBorder={false}
        backgroundColor={colours.background}
      />
      <LoanCalculationView
        result={result}
        startDate={loan.formSnapshot.startDate}
        currency={loan.currency}
        baselineRemainingArray={baselineRemainingArray}
        tabStyle="underline"
        showFinancialDisclaimer
        ownsScroll
        summaryContent={(
          <>
            <LoanSummaryPanel
              loan={loan}
              result={result}
              onTogglePinned={() => {
                savedLoansStorage.togglePinned(loan.id);
                refresh();
              }}
              onTryOverpayments={() => router.push(`/saved/${id}/overpayments`)}
            />
            {loanQuickActions}
          </>
        )}
      />
      <DestructiveConfirmDialog
        visible={deleteDialogVisible}
        title={t('loan.deleteLoan')}
        message={loan.nickname}
        confirmLabel={t('loan.deleteLoan')}
        cancelLabel={t('save.cancel')}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
      />
      <Modal
        visible={loanMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLoanMenuVisible(false)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setLoanMenuVisible(false)}>
          <Pressable style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionMenuRow}
              onPress={() => {
                setLoanMenuVisible(false);
                router.push(`/saved/${id}/edit`);
              }}
              activeOpacity={0.84}
            >
              <Text style={styles.actionMenuText}>{t('saved.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionMenuRow} onPress={handleShare} activeOpacity={0.84}>
              <Text style={styles.actionMenuText}>{t('share.short')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionMenuRow} onPress={openRenameModal} activeOpacity={0.84}>
              <Text style={styles.actionMenuText}>{t('loan.renameLoan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionMenuRowLast} onPress={handleDelete} activeOpacity={0.84}>
              <Text style={[styles.actionMenuText, styles.actionMenuDanger]}>{t('loan.deleteLoan')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={loanMoreDrawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLoanMoreDrawerVisible(false)}
      >
        <Pressable style={styles.drawerScrim} onPress={() => setLoanMoreDrawerVisible(false)}>
          <Pressable style={styles.drawer}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>{t('common.more')}</Text>
              <TouchableOpacity onPress={() => setLoanMoreDrawerVisible(false)} activeOpacity={0.84}>
                <Text style={styles.drawerCloseText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.drawerOptionRow} onPress={handleShare} activeOpacity={0.84}>
              <View style={styles.drawerOptionIcon}>
                <Icon icon={IconName.ShareIcon} size={20} color={colours.primary} strokeWidth={1.9} />
              </View>
              <View style={styles.drawerOptionCopy}>
                <Text style={styles.drawerOptionTitle}>{t('share.short')}</Text>
                <Text style={styles.drawerOptionDescription}>{t('share.button')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerOptionRow} onPress={openRenameModal} activeOpacity={0.84}>
              <View style={styles.drawerOptionIcon}>
                <Icon icon={IconName.EditIcon} size={20} color={colours.primary} strokeWidth={1.9} />
              </View>
              <View style={styles.drawerOptionCopy}>
                <Text style={styles.drawerOptionTitle}>{t('loan.renameLoan')}</Text>
                <Text style={styles.drawerOptionDescription}>{t('loan.renameLoanHelp')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerOptionRow} onPress={handleDelete} activeOpacity={0.84}>
              <View style={[styles.drawerOptionIcon, styles.drawerOptionIconDanger]}>
                <Icon icon={IconName.TrashIcon} size={20} color={colours.error} strokeWidth={1.9} />
              </View>
              <View style={styles.drawerOptionCopy}>
                <Text style={[styles.drawerOptionTitle, styles.drawerOptionTitleDanger]}>{t('loan.deleteLoan')}</Text>
                <Text style={[styles.drawerOptionDescription, styles.drawerOptionTitleDanger]}>{t('loan.deleteLoanHelp')}</Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      {renameModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { ...fontFaces.heading.semibold, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  loanQuickActionsCard: {
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    borderRadius: radii.card,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  quickActionsHeader: {
    gap: spacing.xxxs,
  },
  quickActionsTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  quickActionsHelper: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 17,
    color: colours.textSecondary,
  },
  loanQuickActionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
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
  drawerScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colours.modalScrim,
  },
  drawer: {
    maxHeight: '84%',
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colours.borderSoft,
    marginBottom: spacing.md,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  drawerTitle: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.lg,
    color: colours.primary,
  },
  drawerCloseText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  drawerOptionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: colours.border,
    paddingVertical: spacing.sm,
  },
  drawerOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.surfaceAccent,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  drawerOptionIconDanger: {
    backgroundColor: colours.errorSurface,
  },
  drawerOptionCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  drawerOptionTitle: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  drawerOptionTitleDanger: {
    color: colours.error,
  },
  drawerOptionDescription: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    lineHeight: 17,
    color: colours.textSecondary,
  },
});
