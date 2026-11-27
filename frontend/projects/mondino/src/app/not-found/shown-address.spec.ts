import { shownAddress } from './shown-address';

describe('shownAddress', () => {
  const cases: [string, string][] = [
    ['https://mondino.app/team/northwind/pins/old', 'mondino.app/team/northwind/pins/old'],
    ['https://mondino.app/old?token=secret', 'mondino.app/old'],
    ['https://mondino.app/old#part', 'mondino.app/old'],
    ['https://mondino.app/old?a=1#part', 'mondino.app/old'],
    ['http://localhost:4200/nowhere', 'localhost:4200/nowhere'],
    ['https://mondino.app/', 'mondino.app/'],
    ['https://mondino.app/%3Cb%3E', 'mondino.app/%3Cb%3E'],
  ];

  for (const [address, shown] of cases) {
    it(`shows ${address} as ${shown}`, () => {
      expect(shownAddress(new URL(address))).toBe(shown);
    });
  }
});
