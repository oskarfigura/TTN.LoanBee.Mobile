import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { AppTextInput, FieldLabel, InputAffix, InputSurface } from '@/components/ui/FormPrimitives';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePickerField, DatePickerFieldHandle } from '@/components/ui/DatePickerField';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ChevronRightIcon, CoinsStackedIcon, InfoCircleIcon, PlusIcon } from '@/components/ui/Icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { OverpaymentsComparisonChart } from '@/components/charts/OverpaymentsComparisonChart';
import { CURRENCIES } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { upsertMortgageEvent, removeMortgageEvent } from '@/mortgage/events';
import { buildDealBalanceArrays, getDealOverpaymentImpact, normaliseDealChain } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { LoanDeal, MortgageEvent } from '@/types/SavedLoan';
import { colours, layout, radii, spacing } from '@/theme';
import { formatFriendlyDate, formatIsoDate, parseDateLabelValue } from '@/utils/date';
import { createLocalId } from '@/utils/id';

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

export default function DealOverpaymentsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, dealId } = useLocalSearchParams<{ id: string; dealId: string }>();

  const [loan, setLoan] = useState(() => savedLoansStorage.getById(id));
  const [monthlySheetVisible, setMonthlySheetVisible] = useState(false);
  const [lumpSumSheetVisible, setLumpSumSheetVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MortgageEvent | null>(null);
  const [chartFullscreen, setChartFullscreen] = useState(false);

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

  const deal = loan?.deals.find(d => d.id === dealId);
  const currency = loan?.currency ?? 'GBP';

  const lumpSumEvents = useMemo(
    () => (loan?.events ?? [])
      .filter(e => e.type === 'lumpOverpayment' && e.dealId === dealId)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [loan?.events, dealId],
  );

  const impact = useMemo(() => {
    if (!deal || !loan) return null;
    const result = getDealOverpaymentImpact(deal, loan.events);
    return result.hasOverpayments ? result : null;
  }, [deal, loan]);

  const chartData = useMemo(() => {
    if (!impact || !deal || !loan) return null;
    const { baseline, scenario } = buildDealBalanceArrays(deal, loan.events);
    return { baselineRemaining: baseline, scenarioRemaining: scenario };
  }, [impact, deal, loan]);

  const saveMonthlyOverpayment = useCallback((amount: number) => {
    if (!loan || !deal) return;
    const updatedDeal: LoanDeal = { ...deal, regularOverpayment: amount, updatedAt: new Date().toISOString() };
    const updatedLoan = { ...loan, deals: loan.deals.map(d => d.id === deal.id ? updatedDeal : d) };
    savedLoansStorage.update(normaliseDealChain(updatedLoan, deal.id));
    setMonthlySheetVisible(false);
    refresh();
  }, [loan, deal, refresh]);

  const saveLumpSum = useCallback((date: string, amount: number) => {
    if (!loan || !deal) return;
    const now = new Date().toISOString();
    const event: MortgageEvent = editingEvent
      ? { ...editingEvent, date, amount, updatedAt: now }
      : {
        id: createLocalId('ev'),
        createdAt: now,
        updatedAt: now,
        dealId: deal.id,
        type: 'lumpOverpayment',
        date,
        amount,
      };
    savedLoansStorage.update(upsertMortgageEvent(loan, event));
    setLumpSumSheetVisible(false);
    setEditingEvent(null);
    refresh();
  }, [loan, deal, editingEvent, refresh]);

  const deleteLumpSum = useCallback((eventId: string) => {
    if (!loan) return;
    savedLoansStorage.update(removeMortgageEvent(loan, eventId));
    setLumpSumSheetVisible(false);
    setEditingEvent(null);
    refresh();
  }, [loan, refresh]);

  const openAddLumpSum = () => {
    setEditingEvent(null);
    setLumpSumSheetVisible(true);
  };

  const openEditLumpSum = (event: MortgageEvent) => {
    setEditingEvent(event);
    setLumpSumSheetVisible(true);
  };

  if (!loan || !deal) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader
          title={t('mortgage.dealOverpaymentsTitle')}
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

  const dealMinDate = parseDateLabelValue(deal.startDate) ?? new Date();
  const dealMaxDate = parseDateLabelValue(deal.endDate) ?? new Date();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={t('mortgage.dealOverpaymentsTitle')}
        subtitle={deal.name}
        subtitleVariant="context"
        variant="editor"
        leftAction={<HeaderBackAction onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Impact banner */}
        {impact ? (
          <Card style={styles.impactCard} variant="status">
            <View style={styles.impactInner}>
              <CoinsStackedIcon size={20} color={colours.secondary} strokeWidth={1.8} />
              <View style={styles.impactText}>
                <AppText variant="labelMd" tone="success">
                  {t('mortgage.dealInterestSavedLabel')}: {formatCurrency(impact.interestSaved, currency)}
                </AppText>
                <AppText variant="bodySm" tone="muted">
                  {t('mortgage.dealExtraRepaidLabel')}: {formatCurrency(impact.extraPrincipalRepaid, currency)}
                </AppText>
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
          <AppText variant="title3">
            {t('mortgage.dealMonthlyOverpayment')}
          </AppText>
          {deal.regularOverpayment > 0 ? (
            <TouchableOpacity style={styles.rowCard} onPress={() => setMonthlySheetVisible(true)} activeOpacity={0.75}>
              <View style={styles.rowMain}>
                <AppText variant="labelMd">
                  {formatCurrency(deal.regularOverpayment, currency)} / {t('results.months')}
                </AppText>
              </View>
              <AppText variant="labelSm" tone="muted">{t('mortgage.dealMonthlyOverpaymentEdit')}</AppText>
            </TouchableOpacity>
          ) : (
            <Button
              label={t('overpayments.monthlyNotSet')}
              onPress={() => setMonthlySheetVisible(true)}
              variant="secondary"
            />
          )}
        </View>

        {/* Lump sum payments */}
        <View style={styles.section}>
          <AppText variant="title3">
            {t('mortgage.dealLumpSums')}
          </AppText>
          {lumpSumEvents.length === 0 ? (
            <View style={styles.emptyLumpSums}>
              <AppText variant="bodySm" tone="muted" style={styles.centredText}>
                {t('mortgage.dealLumpSumsEmpty')}
              </AppText>
            </View>
          ) : (
            <Card style={styles.lumpSumList}>
              {lumpSumEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <TouchableOpacity
                    style={styles.lumpSumRow}
                    onPress={() => openEditLumpSum(event)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.lumpSumMain}>
                      <AppText variant="labelMd">
                        {formatCurrency(event.amount ?? 0, currency)}
                      </AppText>
                      <AppText variant="bodySm" tone="muted">
                        {formatFriendlyDate(event.date, i18n.language)}
                      </AppText>
                    </View>
                    <ChevronRightIcon size={16} color={colours.textSecondary} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Card>
          )}
          <Button
            label={t('overpayments.lumpSumAdd')}
            onPress={openAddLumpSum}
            variant="secondary"
            leftIcon={<PlusIcon size={16} color={colours.primary} />}
          />
        </View>

        {/* Balance Comparison Chart */}
        {chartData ? (
          <Pressable
            onPress={openFullscreen}
            accessibilityRole="button"
            style={({ pressed }) => [pressed && styles.previewPressed]}
          >
            <Card style={styles.chartCard} padding={0}>
              <View style={styles.chartHeader}>
                <AppText variant="title3" style={styles.previewTitle}>{t('overpayments.balanceChart')}</AppText>
                <View style={styles.fullscreenButton}>
                  <FullscreenIcon />
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

        {/* Date guidance note */}
        <View style={styles.dateNoteCard}>
          <InfoCircleIcon size={16} color={colours.textSecondary} strokeWidth={1.8} />
          <AppText variant="bodySm" tone="muted" style={styles.dateNoteText}>
            {t('mortgage.dealOverpaymentDateNote')}
          </AppText>
        </View>

      </ScrollView>

      <MonthlySheet
        visible={monthlySheetVisible}
        current={deal.regularOverpayment}
        currency={currency}
        onSave={saveMonthlyOverpayment}
        onClose={() => setMonthlySheetVisible(false)}
      />

      <LumpSumSheet
        visible={lumpSumSheetVisible}
        event={editingEvent}
        currency={currency}
        minDate={dealMinDate}
        maxDate={dealMaxDate}
        onSave={saveLumpSum}
        onDelete={deleteLumpSum}
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
    </SafeAreaView>
  );
}

// ─── Monthly Overpayment Sheet ────────────────────────────────────────────────

const MonthlySheet = ({
  visible,
  current,
  currency,
  onSave,
  onClose,
}: {
  visible: boolean;
  current: number;
  currency: string;
  onSave: (amount: number) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£';
  const [value, setValue] = useState(current > 0 ? String(current) : '');

  React.useEffect(() => {
    if (visible) setValue(current > 0 ? String(current) : '');
  }, [visible, current]);

  const amount = parseFloat(value) || 0;
  const isUnchanged = amount === current;
  const canSave = amount > 0 && !isUnchanged;
  const canRemove = current > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.scrim} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sheetStyles.kav}>
          <Pressable style={sheetStyles.sheet}>
            <View style={sheetStyles.handle} />
            <AppText variant="title2">
              {t('mortgage.dealMonthlyOverpayment')}
            </AppText>
            <View style={sheetStyles.field}>
              <FieldLabel>{t('overpayments.monthlyAmountLabel')}</FieldLabel>
              <InputSurface>
                <InputAffix>{currencySymbol}</InputAffix>
                <AppTextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="150"
                  keyboardType="decimal-pad"
                  autoFocus={visible}
                />
              </InputSurface>
            </View>
            <View style={sheetStyles.actions}>
              {canRemove ? (
                <Button
                  label={t('overpayments.monthlyRemove')}
                  onPress={() => onSave(0)}
                  variant="ghost"
                  style={sheetStyles.actionBtn}
                />
              ) : (
                <Button
                  label={t('overpayments.cancel')}
                  onPress={onClose}
                  variant="ghost"
                  style={sheetStyles.actionBtn}
                />
              )}
              <Button
                label={t('overpayments.save')}
                onPress={() => onSave(amount)}
                disabled={!canSave}
                style={sheetStyles.actionBtn}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

// ─── Lump Sum Sheet ───────────────────────────────────────────────────────────

const LumpSumSheet = ({
  visible,
  event,
  currency,
  minDate,
  maxDate,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  event: MortgageEvent | null;
  currency: string;
  minDate: Date;
  maxDate: Date;
  onSave: (date: string, amount: number) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const isEditing = event !== null;
  const datePickerRef = useRef<DatePickerFieldHandle>(null);
  const minDateRef = useRef(minDate);
  minDateRef.current = minDate;

  const [date, setDate] = useState(() => {
    const fallback = minDate > new Date() ? minDate : new Date();
    return event?.date ?? formatIsoDate(fallback);
  });
  const [amount, setAmount] = useState(event?.amount ? String(event.amount) : '');

  React.useEffect(() => {
    if (visible) {
      const fallback = minDateRef.current > new Date() ? minDateRef.current : new Date();
      setDate(event?.date ?? formatIsoDate(fallback));
      setAmount(event?.amount ? String(event.amount) : '');
    }
  }, [visible, event]);

  const parsedAmount = parseFloat(amount) || 0;
  const canSave = parsedAmount > 0;

  const handleDelete = () => {
    if (!event) return;
    Alert.alert(
      t('overpayments.deleteConfirmTitle'),
      t('overpayments.deleteConfirmMessage'),
      [
        { text: t('overpayments.cancel'), style: 'cancel' },
        { text: t('overpayments.deleteConfirm'), style: 'destructive', onPress: () => onDelete(event.id) },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.scrim} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sheetStyles.kav}>
          <Pressable style={[sheetStyles.sheet, { maxHeight: screenHeight * 0.92 }]}>
            <View style={sheetStyles.handle} />
            <AppText variant="title2">
              {isEditing ? t('overpayments.lumpSumSection') : t('overpayments.lumpSumAdd')}
            </AppText>
            <View style={sheetStyles.fields}>
              <DatePickerField
                ref={datePickerRef}
                label={t('overpayments.lumpSumDate')}
                value={date}
                onChange={setDate}
                hint=""
                minimumDate={minDate}
                maximumDate={maxDate}
              />
              <View>
                <FieldLabel>{t('overpayments.lumpSumAmount')}</FieldLabel>
                <InputSurface>
                  <AppTextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="5000"
                    keyboardType="decimal-pad"
                    onFocus={() => datePickerRef.current?.closePicker()}
                  />
                </InputSurface>
              </View>
            </View>
            <View style={sheetStyles.actions}>
              {isEditing ? (
                <Button
                  label={t('overpayments.delete')}
                  onPress={handleDelete}
                  variant="destructive"
                  style={sheetStyles.actionBtn}
                />
              ) : (
                <Button
                  label={t('overpayments.cancel')}
                  onPress={onClose}
                  variant="ghost"
                  style={sheetStyles.actionBtn}
                />
              )}
              <Button
                label={t('overpayments.save')}
                onPress={() => onSave(date, parsedAmount)}
                disabled={!canSave}
                style={sheetStyles.actionBtn}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const sheetStyles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colours.modalScrim, justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colours.background,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  field: { gap: spacing.xs },
  fields: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
