import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, LayoutChangeEvent } from 'react-native';
import { GestureDetector, NativeGesture } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { colours, fontFaces, fontSizes } from '@/theme';
import { CurrencyCode } from '@/currency/currencies';
import { buildAmortisationDisplayRows } from '@/loans/loanDisplayContract';
import { clampPage, getPaginationWindow } from './pagination';
import {
  AmortisationTableItem,
} from './amortisationTableUtils';

interface Props {
  items: AmortisationTableItem[];
  startDate: string;
  currency: CurrencyCode;
  pageSize?: number;
  // When the table sits inside a horizontally-swipeable container (e.g. the
  // mortgage tab pager), pass a Gesture.Native() so the parent swipe yields to
  // the table's own horizontal scroll instead of changing tabs.
  scrollGesture?: NativeGesture;
}

const TABLE_WIDTH = 452;
const PERIOD_COLUMN_WIDTH = 96;
const BALANCE_COLUMN_WIDTH = 116;
const PAYMENT_COLUMN_WIDTH = 124;

export const AmortisationTable = ({ items, startDate, currency, pageSize = 12, scrollGesture }: Props) => {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const [isPagePickerOpen, setIsPagePickerOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const totalPages = Math.ceil(items.length / pageSize);
  const safePage = clampPage(page, totalPages);
  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [items, pageSize, safePage],
  );
  const pageDisplayRows = useMemo(
    () => buildAmortisationDisplayRows({
      items: pageItems,
      startDate,
      currency,
      language: i18n.language,
    }),
    [currency, i18n.language, pageItems, startDate],
  );
  const visiblePages = getPaginationWindow(safePage, totalPages, 5);
  const tableWidth = Math.max(TABLE_WIDTH, containerWidth);
  const periodColumnWidth = Math.round(tableWidth * 0.21);
  const balanceColumnWidth = Math.round(tableWidth * 0.255);
  const paymentColumnWidth = tableWidth - periodColumnWidth - (balanceColumnWidth * 2);
  const periodColumnStyle = { width: periodColumnWidth };
  const balanceColumnStyle = { width: balanceColumnWidth };
  const paymentColumnStyle = { width: paymentColumnWidth };
  const handleTableLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(Math.floor(event.nativeEvent.layout.width));
  };
  const goToPage = (nextPage: number) => {
    setPage(clampPage(nextPage, totalPages));
    setIsPagePickerOpen(false);
  };
  const pageLabel = `${safePage + 1} / ${totalPages}`;
  const getStatusLabel = (item: AmortisationTableItem) => {
    if (item.dealStatus === 'completed') return t('saved.completed');
    if (item.dealStatus === 'active' && item.isProjected) return t('mortgage.currentProjection');
    if (item.dealStatus === 'active') return t('mortgage.currentDeal');
    return t('mortgage.future');
  };

  const tableScroll = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tableScrollContent}
    >
        <View style={[styles.table, { width: tableWidth }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.periodCell, periodColumnStyle]}>
              {t('results.period')}
            </Text>
            <Text style={[styles.headerCell, styles.balanceCell, balanceColumnStyle, styles.headerNumericCell]}>
              {t('results.openingBalance')}
            </Text>
            <View style={[styles.paymentHeaderCell, styles.paymentCell, paymentColumnStyle]}>
              <Text style={[styles.paymentHeaderText, styles.principalHeaderText]}>
                {t('results.principal')}
              </Text>
              <Text style={[styles.paymentHeaderText, styles.interestHeaderText]}>
                {t('results.interest')}
              </Text>
            </View>
            <Text style={[styles.headerCell, styles.balanceCell, balanceColumnStyle, styles.headerNumericCell]}>
              {t('results.closingBalance')}
            </Text>
          </View>
          {pageItems.map((item, i) => {
            const globalIndex = safePage * pageSize + i;
            const previousItem = items[globalIndex - 1];
            const displayRow = pageDisplayRows[i];
            const openingBalance = displayRow?.metrics.find(metric => metric.id === 'openingBalance');
            const principal = displayRow?.metrics.find(metric => metric.id === 'principal');
            const interest = displayRow?.metrics.find(metric => metric.id === 'interest');
            const closingBalance = displayRow?.metrics.find(metric => metric.id === 'closingBalance');
            const showDealGroup = Boolean(item.dealId && item.dealId !== previousItem?.dealId);
            const periodLabel = displayRow?.period;

            return (
              <React.Fragment key={item.itemNo}>
                {showDealGroup ? (
                  <View style={[styles.dealGroupRow, { width: tableWidth }]}>
                    <Text style={styles.dealGroupTitle} numberOfLines={1}>
                      {item.dealName}
                    </Text>
                    <Text style={styles.dealGroupMeta} numberOfLines={1}>
                      {getStatusLabel(item)}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.dataRow, i % 2 === 0 && styles.evenRow]}>
                  <Text style={[styles.cell, styles.periodCell, periodColumnStyle]}>
                    {periodLabel}
                  </Text>
                  <Text style={[styles.cell, styles.balanceCell, balanceColumnStyle]}>{openingBalance?.value}</Text>
                  <View style={[styles.paymentCell, paymentColumnStyle]}>
                    <Text style={[styles.splitAmount, styles.principalAmount]} numberOfLines={1} adjustsFontSizeToFit>
                      {principal?.value}
                    </Text>
                    <Text style={[styles.splitAmount, styles.interestAmount]} numberOfLines={1} adjustsFontSizeToFit>
                      {interest?.value}
                    </Text>
                  </View>
                  <Text style={[styles.cell, styles.balanceCell, balanceColumnStyle, styles.closingCell]}>{closingBalance?.value}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
    </ScrollView>
  );

  return (
    <View onLayout={handleTableLayout}>
      {scrollGesture ? (
        <GestureDetector gesture={scrollGesture}>{tableScroll}</GestureDetector>
      ) : (
        tableScroll
      )}

      {totalPages > 1 && (
        <View style={styles.paginationWrap}>
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, safePage === 0 && styles.pageBtnDisabled]}
              onPress={() => goToPage(safePage - 1)}
              disabled={safePage === 0}
            >
              <Text style={[styles.pageBtnText, safePage === 0 && styles.pageBtnTextDisabled]}>
                {t('results.previous')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageIndicator, isPagePickerOpen && styles.pageIndicatorActive]}
              onPress={() => setIsPagePickerOpen(current => !current)}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <Text style={styles.pageIndicatorText}>{pageLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageBtn, safePage === totalPages - 1 && styles.pageBtnDisabled]}
              onPress={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages - 1}
            >
              <Text style={[styles.pageBtnText, safePage === totalPages - 1 && styles.pageBtnTextDisabled]}>
                {t('results.next')}
              </Text>
            </TouchableOpacity>
          </View>
          {isPagePickerOpen && (
            <View style={styles.pagePicker}>
              {visiblePages[0] > 0 ? (
                <>
                  <TouchableOpacity
                    style={styles.pageChip}
                    onPress={() => goToPage(0)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pageChipText}>1</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageEllipsis}>...</Text>
                </>
              ) : null}
              {visiblePages.map(pageNumber => (
                <TouchableOpacity
                  key={pageNumber}
                  style={[styles.pageChip, pageNumber === safePage && styles.pageChipActive]}
                  onPress={() => goToPage(pageNumber)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pageChipText, pageNumber === safePage && styles.pageChipTextActive]}>
                    {pageNumber + 1}
                  </Text>
                </TouchableOpacity>
              ))}
              {visiblePages[visiblePages.length - 1] < totalPages - 1 ? (
                <>
                  <Text style={styles.pageEllipsis}>...</Text>
                  <TouchableOpacity
                    style={styles.pageChip}
                    onPress={() => goToPage(totalPages - 1)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pageChipText}>{totalPages}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tableScrollContent: {
    flexGrow: 1,
    paddingBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dealGroupRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colours.surfaceAccent,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  dealGroupTitle: {
    flex: 1,
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  dealGroupMeta: {
    ...fontFaces.body.medium,
    fontSize: fontSizes.xs,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colours.primary,
  },
  headerCell: {
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 12,
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.white,
    textAlignVertical: 'center',
  },
  paymentHeaderCell: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerNumericCell: {
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.white,
  },
  evenRow: {
    backgroundColor: colours.surface,
  },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    textAlign: 'center',
  },
  periodCell: {
    width: PERIOD_COLUMN_WIDTH,
    textAlign: 'left',
  },
  balanceCell: {
    width: BALANCE_COLUMN_WIDTH,
  },
  paymentCell: {
    width: PAYMENT_COLUMN_WIDTH,
  },
  paymentHeaderText: {
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  principalHeaderText: {
    color: colours.primaryMuted,
  },
  interestHeaderText: {
    color: colours.tealSoft,
  },
  splitAmount: {
    minHeight: 27,
    paddingHorizontal: 8,
    paddingVertical: 5,
    ...fontFaces.heading.bold,
    fontSize: fontSizes.sm,
    color: colours.primaryInk,
    textAlign: 'center',
  },
  principalAmount: {
    backgroundColor: colours.surfaceStrong,
  },
  interestAmount: {
    backgroundColor: colours.successBorder,
  },
  closingCell: {
    ...fontFaces.body.bold,
    color: colours.primary,
  },
  paginationWrap: {
    marginTop: 14,
    gap: 10,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageBtn: {
    minWidth: 92,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colours.white,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colours.border,
  },
  pageBtnDisabled: {
    backgroundColor: colours.surface,
  },
  pageBtnText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.primary,
  },
  pageBtnTextDisabled: {
    color: colours.textSecondary,
  },
  pageIndicator: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 21,
    backgroundColor: colours.surface,
  },
  pageIndicatorActive: {
    borderColor: colours.primary,
    backgroundColor: colours.white,
  },
  pageIndicatorText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
    textAlign: 'center',
  },
  pagePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  pageChip: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.white,
  },
  pageChipActive: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },
  pageChipText: {
    ...fontFaces.heading.semibold,
    fontSize: fontSizes.sm,
    color: colours.textPrimary,
  },
  pageChipTextActive: {
    color: colours.white,
  },
  pageEllipsis: {
    ...fontFaces.body.regular,
    fontSize: fontSizes.sm,
    color: colours.textSecondary,
  },
});
