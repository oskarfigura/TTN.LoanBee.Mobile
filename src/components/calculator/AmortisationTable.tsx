import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes, fontWeights } from '@/theme';
import { formatCurrency } from '@/currency/format';
import { CurrencyCode } from '@/currency/currencies';

interface TableItem {
  itemNo: number;
  remaining: string;
  principal: string;
  interest: string;
  ending: string;
}

interface Props {
  items: TableItem[];
  currency: CurrencyCode;
  pageSize?: number;
}

export const AmortisationTable = ({ items, currency, pageSize = 12 }: Props) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / pageSize);
  const pageItems = items.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.headerRow}>
            {[t('results.month'), t('results.payment'), t('results.principal'), t('results.interest'), t('results.balance')].map((h, i) => (
              <Text key={i} style={[styles.headerCell, i === 0 && styles.indexCell]}>{h}</Text>
            ))}
          </View>
          {pageItems.map((item, i) => (
            <View key={item.itemNo} style={[styles.dataRow, i % 2 === 0 && styles.evenRow]}>
              <Text style={[styles.cell, styles.indexCell]}>{item.itemNo}</Text>
              <Text style={styles.cell}>{formatCurrency(+item.remaining, currency)}</Text>
              <Text style={styles.cell}>{formatCurrency(+item.principal, currency)}</Text>
              <Text style={[styles.cell, styles.interestCell]}>{formatCurrency(+item.interest, currency)}</Text>
              <Text style={styles.cell}>{formatCurrency(+item.ending, currency)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
            onPress={() => setPage(p => p - 1)}
            disabled={page === 0}
          >
            <Text style={styles.pageBtnText}>{t('results.previous')}</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            {t('results.page')} {page + 1} {t('results.of')} {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, page === totalPages - 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(p => p + 1)}
            disabled={page === totalPages - 1}
          >
            <Text style={styles.pageBtnText}>{t('results.next')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colours.primary,
    borderRadius: 8,
    marginBottom: 2,
  },
  headerCell: {
    width: 100,
    padding: 8,
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colours.white,
    textAlign: 'right',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  evenRow: {
    backgroundColor: colours.surface,
  },
  cell: {
    width: 100,
    padding: 8,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colours.textPrimary,
    textAlign: 'right',
  },
  indexCell: {
    width: 60,
    textAlign: 'center',
    color: colours.textSecondary,
  },
  interestCell: {
    color: colours.accent,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colours.primary,
    borderRadius: 20,
  },
  pageBtnDisabled: {
    backgroundColor: colours.border,
  },
  pageBtnText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colours.white,
  },
  pageInfo: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
});
