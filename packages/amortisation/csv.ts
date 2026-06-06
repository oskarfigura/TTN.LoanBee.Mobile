import { formatAmortisationPeriodLabel, formatFriendlyMonthYear } from './dates';
import { AmortisationTableItem } from './types';

const formatCsvNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : value;
};

const escapeCsvValue = (value: string) => {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

export const buildAmortisationCsv = ({
  items,
  startDate,
  language,
  headers,
}: {
  items: AmortisationTableItem[];
  startDate: string;
  language: string;
  headers: {
    period: string;
    openingBalance: string;
    principal: string;
    interest: string;
    closingBalance: string;
  };
}) => {
  const rows = [
    [
      headers.period,
      headers.openingBalance,
      headers.principal,
      headers.interest,
      headers.closingBalance,
    ],
    ...items.map(item => [
      item.date ? formatFriendlyMonthYear(item.date, language) : formatAmortisationPeriodLabel(startDate, item.itemNo, language),
      formatCsvNumber(item.remaining),
      formatCsvNumber(item.principal),
      formatCsvNumber(item.interest),
      formatCsvNumber(item.ending),
    ]),
  ];

  return `\uFEFF${rows.map(row => row.map(cell => escapeCsvValue(cell)).join(',')).join('\n')}`;
};
