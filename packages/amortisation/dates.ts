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

export const advanceMonthsClamped = (date: Date, months: number): void => {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDayOfMonth));
};

export const addMonthsToIsoDate = (dateString: string, months: number): string => {
  const date = parseDateLabelValue(dateString);
  if (!date) return dateString;
  advanceMonthsClamped(date, months);
  return formatIsoDate(date);
};

export const monthsBetween = (
  startDate: string | Date,
  endDate: string | Date,
): number => {
  const start = typeof startDate === 'string' ? parseDateLabelValue(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseDateLabelValue(endDate) : endDate;
  if (!start || !end) return 0;
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
};

export const getOverallTermInMonths = (
  termInYears: number,
  termInMonths: number,
) => {
  let overallTermInMonths = termInMonths;
  if (termInYears > 0) {
    overallTermInMonths += termInYears * 12;
  }
  return overallTermInMonths;
};

export const getLoanEndDate = (
  startDate: string,
  timeInYears: number,
  timeInMonths: number,
) => {
  const date = parseDateLabelValue(startDate) ?? new Date(startDate);
  const overallTimeInMonths = getOverallTermInMonths(timeInYears, timeInMonths);
  date.setMonth(date.getMonth() + overallTimeInMonths);
  return date;
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

export const formatFriendlyMonthYear = (dateString: string | undefined, locale?: string) => {
  if (!dateString) return '';

  const date = parseDateLabelValue(dateString);
  if (!date) return dateString;

  return date.toLocaleDateString(getDateLocale(locale), {
    month: 'long',
    year: 'numeric',
  });
};

export const formatAmortisationPeriodLabel = (
  startDate: string,
  periodNumber: number,
  language: string,
): string => {
  const date = parseDateLabelValue(startDate);
  if (!date) return String(periodNumber);

  date.setMonth(date.getMonth() + periodNumber - 1);

  return formatFriendlyMonthYear(formatIsoDate(date), language);
};

export const formatPayoffDate = (startDate: string, totalMonths: number, locale?: string) => {
  const date = parseDateLabelValue(startDate);
  if (!date) return '—';

  date.setMonth(date.getMonth() + Math.max(totalMonths, 0));

  return formatFriendlyDate(formatIsoDate(date), locale);
};
