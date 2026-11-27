import { TestBed } from '@angular/core/testing';
import { ApiError, INVITE_API, type Invite, type InviteApi } from '@mondino/api';
import { JoinStore } from './join-store';

const invite: Invite = {
  teamName: 'Northwind',
  teammateCount: 12,
  positions: [{ latitude: 45.4642, longitude: 9.19 }],
  avatars: [{ initials: 'ML', colour: 'teammate-2' }],
  alreadyJoined: false,
  countries: [{ code: 'IT', name: 'Italy' }],
};

function storeAnswering(getInvite: InviteApi['getInvite']): { store: JoinStore } {
  TestBed.configureTestingModule({
    providers: [JoinStore, { provide: INVITE_API, useValue: { getInvite } satisfies InviteApi }],
  });
  return { store: TestBed.inject(JoinStore) };
}

describe('JoinStore', () => {
  it('is loading until the invite link answers', () => {
    const { store } = storeAnswering(() => new Promise<Invite>(() => undefined));
    void store.open('northwind-7Kq2');
    expect(store.inviteState()).toBe('Loading');
    expect(store.invite()).toBeNull();
  });

  const cases: [string, () => Promise<Invite>, string][] = [
    ['an invite', () => Promise.resolve(invite), 'Ready'],
    [
      'a teammate already in the team',
      () => Promise.resolve({ ...invite, alreadyJoined: true }),
      'AlreadyJoined',
    ],
    ['invite_not_found', () => Promise.reject(new ApiError('invite_not_found', 404)), 'NotFound'],
    ['rate_limited', () => Promise.reject(new ApiError('rate_limited', 429)), 'Failed'],
    ['no answer', () => Promise.reject(new ApiError(ApiError.unreachable, 0)), 'Failed'],
    ['an unexpected error', () => Promise.reject(new ApiError('unexpected', 500)), 'Failed'],
    ['something that is not an ApiError', () => Promise.reject(new Error('boom')), 'Failed'],
  ];

  for (const [answer, getInvite, state] of cases) {
    it(`gives ${state} for ${answer}`, async () => {
      const { store } = storeAnswering(getInvite);
      await store.open('northwind-7Kq2');
      expect(store.inviteState()).toBe(state);
      expect(store.invite() !== null).toBe(state === 'Ready');
    });
  }

  it('aborts the pending request when it is destroyed', () => {
    let signal: AbortSignal | undefined;
    const { store } = storeAnswering((_, given) => {
      signal = given;
      return new Promise<Invite>(() => undefined);
    });
    void store.open('northwind-7Kq2');
    TestBed.resetTestingModule();
    expect(signal?.aborted).toBe(true);
  });

  it('aborts the pending request when the link is opened again, and keeps the newer answer', async () => {
    const signals: AbortSignal[] = [];
    let first!: (value: Invite) => void;
    const { store } = storeAnswering((_, signal) => {
      signals.push(signal);
      return signals.length === 1
        ? new Promise<Invite>((resolve) => (first = resolve))
        : Promise.reject(new ApiError('invite_not_found', 404));
    });
    void store.open('northwind-7Kq2');
    await store.open('northwind-7Kq2');
    first(invite);
    await Promise.resolve();
    expect(signals[0].aborted).toBe(true);
    expect(store.inviteState()).toBe('NotFound');
  });
});
