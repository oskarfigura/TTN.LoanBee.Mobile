import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HeaderCloseAction } from '@/components/ui/HeaderCloseAction';
import { JourneyStepDrawer } from '@/components/mortgage/JourneyStepDrawer';
import { formatCurrency } from '@/currency/format';
import {
  buildJourneySteps,
  findStep,
  firstUnansweredStep,
  getNextStep,
  getPrevStep,
} from '@/mortgage/journey/steps';
import { applyStep, publishJourneyLoan } from '@/mortgage/journey/reducers';
import { summariseDealChainChanges } from '@/mortgage/journey/chainDiff';
import { getChronologicalDeals, getLaterDealIds } from '@/mortgage/tracker';
import {
  clearJourneyCursor,
  getJourneyCursor,
  setJourneyCursor,
} from '@/mortgage/journey/journeyProgress';
import { DealChange, JourneyAnswer } from '@/mortgage/journey/types';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanGroup } from '@/types/SavedLoan';
import { colours, layout, radii, spacing } from '@/theme';

interface PendingEdit {
  nextLoan: LoanGroup;
  nextStepId: string;
  changes: DealChange[];
}

// A draft the user opened but never put anything into. Leaving these behind
// strands an "Untitled mortgage" in the saved list with no way to remove it
// (drafts reopen the journey, which is the only screen without a delete action),
// so they are cleaned up automatically on exit.
const isPristineDraft = (loan: LoanGroup): boolean =>
  loan.status === 'draft'
  && loan.nickname.trim().length === 0
  && loan.formSnapshot.loanAmount === 0
  && loan.deals.length === 0;

