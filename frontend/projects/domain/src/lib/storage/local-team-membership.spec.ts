import { LocalTeamMembership, membershipKey } from './local-team-membership';

const northwind = {
  teamId: 'c8a2f0de-5b1e-4f7c-9a3d-2e6b8f1c4d07',
  teammateId: '5f3e9b2a-7c41-4d8e-b6a0-91d2c7e4f318',
  teamName: 'Northwind',
};

describe('LocalTeamMembership', () => {
  beforeEach(() => localStorage.clear());

  it('remembers nothing at first', () => {
    expect(new LocalTeamMembership().current()).toBeNull();
  });

  it('remembers the ids and the name, and only those', () => {
    const membership = new LocalTeamMembership();
    membership.remember({ ...northwind, postalCode: '20121' } as typeof northwind);
    expect(membership.current()).toEqual(northwind);
    expect(JSON.parse(localStorage.getItem(membershipKey) ?? 'null')).toEqual(northwind);
  });

  it('is remembered by the next tab', () => {
    new LocalTeamMembership().remember(northwind);
    expect(new LocalTeamMembership().current()).toEqual(northwind);
  });

  it('forgets', () => {
    const membership = new LocalTeamMembership();
    membership.remember(northwind);
    membership.forget();
    expect(membership.current()).toBeNull();
    expect(localStorage.getItem(membershipKey)).toBeNull();
  });

  it('treats what is not a membership as none', () => {
    localStorage.setItem(membershipKey, '{"teamId":1}');
    expect(new LocalTeamMembership().current()).toBeNull();
    localStorage.setItem(membershipKey, 'not json');
    expect(new LocalTeamMembership().current()).toBeNull();
  });
});
