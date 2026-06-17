import { describe, expect, it } from '@jest/globals';
import {
  parseStrictDecimal,
  validateDurationText,
  validateMoneyText,
  validateNonNegativeIntegerText,
} from '@/shared/lib/utils/formValidation';

describe('form validation helpers', () => {
  it('parses strict decimal numbers only', () => {
    expect(parseStrictDecimal('123.45')).toMatchObject({ numeric: 123.45, isValid: true });
    expect(parseStrictDecimal('.5')).toMatchObject({ numeric: 0.5, isValid: true });
    expect(parseStrictDecimal('12abc')).toMatchObject({ errorKey: 'forms.invalidNumber', isValid: false });
    expect(parseStrictDecimal('NaN')).toMatchObject({ errorKey: 'forms.invalidNumber', isValid: false });
    expect(parseStrictDecimal('Infinity')).toMatchObject({ errorKey: 'forms.invalidNumber', isValid: false });
    expect(parseStrictDecimal('')).toMatchObject({ errorKey: 'forms.required', isValid: false, isEmpty: true });
  });

  it('validates positive and non-negative money fields', () => {
    expect(validateMoneyText('10')).toMatchObject({ numeric: 10, isValid: true });
    expect(validateMoneyText('0')).toMatchObject({ errorKey: 'forms.requiredPositive', isValid: false });
    expect(validateMoneyText('-1')).toMatchObject({ errorKey: 'forms.requiredNonNegative', isValid: false });
    expect(validateMoneyText('0', { allowZero: true })).toMatchObject({ numeric: 0, isValid: true });
    expect(validateMoneyText('12abc')).toMatchObject({ errorKey: 'forms.invalidNumber', isValid: false });
  });

  it('validates non-negative integer fields', () => {
    expect(validateNonNegativeIntegerText('12')).toMatchObject({ numeric: 12, isValid: true });
    expect(validateNonNegativeIntegerText('1.5')).toMatchObject({ errorKey: 'forms.invalidInteger', isValid: false });
    expect(validateNonNegativeIntegerText('-1')).toMatchObject({ errorKey: 'forms.invalidInteger', isValid: false });
    expect(validateNonNegativeIntegerText('12abc')).toMatchObject({ errorKey: 'forms.invalidNumber', isValid: false });
  });

  it('validates duration fields with month remainders from 0 to 11', () => {
    expect(validateDurationText('25', '0')).toMatchObject({ totalMonths: 300, isValid: true });
    expect(validateDurationText('0', '6')).toMatchObject({ totalMonths: 6, isValid: true });
    // A blank sub-field counts as zero so "20 years" alone is valid (regression:
    // a blank months field used to silently disable the save button).
    expect(validateDurationText('20', '')).toMatchObject({ totalMonths: 240, isValid: true });
    expect(validateDurationText('', '8')).toMatchObject({ totalMonths: 8, isValid: true });
    expect(validateDurationText('', '')).toMatchObject({ errorKey: 'forms.requiredPositive', isValid: false });
    expect(validateDurationText('0', '0')).toMatchObject({ errorKey: 'forms.requiredPositive', isValid: false });
    expect(validateDurationText('1', '12').months).toMatchObject({ errorKey: 'forms.monthRange', isValid: false });
    expect(validateDurationText('1.5', '0').years).toMatchObject({ errorKey: 'forms.invalidInteger', isValid: false });
    expect(validateDurationText('3', '0', { maxTotalMonths: 24 })).toMatchObject({
      errorKey: 'forms.durationTooLong',
      isValid: false,
    });
  });
});
