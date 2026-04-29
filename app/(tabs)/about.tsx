import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('tabs.about')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>{t('about.formula')}</Text>
          <Text style={styles.body}>{t('about.formulaDesc')}</Text>
          <View style={styles.equation}>
            <Text style={styles.equationText}>{t('about.formulaEquation')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('about.variables')}</Text>
          {(['varM', 'varP', 'varR', 'varN'] as const).map(key => (
            <Text key={key} style={styles.variable}>• {t(`about.${key}`)}</Text>
          ))}
        </Card>

        <Card style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>{t('about.disclaimer')}</Text>
        </Card>

        <Text style={styles.version}>LoanBee • Made with 🐝 by The Tech Narrative</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  header: {
    backgroundColor: colours.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colours.white,
  },
  container: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16 },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colours.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  equation: {
    backgroundColor: colours.primary,
    borderRadius: 8,
    padding: 14,
    marginVertical: 12,
  },
  equationText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colours.white,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colours.textPrimary,
    marginBottom: 8,
  },
  variable: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 22,
  },
  disclaimerCard: {
    backgroundColor: colours.surface,
    borderLeftWidth: 3,
    borderLeftColor: colours.accent,
    marginBottom: 16,
  },
  disclaimerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
    lineHeight: 20,
  },
  version: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textAlign: 'center',
    paddingTop: 8,
  },
});
