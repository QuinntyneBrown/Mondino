import { isEmailAddress } from './email-address';

describe('isEmailAddress', () => {
  const cases: [string, boolean][] = [
    ['sofia@northwind.co', true],
    ['  sofia@northwind.co ', true],
    ['sofia', false],
    ['sofia@northwind', false],
    ['@northwind.co', false],
    ['sofia@@northwind.co', false],
    ['sofia bianchi@northwind.co', false],
    ['sofia@northwind.', false],
    ['sofia@.co', false],
    ['', false],
    [`${'a'.repeat(245)}@northwind.co`, false],
  ];
  for (const [text, expected] of cases) {
    it(`reads "${text.slice(0, 30)}" as ${expected ? 'an email' : 'not an email'}`, () => {
      expect(isEmailAddress(text)).toBe(expected);
    });
  }
});
