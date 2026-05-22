export type NumericValidation = {
  numeric: number;
  errorKey?: string;
  isEmpty: boolean;
  isValid: boolean;
};

export type DurationValidation = {
  years: NumericValidation;
  months: NumericValidation;
  totalMonths: number;
  errorKey?: string;
  isValid: boolean;
};

const DECIMAL_NUMBER_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

const invalid = (errorKey: string, numeric = 0, isEmpty = false): NumericValidation => ({
  numeric,
  errorKey,
  isEmpty,
  isValid: false,
});

const valid = (numeric: number, isEmpty = false): NumericValidation => ({
  numeric,
  isEmpty,
  isValid: true,
});

export const parseStrictDecimal = (raw: string): NumericValidation => {
  const trimmed = raw.trim();
  if (trimmed === '') return invalid('forms.required', 0, true);
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return invalid('forms.invalidNumber');

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return invalid('forms.invalidNumber');

  return valid(numeric);
};

export const validateMoneyText = (
  raw: string,
  options: { allowZero?: boolean; required?: boolean } = {},
): NumericValidation => {
  const { allowZero = false, required = true } = options;
  const trimmed = raw.trim();
  if (trimmed === '') {
    return required ? invalid('forms.required', 0, true) : valid(0, true);
  }

  const parsed = parseStrictDecimal(trimmed);
  if (!parsed.isValid) return parsed;

  if (parsed.numeric < 0) return invalid('forms.requiredNonNegative', parsed.numeric);
  if (!allowZero && parsed.numeric <= 0) return invalid('forms.requiredPositive', parsed.numeric);

  return parsed;
};

export const validateNonNegativeIntegerText = (
  raw: string,
  options: { required?: boolean; max?: number; maxErrorKey?: string } = {},
): NumericValidation => {
  const { required = true, max, maxErrorKey = 'forms.invalidNumber' } = options;
  const trimmed = raw.trim();
  if (trimmed === '') {
    return required ? invalid('forms.required', 0, true) : valid(0, true);
  }

  const parsed = parseStrictDecimal(trimmed);
  if (!parsed.isValid) return parsed;
  if (!Number.isInteger(parsed.numeric) || parsed.numeric < 0) {
    return invalid('forms.invalidInteger', parsed.numeric);
  }
  if (max !== undefined && parsed.numeric > max) {
    return invalid(maxErrorKey, parsed.numeric);
  }

  return parsed;
};

export const validateDurationText = (
  yearsRaw: string,
  monthsRaw: string,
  options: { maxTotalMonths?: number } = {},
): DurationValidation => {
  const years = validateNonNegativeIntegerText(yearsRaw);
  const months = validateNonNegativeIntegerText(monthsRaw, {
    max: 11,
    maxErrorKey: 'forms.monthRange',
  });
  const totalMonths = (years.numeric * 12) + months.numeric;
  const fieldErrors = !years.isValid || !months.isValid;
  let errorKey: string | undefined;

  if (!fieldErrors && totalMonths <= 0) {
    errorKey = 'forms.requiredPositive';
  } else if (
    !fieldErrors
    && options.maxTotalMonths !== undefined
    && totalMonths > options.maxTotalMonths
  ) {
    errorKey = 'forms.durationTooLong';
  }

  return {
    years,
    months,
    totalMonths,
    errorKey,
    isValid: !fieldErrors && !errorKey,
  };
};
