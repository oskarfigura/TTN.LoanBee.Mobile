import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrencyCode } from '@/currency/currencies';
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';
import { LenderTextInput } from '@/components/loans/LenderTextInput';
import { PinIcon } from '@/components/loans/LoanIcons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getDraftDeals, getMortgageTrackerSummary } from '@/mortgage/tracker';
import { savedLoansStorage } from '@/storage/savedLoans';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';

type EditTab = 'general' | 'specifics';

export default function EditLoanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = savedLoansStorage.getById(id);

  const [activeTab, setActiveTab] = useState<EditTab>('general');
  const [nickname, setNickname] = useState(loan?.nickname ?? '');
  const [lender, setLender] = useState(loan?.lender ?? '');
  const [category, setCategory] = useState<'mortgage' | 'loan'>(loan?.category ?? 'mortgage');
  const [currency, setCurrency] = useState<CurrencyCode>(loan?.currency ?? 'GBP');
  const [pinnedToDashboard, setPinnedToDashboard] = useState(loan?.pinnedToDashboard ?? false);

  const mortgageSummary = useMemo(() => (
    loan?.category === 'mortgage' ? getMortgageTrackerSummary(loan) : null
  ), [loan]);
  const draftDeals = useMemo(() => (
    loan?.category === 'mortgage' ? getDraftDeals(loan) : []
  ), [loan]);

  if (!loan) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{t('saved.notFound')}</Text>
        <Button label={t('common.goBack')} onPress={() => router.back()} />
      </View>
    );
  }

  const handleSave = () => {
    const maxOrder = savedLoansStorage
      .getAll()
      .reduce((max, item) => Math.max(max, item.dashboardOrder ?? 0), 0);

    savedLoansStorage.update({
      ...loan,
      nickname: nickname.trim(),
      lender: lender.trim() || undefined,
      category,
      currency,
      pinnedToDashboard,
      dashboardOrder: pinnedToDashboard
        ? loan.dashboardOrder ?? maxOrder + 1
        : undefined,
      formSnapshot: {
        ...loan.formSnapshot,
        currency,
      },
      updatedAt: new Date().toISOString(),
    });
    router.back();
  };

  const currentDeal = mortgageSummary?.currentDeal;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('edit.manageTitle')}</Text>
        <Text style={styles.subtitle}>{t('edit.manageSubtitle')}</Text>

        <View style={styles.tabBar}>
          {(['general', 'specifics'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'general' ? t('edit.general') : t('edit.specifics')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'general' && (
          <View>
            <Text style={styles.label}>{t('save.nickname')}</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('save.nicknamePlaceholder')}
              placeholderTextColor={colours.textSecondary}
            />

            <Text style={styles.label}>{t('save.category')}</Text>
            <View style={styles.toggleRow}>
              {(['mortgage', 'loan'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.toggleBtn, category === cat && styles.toggleBtnActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.toggleText, category === cat && styles.toggleTextActive]}>
                    {cat === 'mortgage' ? t('save.mortgage') : t('save.loan')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('save.lender')}</Text>
            <LenderTextInput value={lender} onChange={setLender} />

            <Text style={styles.label}>{t('save.currency')}</Text>
            <CurrencyPicker value={currency} onChange={setCurrency} />

            <TouchableOpacity
              style={styles.pinToggle}
              onPress={() => setPinnedToDashboard(value => !value)}
              activeOpacity={0.8}
            >
              <View style={styles.pinCopy}>
                <PinIcon color={colours.primary} />
                <Text style={[styles.pinTitle, pinnedToDashboard && styles.pinTitleActive]}>
                  {pinnedToDashboard ? t('mortgage.pinned') : t('mortgage.pinToDashboard')}
                </Text>
              </View>
              <Text style={[styles.pinMeta, pinnedToDashboard && styles.pinMetaActive]}>
                {t('edit.pinHelp')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'specifics' && loan.category === 'mortgage' && (
          <View>
            <Card style={styles.specificsCard}>
              <Text style={styles.cardTitle}>{t('mortgage.currentDeal')}</Text>
              {currentDeal ? (
                <>
                  <Text style={styles.dealTitle}>{currentDeal.name}</Text>
                  <Text style={styles.dealMeta}>{currentDeal.startDate} - {currentDeal.endDate}</Text>
                  <Text style={styles.dealMeta}>{currentDeal.interestRate}% · {currentDeal.repaymentType === 'interestOnly' ? t('mortgage.interestOnly') : t('mortgage.repayment')}</Text>
                </>
              ) : (
                <Text style={styles.bodyText}>{t('mortgage.noCurrentDeal')}</Text>
              )}
            </Card>

            {draftDeals.length > 0 && (
              <Card style={styles.specificsCard}>
                <Text style={styles.cardTitle}>{t('mortgage.nextDealDraft')}</Text>
                {draftDeals.map(deal => (
                  <TouchableOpacity
                    key={deal.id}
                    style={styles.draftRow}
                    onPress={() => router.push(`/saved/${loan.id}/deals/${deal.id}`)}
                  >
                    <View>
                      <Text style={styles.dealTitle}>{deal.name}</Text>
                      <Text style={styles.dealMeta}>{t('mortgage.startsOn', { date: deal.startDate })}</Text>
                    </View>
                    <Text style={styles.editLink}>{t('saved.edit')}</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            <Text style={styles.helperText}>{t('edit.mortgageSpecificsHelp')}</Text>
            <Button label={t('mortgage.viewTimeline')} onPress={() => router.push(`/saved/${loan.id}/timeline`)} variant="secondary" style={styles.stackAction} />
            <Button label={t('mortgage.addNextDeal')} onPress={() => router.push(`/saved/${loan.id}/deals/new`)} variant="secondary" style={styles.stackAction} />
            <Button label={t('mortgage.completeCurrentDeal')} onPress={() => router.push(`/saved/${loan.id}/complete-current`)} variant="secondary" style={styles.stackAction} />
          </View>
        )}

        {activeTab === 'specifics' && loan.category !== 'mortgage' && (
          <Card style={styles.specificsCard}>
            <Text style={styles.cardTitle}>{t('edit.loanInputsLockedTitle')}</Text>
            <Text style={styles.bodyText}>{t('edit.loanInputsLockedBody')}</Text>
            <Button
              label={t('saved.createNewCalculation')}
              onPress={() => router.push({
                pathname: '/' as never,
                params: { calculator: '1' },
              })}
              style={styles.stackAction}
            />
          </Card>
        )}

        <Button
          label={t('edit.save')}
          onPress={handleSave}
          disabled={!nickname.trim()}
          style={styles.saveBtn}
        />
        <Button
          label={t('save.cancel')}
          onPress={() => router.back()}
          variant="ghost"
          style={styles.cancelBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: 16, paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: fonts.heading, fontSize: fontSizes.md, color: colours.textPrimary, marginBottom: 16 },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.primary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colours.primary },
  tabText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  tabTextActive: { color: colours.white },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colours.border,
    minHeight: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
    minHeight: 44,
  },
  toggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colours.primary },
  toggleText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.textSecondary,
  },
  toggleTextActive: { color: colours.white },
  pinToggle: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    padding: 14,
    marginTop: 18,
  },
  pinCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colours.primary,
  },
  pinTitleActive: { color: colours.textPrimary },
  pinMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 6,
  },
  pinMetaActive: { color: colours.textSecondary },
  specificsCard: { marginTop: 16 },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
  },
  dealTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.primary,
    marginTop: 10,
  },
  dealMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    marginTop: 4,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
  },
  editLink: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colours.primary,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  helperText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: 14,
  },
  stackAction: { marginTop: 10 },
  saveBtn: { marginTop: 24 },
  cancelBtn: { marginTop: 8 },
});
