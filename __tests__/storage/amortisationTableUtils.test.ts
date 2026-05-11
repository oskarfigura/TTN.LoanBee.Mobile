import { describe, expect, it } from '@jest/globals';
import {
  buildAmortisationCsv,
  formatAmortisationPeriodLabel,
} from '../../src/components/calculator/amortisationTableUtils';

const sampleItems = [
  {
    itemNo: 1,
    remaining: '250000',
    principal: '715.48',
    interest: '812.50',
    ending: '249284.52',
  },
  {
    itemNo: 2,
    remaining: '249284.52',
    principal: '717.81',
    interest: '810.17',
    ending: '248566.71',
  },
];

describe('amortisation table utils', () => {
  it('builds a csv with translated headers and spreadsheet-friendly numbers', () => {
    const csv = buildAmortisationCsv({
      items: sampleItems,
      startDate: '2026-01-01',
      language: 'en',
      headers: {
        period: 'Period',
        openingBalance: 'Opening Balance',
        principal: 'Principal',
        interest: 'Interest',
        closingBalance: 'Closing Balance',
      },
    });

    expect(csv).toBe(
      '\uFEFFPeriod,Opening Balance,Principal,Interest,Closing Balance\n'
        + '1st Jan 2026,250000.00,715.48,812.50,249284.52\n'
        + '1st Feb 2026,249284.52,717.81,810.17,248566.71',
    );
  });

  it('formats amortisation periods using the loan start date', () => {
    expect(formatAmortisationPeriodLabel('2026-01-01', 2, 'en')).toBe('1st Feb 2026');
  });
});