export default function MortgageJourneyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loan, setLoan] = useState<LoanGroup | undefined>(() => savedLoansStorage.getById(id));
  const [currentStepId, setCurrentStepId] = useState<string>(() => {
    const initial = savedLoansStorage.getById(id);
    if (!initial) return 'intro';
    const cursor = getJourneyCursor(id);
    return cursor && findStep(initial, cursor) ? cursor : firstUnansweredStep(initial).id;
  });
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  const commit = useCallback((nextLoan: LoanGroup, nextStepId: string) => {
    savedLoansStorage.update(nextLoan);
    setLoan(nextLoan);
    setCurrentStepId(nextStepId);
    setJourneyCursor(id, nextStepId);
  }, [id]);

  const removeDraft = useCallback(() => {
    savedLoansStorage.remove(id);
    clearJourneyCursor(id);
  }, [id]);

  const exitToSaved = useCallback(() => {
    if (loan && isPristineDraft(loan)) {
      removeDraft();
    }
    router.replace('/saved');
  }, [loan, removeDraft, router]);

  const handleDiscard = useCallback(() => {
    Alert.alert(
      t('journey.discardConfirm.title'),
      t('journey.discardConfirm.message'),
      [
        { text: t('journey.discardConfirm.cancel'), style: 'cancel' },
        {
          text: t('journey.discardConfirm.confirm'),
          style: 'destructive',
          onPress: () => {
            removeDraft();
            router.replace('/saved');
          },
        },
      ],
    );
  }, [removeDraft, router, t]);

  const handleContinue = useCallback((answer: JourneyAnswer) => {
    if (!loan) return;
    const step = findStep(loan, currentStepId);
    if (!step) return;

    const nextLoan = applyStep(loan, step, answer);
    // Only deals after the one being edited (the step's deal, or the first deal
    // for loan-level edits) count as a downstream cascade. Without this, editing
    // the first/only deal — which recomputes its own payment — would surface a
    // spurious "later deals updated" confirmation.
    const anchorId = step.dealId ?? getChronologicalDeals(nextLoan)[0]?.id;
    const laterIds = anchorId ? new Set(getLaterDealIds(nextLoan, anchorId)) : undefined;
    const changes = summariseDealChainChanges(loan, nextLoan, laterIds);
    const next = getNextStep(nextLoan, currentStepId);
    const nextStepId = next ? next.id : currentStepId;

    // Editing an earlier deal cascades down the chain — surface the recalculated
    // later deals for confirmation before persisting.
    if (changes.length > 0) {
      setPendingEdit({ nextLoan, nextStepId, changes });
      return;
    }
    commit(nextLoan, nextStepId);
  }, [loan, currentStepId, commit]);

  const handleBack = useCallback(() => {
    if (!loan) return;
    const prev = getPrevStep(loan, currentStepId);
    if (!prev) return;
    setCurrentStepId(prev.id);
    setJourneyCursor(id, prev.id);
  }, [loan, currentStepId, id]);

  const handlePublish = useCallback(() => {
    if (!loan) return;
    const published = publishJourneyLoan(loan);
    const withOrder: LoanGroup = published.dashboardOrder !== undefined
      ? published
      : { ...published, dashboardOrder: savedLoansStorage.getMaxDashboardOrder() + 1 };
    savedLoansStorage.update(withOrder);
    clearJourneyCursor(id);
    router.replace({ pathname: '/saved/[id]', params: { id } });
  }, [loan, id, router]);

  if (!loan) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader
          title={t('journey.title')}
          variant="editor"
          leftAction={<HeaderCloseAction onPress={exitToSaved} />}
        />
        <View style={styles.notFound}>
          <AppText variant="bodyLg" style={styles.notFoundText}>{t('saved.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={exitToSaved} />
        </View>
      </SafeAreaView>
    );
  }

  const step = findStep(loan, currentStepId) ?? firstUnansweredStep(loan);
  const canGoBack = Boolean(getPrevStep(loan, step.id));
  const reviewAvailable = buildJourneySteps(loan).some(s => s.id === 'review');
  const jumpToReview = () => {
    setCurrentStepId('review');
    setJourneyCursor(id, 'review');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <JourneyStepDrawer
        step={step}
        loan={loan}
        onBack={canGoBack ? handleBack : undefined}
        onContinue={handleContinue}
        onPublish={handlePublish}
        onSaveDraft={exitToSaved}
        onExit={exitToSaved}
        onDiscard={handleDiscard}
        onJumpToReview={reviewAvailable && step.id !== 'review' ? jumpToReview : undefined}
      />

      <Modal
        visible={pendingEdit !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingEdit(null)}
      >
        <Pressable style={styles.scrim} onPress={() => setPendingEdit(null)}>
          <Pressable style={styles.dialog}>
            <AppText variant="title3" style={styles.dialogTitle}>{t('journey.recalc.title')}</AppText>
            <AppText variant="bodySm" tone="muted" style={styles.dialogHelp}>{t('journey.recalc.help')}</AppText>
            {pendingEdit?.changes.map(change => (
              <View key={change.dealId} style={styles.changeRow}>
                <AppText variant="bodySm" style={styles.changeName}>{change.dealName}</AppText>
                <AppText variant="bodySm" tone="muted">
                  {`${formatCurrency(change.previousOpeningBalance, loan.currency)} → ${formatCurrency(change.nextOpeningBalance, loan.currency)}`}
                </AppText>
              </View>
            ))}
            <View style={styles.dialogActions}>
              <Button
                label={t('journey.recalc.cancel')}
                onPress={() => setPendingEdit(null)}
                variant="ghost"
                style={styles.dialogAction}
              />
              <Button
                label={t('journey.recalc.confirm')}
                onPress={() => {
                  if (!pendingEdit) return;
                  commit(pendingEdit.nextLoan, pendingEdit.nextStepId);
                  setPendingEdit(null);
                }}
                style={styles.dialogAction}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: spacing.md },
  notFoundText: { textAlign: 'center' },
  scrim: {
    flex: 1,
    backgroundColor: colours.modalScrim,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  dialog: {
    borderRadius: radii.card,
    backgroundColor: colours.surfaceRaised,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  dialogTitle: { color: colours.primaryInk },
  dialogHelp: { marginBottom: spacing.xs },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  changeName: { color: colours.textPrimary, flexShrink: 1 },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  dialogAction: { flex: 1 },
});
