import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackAction } from '@/components/ui/HeaderBackAction';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ArrowRightIcon } from '@/components/ui/Icons/ArrowRightIcon/ArrowRightIcon';
import { colours, layout, spacing } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const VARIABLE_KEYS = ['varA', 'varP', 'varR', 'varN'] as const;

interface FaqItem {
  q: string;
  a: string;
}

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ fromDashboard?: string }>();
  const faqItems = t('about.faqItems', { returnObjects: true }) as FaqItem[];
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const openedFromDashboard = params.fromDashboard === '1';

  return (
    // No 'bottom' edge: this screen sits above the tab bar, which owns the bottom inset.
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader
        title={t('tabs.about')}
        variant="top-level"
        leftAction={openedFromDashboard ? (
          <HeaderBackAction onPress={() => router.replace('/')} />
        ) : undefined}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.guideCard} variant="status" padding={layout.cardPadding}>
          <AppText variant="title3" style={styles.guideTitle}>{t('guide.aboutEntryTitle')}</AppText>
          <AppText variant="bodySm" tone="muted" style={styles.guideBody}>{t('guide.aboutEntryBody')}</AppText>
          <Button
            label={t('guide.aboutEntryCta')}
            variant="secondary"
            onPress={() => router.push('/guide')}
            rightIcon={<ArrowRightIcon color={colours.primaryInk} size={18} strokeWidth={2} />}
          />
        </Card>

        <Card style={styles.card} variant="accent" padding={layout.cardPadding}>
          <AppText variant="title2" tone="accent" style={styles.title}>{t('about.formula')}</AppText>
          <AppText variant="bodyMd" tone="muted" style={styles.body}>{t('about.formulaDesc')}</AppText>

          <View style={styles.formulaPanel}>
            <View style={styles.formulaRow}>
              <AppText variant="title2" tone="accent" style={styles.formulaLead}>A = P ·</AppText>
              <View style={styles.fraction}>
                <AppText variant="title3" tone="accent" style={styles.fractionText}>r(1+r)^n</AppText>
                <View style={styles.fractionLine} />
                <AppText variant="title3" tone="accent" style={styles.fractionText}>(1+r)^n - 1</AppText>
              </View>
            </View>
          </View>

          <AppText variant="labelSm" tone="muted" style={styles.subtitle}>{t('about.variables')}</AppText>
          <View style={styles.variableGrid}>
            {VARIABLE_KEYS.map(key => {
              const [symbol, label] = t(`about.${key}`).split(' = ');
              return (
                <View key={key} style={styles.variableTile}>
                  <AppText variant="title2" tone="accent" style={styles.variableSymbol}>{symbol}</AppText>
                  <AppText variant="bodySm" tone="muted">{label}</AppText>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={styles.disclaimerCard} padding={layout.denseCardPadding}>
          <AppText variant="bodySm" tone="muted">{t('about.disclaimer')}</AppText>
        </Card>

        <Card style={styles.card} padding={layout.cardPadding}>
          <AppText variant="title2" tone="accent" style={styles.title}>{t('about.faqTitle')}</AppText>
          <View style={styles.faqList}>
            {faqItems.map((item, index) => {
              const expanded = openFaqIndex === index;
              return (
                <View key={item.q} style={[styles.faqItem, expanded && styles.faqItemOpen]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    style={styles.faqQuestionRow}
                    onPress={() => setOpenFaqIndex(expanded ? -1 : index)}
                  >
                    <AppText variant="title3" style={styles.faqQuestion}>{item.q}</AppText>
                    <AppText variant="title3" tone="inverse" style={styles.faqToggle}>{expanded ? '-' : '+'}</AppText>
                  </TouchableOpacity>
                  {expanded ? <AppText variant="bodySm" tone="muted" style={styles.faqAnswer}>{item.a}</AppText> : null}
                </View>
              );
            })}
          </View>
        </Card>

        <AppText variant="helper" tone="muted" style={styles.version}>{t('about.footer')}</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  container: { padding: layout.screenPadding, paddingBottom: 40 },
  guideCard: { marginBottom: spacing.md },
  guideTitle: { marginBottom: spacing.xxs },
  guideBody: { marginBottom: spacing.sm },
  card: { marginBottom: spacing.md },
  title: {
    marginBottom: spacing.sm,
  },
  body: {
    marginBottom: spacing.md,
  },
  formulaPanel: {
    backgroundColor: colours.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  formulaLead: {
    marginRight: 10,
  },
  fraction: {
    minWidth: 150,
    alignItems: 'center',
  },
  fractionText: { textAlign: 'center' },
  fractionLine: {
    height: 2,
    alignSelf: 'stretch',
    backgroundColor: colours.primary,
    marginVertical: 6,
  },
  subtitle: {
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  variableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variableTile: {
    width: '47%',
    backgroundColor: colours.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    padding: 12,
  },
  variableSymbol: {
    marginBottom: spacing.xxs,
  },
  disclaimerCard: {
    backgroundColor: colours.surfaceMuted,
    borderLeftWidth: 3,
    borderLeftColor: colours.accent,
    marginBottom: 16,
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    backgroundColor: colours.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.borderSoft,
    overflow: 'hidden',
  },
  faqItemOpen: {
    borderColor: colours.accent,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
  },
  faqToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colours.primary,
    lineHeight: 23,
    textAlign: 'center',
  },
  faqAnswer: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  version: {
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
});
