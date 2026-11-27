// Traces to: L2-025
import { inviteLinkFor } from './invite-link';

describe('inviteLinkFor', () => {
  it('is the address of Join for the team’s invite token', () =>
    expect(inviteLinkFor('https://mondino.app', 'northwind-7Kq2')).toBe(
      'https://mondino.app/join/northwind-7Kq2',
    ));

  it('encodes a token that is not plain', () =>
    expect(inviteLinkFor('https://mondino.app', 'a/b c')).toBe(
      'https://mondino.app/join/a%2Fb%20c',
    ));
});
