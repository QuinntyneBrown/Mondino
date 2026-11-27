import { initialsOf } from './initials';

describe('initialsOf', () => {
  const cases: [string, string, string][] = [
    ['two words', 'Tomás Herrera', 'TH'],
    ['an apostrophe', 'Liam O’Connor', 'LO'],
    ['a hyphen', 'Ahmed Al-Sayed', 'AA'],
    ['one word', 'Madonna', 'M'],
    ['three words', 'Ana María López', 'AM'],
    ['lower case', 'chloé martin', 'CM'],
    ['not a letter first', '@sofia 42', '@4'],
    ['an emoji first', '🌍 Globe', '🌍G'],
    ['markup', '<b>Bold</b> name', '<N'],
    ['spaces around', '  Lena   Fischer ', 'LF'],
    ['nothing but spaces', '   ', '?'],
  ];
  for (const [what, name, initials] of cases)
    it(`gives "${initials}" for a name with ${what}`, () =>
      expect(initialsOf(name)).toBe(initials));
});
