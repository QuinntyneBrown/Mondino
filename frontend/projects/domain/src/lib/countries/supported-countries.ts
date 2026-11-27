import type { Country } from '@mondino/api';

/**
 * The countries a teammate can place a pin in, with the form their postal codes take, as the
 * backend's `PostalCodeFormats` gives them. Create Team holds them itself, so it shows at once
 * (docs/adr/0009); the backend checks every request against its own list, and a change to the
 * supported countries changes both in one change.
 */
export const supportedCountries: readonly Country[] = [
  c('AU', 'Australia', 'Australia', 'Australian postal codes have four digits, like 2000.'),
  c('BR', 'Brazil', 'Brazil', 'Brazilian postal codes have eight digits, like 01310-100.'),
  c('CA', 'Canada', 'Canada', 'Canadian postal codes look like A1A 1A1.'),
  c('DE', 'Germany', 'Germany', 'German postal codes have five digits, like 10115.'),
  c(
    'GH',
    'Ghana',
    'Ghana',
    'Ghanaian postal codes are two letters and three or four digits, like GA543.',
  ),
  c('IN', 'India', 'India', 'Indian PIN codes have six digits, like 560001.'),
  c('IE', 'Ireland', 'Ireland', 'Irish Eircodes look like D02 X285.'),
  c('IT', 'Italy', 'Italy', 'Italian postal codes have five digits, like 20121.'),
  c('JP', 'Japan', 'Japan', 'Japanese postal codes have seven digits, like 100-0001.'),
  c('MX', 'Mexico', 'Mexico', 'Mexican postal codes have five digits, like 06000.'),
  c('SE', 'Sweden', 'Sweden', 'Swedish postal codes have five digits, like 111 22.'),
  c(
    'AE',
    'United Arab Emirates',
    'the United Arab Emirates',
    'UAE addresses use a P.O. Box number of up to six digits, like 12345.',
  ),
  c('US', 'United States', 'the United States', 'US ZIP codes have five digits, like 78701.'),
];

function c(code: string, name: string, nameInText: string, postalCodeForm: string): Country {
  return { code, name, nameInText, postalCodeForm };
}
