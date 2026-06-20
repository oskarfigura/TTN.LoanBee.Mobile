import { useCallback, useState } from 'react';
import { Alert, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { buildAmortisationCsv, type AmortisationTableItem } from '@oskarfigura/amortisation';
import { presentInterstitial } from '@/ads/interstitialController';

interface ExportArgs {
  items: AmortisationTableItem[];
  startDate: string;
}

// Shared amortisation-schedule CSV export used by both the calculator result view
// (loan & mortgage calculations) and the saved-mortgage tracked schedule. CSV export
// is a premium feature gated behind an ad: the interstitial is always shown first
// (bypassing the frequency policy) but never blocks the export if no ad can load.
export const useAmortisationCsvExport = () => {
  const { t, i18n } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = useCallback(async ({ items, startDate }: ExportArgs) => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      // Always show an interstitial first, bypassing the frequency policy. Resolves
      // even if no ad could be shown (offline/no-fill), so the export is never blocked.
      await presentInterstitial({ force: true });

      const csvContent = buildAmortisationCsv({
        items,
        startDate,
        language: i18n.language,
        headers: {
          // English defaultValues so a missing/corrupt locale never emits raw i18n keys
          // (e.g. "results.period") as CSV column headers.
          period: t('results.period', { defaultValue: 'Period' }),
          openingBalance: t('results.openingBalance', { defaultValue: 'Opening Balance' }),
          principal: t('results.principal', { defaultValue: 'Principal' }),
          interest: t('results.interest', { defaultValue: 'Interest' }),
          closingBalance: t('results.closingBalance', { defaultValue: 'Closing Balance' }),
        },
      });

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        await Share.share({
          title: t('results.exportCsv'),
          message: csvContent,
        });
        return;
      }

      const fileName = `loanbee-amortisation-${new Date().toISOString().slice(0, 10)}.csv`;
      const file = new File(Paths.cache, fileName);

      file.create({ intermediates: true, overwrite: true });
      file.write(csvContent);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: t('results.exportCsv'),
      });
    } catch {
      Alert.alert(t('results.exportErrorTitle'), t('results.exportErrorMessage'));
    } finally {
      setIsExporting(false);
    }
  }, [i18n.language, isExporting, t]);

  return { exportCsv, isExporting };
};
