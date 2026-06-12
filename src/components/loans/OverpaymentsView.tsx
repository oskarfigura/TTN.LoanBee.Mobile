import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { savedLoansStorage } from '@/storage/savedLoans';
import { formatCurrency } from '@/currency/format';
import { OverpaymentImpact, OverpaymentScope } from '@/loans/overpaymentScope';
import { formatOverpaymentDuration, ImpactRow } from '@/components/loans/OverpaymentSheetPrimitives';
import { MonthlyOverpaymentSheet } from '@/components/loans/MonthlyOverpaymentSheet';
import { LumpSumSheet } from '@/components/loans/LumpSumSheet';
import { ChartHelpButton, ChartHelpDrawer } from '@/components/charts/ChartHelp';
import { OverpaymentsComparisonChart } from '@/components/charts/OverpaymentsComparisonChart';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Icon, IconName } from '@/components/ui/Icon';
import { MortgageEvent, SavedLoan } from '@/types/SavedLoan';
import { formatFriendlyDate } from '@/utils/date';
import { colours, layout, radii, spacing } from '@/theme';

const FullscreenIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 10L21 3M21 3H16.5M21 3V7.5M10 14L3 21M3 21H7.5M3 21L3 16.5"
      stroke={colours.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface Props {
  id: string;
  notFoundTitleKey: string;
  createScope: (loan: SavedLoan) => OverpaymentScope | null;
}

export const OverpaymentsView = ({ id, notFoundTitleKey, createScope }: Props) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const [monthlySheetVisible, setMonthlySheetVisible] = useState(false);
  const [lumpSumSheetVisible, setLumpSumSheetVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MortgageEvent | null>(null);
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [chartHelpVisible, setChartHelpVisible] = useState(false);

  const openFullscreen = useCallback(() => {
    setChartFullscreen(true);
    ScreenOrientation.unlockAsync().catch(() => undefined);
  }, []);

  const closeFullscreen = useCallback(() => {
    setChartFullscreen(false);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);

  useEffect(() => () => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);

  const refresh = useCallback(() => {
    setLoan(savedLoansStorage.getById(id));
  }, [id]);

  useFocusEffect(refresh);

  const scope = useMemo(() => (loan ? createScope(loan) : null), [loan, createScope]);

  const yrs = t('results.years');
  const mo = t('results.months');

  // The interest-saved label and the second metric (months saved vs extra principal
  // repaid) follow from the scope's impact `kind`, so neither the view nor the scope
  // needs to know which surface it is driving.
  const toRows = useCallback((impact: OverpaymentImpact, includeZeroSecondary: boolean): ImpactRow[] => {
    if (!scope) return [];
    const currency = scope.currency;
    const interestSavedLabel = impact.secondary.kind === 'monthsSaved'
      ? t('overpayments.interestSaved')
      : t('mortgage.dealInterestSavedLabel');
    const rows: ImpactRow[] = [
      { label: interestSavedLabel, value: formatCurrency(impact.interestSaved, currency) },
    ];
    if (impact.secondary.kind === 'monthsSaved') {
      if (impact.secondary.value > 0) {
        rows.push({ label: t('overpayments.timeSaved'), value: formatOverpaymentDuration(impact.secondary.value, yrs, mo) });
      }
    } else if (impact.secondary.value > 0 || includeZeroSecondary) {
      rows.push({ label: t('mortgage.dealExtraRepaidLabel'), value: formatCurrency(impact.secondary.value, currency) });
    }
    return rows;
  }, [scope, t, yrs, mo]);

  // Sheet previews suppress a zero/negative interest-saving entirely (matches the
  // prior screens), whereas the banner renders whatever the scope deems showable.
  const savingsRows = useCallback((impact: OverpaymentImpact | null): ImpactRow[] | null => (
    impact && impact.interestSaved > 0 ? toRows(impact, false) : null
  ), [toRows]);

  const computeMonthlyImpactRows = useCallback((amount: number): ImpactRow[] | null => (
    scope ? savingsRows(scope.computeMonthlyImpact(amount)) : null
  ), [scope, savingsRows]);

  const computeLumpImpactRows = useCallback((amount: number, date: string): ImpactRow[] | null => (
    scope ? savingsRows(scope.computeLumpImpact(amount, date, editingEvent?.id)) : null
  ), [scope, savingsRows, editingEvent]);

  const handleSaveMonthly = useCallback((amount: number) => {
    if (!scope) return;
    savedLoansStorage.update(scope.applySaveMonthly(amount));
    setMonthlySheetVisible(false);
    refresh();
  }, [scope, refresh]);

  const handleRemoveMonthly = useCallback(() => {
    if (!scope) return;
    savedLoansStorage.update(scope.applyRemoveMonthly());
    setMonthlySheetVisible(false);
    refresh();
  }, [scope, refresh]);

  const handleSaveLump = useCallback((date: string, amount: number) => {
    if (!scope) return;
    savedLoansStorage.update(scope.applySaveLump(date, amount, editingEvent));
    setLumpSumSheetVisible(false);
    setEditingEvent(null);
    refresh();
  }, [scope, editingEvent, refresh]);

  const handleDeleteLump = useCallback((eventId: string) => {
    if (!scope) return;
    savedLoansStorage.update(scope.applyDeleteLump(eventId));
    setLumpSumSheetVisible(false);
    setEditingEvent(null);
    refresh();
  }, [scope, refresh]);

  const openAddLumpSum = () => {
    setEditingEvent(null);
    setLumpSumSheetVisible(true);
  };

  const openEditLumpSum = (event: MortgageEvent) => {
    setEditingEvent(event);
    setLumpSumSheetVisible(true);
  };

  if (!scope) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t(notFoundTitleKey)}
          variant="editor"
          leftAction={<HeaderBackAction onPress={() => router.back()} />}
        />
        <View style={styles.centred}>
          <AppText variant="title3">{t('saved.notFound')}</AppText>
          <Button label={t('common.goBack')} onPress={() => router.back()} style={styles.notFoundBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const { labels, currency, monthlyAmount, lumpEvents, bannerImpact, chartData } = scope;
  const bannerRows = bannerImpact ? toRows(bannerImpact, true) : null;
  const balanceChartHelp = {
    title: t('chartHelp.balanceComparisonTitle'),
    body: t('chartHelp.balanceComparisonBody'),
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t(labels.titleKey)}
        subtitle={labels.subtitle}
        subtitleVariant={labels.subtitle ? 'context' : undefined}
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Impact banner */}
        {bannerRows ? (
          <Card style={styles.impactCard} variant="status">
            <View style={styles.impactInner}>
              <Icon icon={IconName.CoinsStackedIcon} size={20} color={colours.secondary} strokeWidth={1.8} />
              <View style={styles.impactText}>
                {bannerRows.map((row, index) => (
                  <AppText
                    key={row.label}
                    variant={index === 0 ? 'labelMd' : 'bodySm'}
                    tone={index === 0 ? 'success' : 'muted'}
                  >
                    {row.label}: {row.value}
                  </AppText>
                ))}
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.emptyImpact}>
            <AppText variant="bodySm" tone="muted" style={styles.centredText}>
              {t('overpayments.noImpact')}
            </AppText>
          </View>
        )}

        {/* Monthly overpayment */}
        <View style={styles.section}>
          <AppText variant="title3">{t(labels.monthlySectionKey)}</AppText>
          {monthlyAmount > 0 ? (
            <TouchableOpacity style={styles.rowCard} onPress={() => setMonthlySheetVisible(true)} activeOpacity={0.75}>
              <View style={styles.rowMain}>
                <AppText variant="labelMd">
                  {formatCurrency(monthlyAmount, currency)} / {mo}
                </AppText>
              </View>
              <AppText variant="labelSm" tone="muted">{t(labels.monthlyEditKey)}</AppText>
            </TouchableOpacity>
          ) : (
            <Button
              label={t('overpayments.monthlyNotSet')}
              onPress={() => setMonthlySheetVisible(true)}
              variant="secondary"
            />
          )}
        </View>

        {/* Lump-sum payments */}
        <View style={styles.section}>
          <AppText variant="title3">{t(labels.lumpSectionKey)}</AppText>
          {lumpEvents.length === 0 ? (
            <View style={styles.emptyLumpSums}>
              <AppText variant="bodySm" tone="muted" style={styles.centredText}>
                {t(labels.lumpEmptyKey)}
              </AppText>
            </View>
          ) : (
            <Card style={styles.lumpSumList}>
              {lumpEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <TouchableOpacity
                    style={styles.lumpSumRow}
                    onPress={() => openEditLumpSum(event)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.lumpSumMain}>
                      <AppText variant="labelMd">{formatCurrency(event.amount ?? 0, currency)}</AppText>
                      <AppText variant="bodySm" tone="muted">
                        {formatFriendlyDate(event.date, i18n.language)}
                      </AppText>
                    </View>
                    <Icon icon={IconName.ChevronRightIcon} size={16} color={colours.textSecondary} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          )}
          <Button
            label={t('overpayments.lumpSumAdd')}
            onPress={openAddLumpSum}
            variant="secondary"
            leftIcon={<Icon icon={IconName.PlusIcon} size={16} color={colours.primary} />}
          />
        </View>

        {/* Balance comparison chart */}
        {chartData ? (
          <Pressable
            onPress={openFullscreen}
            accessibilityRole="button"
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard} padding={0}>
              <View style={styles.chartHeader}>
                <AppText variant="title3" style={styles.previewTitle}>{t('overpayments.balanceChart')}</AppText>
                <View style={styles.chartActions}>
                  <ChartHelpButton
                    accessibilityLabel={t('chartHelp.open', { title: t('overpayments.balanceChart') })}
                    onPress={() => setChartHelpVisible(true)}
                  />
                  <View style={styles.fullscreenButton}>
                    <FullscreenIcon />
                  </View>
                </View>
              </View>
              <View style={styles.chartBody}>
                <OverpaymentsComparisonChart
                  baselineRemaining={chartData.baselineRemaining}
                  scenarioRemaining={chartData.scenarioRemaining}
                  currency={currency}
                />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* Date guidance note (deal scope only) */}
        {labels.dateNoteKey ? (
          <View style={styles.dateNoteCard}>
            <Icon icon={IconName.InfoCircleIcon} size={16} color={colours.textSecondary} strokeWidth={1.8} />
            <AppText variant="bodySm" tone="muted" style={styles.dateNoteText}>
              {t(labels.dateNoteKey)}
            </AppText>
          </View>
        ) : null}

      </ScrollView>

      <MonthlyOverpaymentSheet
        visible={monthlySheetVisible}
        current={monthlyAmount}
        title={t(labels.monthlySectionKey)}
        currencySymbol={labels.monthlyCurrencySymbol}
        placeholder={labels.monthlyPlaceholder}
        computeImpactRows={computeMonthlyImpactRows}
        onSave={handleSaveMonthly}
        onRemove={handleRemoveMonthly}
        onClose={() => setMonthlySheetVisible(false)}
      />

      <LumpSumSheet
        visible={lumpSumSheetVisible}
        event={editingEvent}
        minDate={scope.minDate}
        maxDate={scope.maxDate}
        placeholder={labels.lumpPlaceholder}
        computeImpactRows={computeLumpImpactRows}
        onSave={handleSaveLump}
        onDelete={handleDeleteLump}
        onClose={() => {
          setLumpSumSheetVisible(false);
          setEditingEvent(null);
        }}
      />

      <Modal
        visible={chartFullscreen}
        animationType="slide"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={closeFullscreen}
      >
        <SafeAreaView style={styles.fullscreenSafe} edges={['top', 'bottom']}>
          <View style={styles.fullscreenHeader}>
            <AppText variant="title3" style={styles.previewTitle}>{t('overpayments.balanceChart')}</AppText>
            <ChartHelpButton
              accessibilityLabel={t('chartHelp.open', { title: t('overpayments.balanceChart') })}
              onPress={() => setChartHelpVisible(true)}
            />
            <TouchableOpacity style={styles.closeButton} onPress={closeFullscreen} activeOpacity={0.8}>
              <AppText variant="labelSm" tone="accent" style={styles.actionButtonText}>{t('common.close')}</AppText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.fullscreenBody} contentContainerStyle={styles.fullscreenContent}>
            {chartData ? (
              <OverpaymentsComparisonChart
                baselineRemaining={chartData.baselineRemaining}
                scenarioRemaining={chartData.scenarioRemaining}
                currency={currency}
                height={320}
              />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <ChartHelpDrawer
        visible={chartHelpVisible}
        content={balanceChartHelp}
        closeLabel={t('common.close')}
        onClose={() => setChartHelpVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: {
    padding: layout.screenPadding,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundBtn: { marginTop: spacing.md },
  impactCard: { padding: spacing.md },
  impactInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  impactText: { flex: 1, gap: spacing.xxs },
  emptyImpact: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
  },
  centredText: { textAlign: 'center' },
  section: { gap: spacing.sm },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surfaceMuted,
    borderWidth: 1,
    borderColor: colours.surfaceStrong,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  emptyLumpSums: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
  },
  lumpSumList: { padding: 0, overflow: 'hidden' },
  lumpSumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  lumpSumMain: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: colours.border, marginHorizontal: spacing.md },
  dateNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  dateNoteText: { flex: 1, lineHeight: 18 },
  chartCard: { overflow: 'hidden' },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chartBody: { padding: spacing.md, paddingBottom: spacing.sm },
  previewPressed: { opacity: 0.84 },
  previewTitle: { flex: 1 },
  chartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fullscreenButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.white,
    borderWidth: 1,
    borderColor: colours.border,
  },
  actionButtonText: { textTransform: 'uppercase' },
  fullscreenSafe: { flex: 1, backgroundColor: colours.background },
  fullscreenHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.background,
  },
  closeButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.button,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  fullscreenBody: { flex: 1 },
  fullscreenContent: { padding: layout.screenPadding, paddingBottom: spacing['2xl'] },
});
