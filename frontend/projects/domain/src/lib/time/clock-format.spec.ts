import { defaultClockFormat } from './clock-format';

describe('defaultClockFormat', () => {
  const cases: [string, string][] = [
    ['United States', '12-hour'],
    ['Canada', '12-hour'],
    ['Italy', '24-hour'],
    ['Mexico', '24-hour'],
    ['', '24-hour'],
  ];
  for (const [country, format] of cases)
    it(`gives the ${format} clock to a teammate in ${country || 'no country'}`, () =>
      expect(defaultClockFormat(country)).toBe(format));
});
