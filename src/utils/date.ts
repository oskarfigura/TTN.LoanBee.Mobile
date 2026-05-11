const ENGLISH_SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
];

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const getDateLocale = (locale?: string) => (locale?.startsWith('pl') ? 'pl-PL' : 'en-GB');

const getOrdinalSuffix = (day: number) => {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return 'th';

  const lastDigit = day % 10;
  if (lastDigit === 1) return 'st';
  if (lastDigit === 2) return 'nd';
  if (lastDigit === 3) return 'rd';

  return 'th';
};

export const parseDateLabelValue = (dateString: string): Date | null => {
  const isoParts = ISO_DATE_PATTERN.exec(dateString);

  if (isoParts) {
    const [, rawYear, rawMonth, rawDay] = isoParts;
    const year = Number(rawYear);
    const month = Number(rawMonth);
    const day = Number(rawDay);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isValidIsoDate = (dateString: string): boolean => (
  ISO_DATE_PATTERN.test(dateString) && parseDateLabelValue(dateString) !== null
);

export const formatIsoDate = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const formatFriendlyDate = (dateString: string | undefined, locale?: string) => {
  if (!dateString) return '';

  const date = parseDateLabelValue(dateString);
  if (!date) return dateString;

  if (!locale || locale.startsWith('en')) {
    const day = date.getDate();
    return `${day}${getOrdinalSuffix(day)} ${ENGLISH_SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  return date.toLocaleDateString(getDateLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatFriendlyDateRange = (
  startDate: string | undefined,
  endDate: string | undefined,
  locale?: string,
) => {
  const start = formatFriendlyDate(startDate, locale);
  const end = formatFriendlyDate(endDate, locale);

  if (!start) return end;
  if (!end) return start;

  return `${start} - ${end}`;
};

export const monthsBetween = (startDate: string, now: Date): number => {
  const start = new Date(startDate);
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
};
