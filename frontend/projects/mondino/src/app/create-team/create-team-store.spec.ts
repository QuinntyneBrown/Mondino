import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ApiError,
  CLOCK,
  type CreatedTeam,
  type PostalCodeResult,
  TEAM_CREATION_API,
  type TeamCreationApi,
} from '@mondino/api';
import { CreateTeamStore } from './create-team-store';

const milan: PostalCodeResult = {
  city: {
    name: 'Milan',
    region: 'Lombardy',
    countryCode: 'IT',
    position: { latitude: 45.46427, longitude: 9.18951 },
    timeZoneId: 'Europe/Rome',
  },
  weather: null,
};

const northwind: CreatedTeam = {
  teamId: 't',
  teammateId: 'm',
  teamName: 'Northwind',
  inviteToken: 'Xq7Lr2Vb9TzK4mNc8PwYdA',
};

function storeAnswering(rest: Partial<TeamCreationApi> = {}): CreateTeamStore {
  const api: TeamCreationApi = {
    lookUpPostalCode: () => Promise.resolve(milan),
    searchCities: () => Promise.resolve([]),
    createTeam: () => Promise.resolve(northwind),
    ...rest,
  };
  TestBed.configureTestingModule({
    providers: [
      CreateTeamStore,
      { provide: TEAM_CREATION_API, useValue: api },
      { provide: CLOCK, useValue: { now: () => Date.now(), minute: signal(0) } },
    ],
  });
  return TestBed.inject(CreateTeamStore);
}

function fill(store: CreateTeamStore): void {
  store.setTeamName('Northwind');
  store.setName('Sofia Bianchi');
  store.setEmail('sofia@northwind.co');
  store.setCountry('IT');
  store.setPostalCode('20121');
}

describe('CreateTeamStore', () => {
  it('answers the first field that is wrong, in the order of the form, and sends nothing', async () => {
    let sent = 0;
    const store = storeAnswering({
      createTeam: () => {
        sent++;
        return Promise.resolve(northwind);
      },
    });
    store.setEmail('sofia');
    expect(await store.submit()).toBe('team');
    expect(store.problems()).toEqual({
      team: 'Missing',
      name: 'Missing',
      email: 'NotAnEmail',
      postal: 'Missing',
    });
    store.setTeamName('Northwind');
    store.setName('Sofia Bianchi');
    expect(await store.submit()).toBe('email');
    expect(sent).toBe(0);
  });

  it('looks the postal code up, then makes the team with one request id for every try', async () => {
    const ids: string[] = [];
    const store = storeAnswering({
      createTeam: (request) => {
        ids.push(request.createRequestId);
        return ids.length === 1
          ? Promise.reject(new ApiError('unexpected', 500))
          : Promise.resolve(northwind);
      },
    });
    fill(store);
    await store.submit();
    expect(store.state()).toEqual({ kind: 'Failed' });
    await store.submit();
    expect(store.state()).toEqual({ kind: 'Created', team: northwind });
    expect(ids[0]).toBe(ids[1]);
  });

  const refusals: [string, string][] = [
    ['postal_code_not_found', 'NotFound'],
    ['postal_code_unavailable', 'Unavailable'],
    ['rate_limited', 'RateLimited'],
  ];
  for (const [code, kind] of refusals) {
    it(`gives the lookup ${kind} when making the team is refused with ${code}`, async () => {
      const store = storeAnswering({
        createTeam: () => Promise.reject(new ApiError(code, 422, { retryAfterSeconds: 60 })),
      });
      fill(store);
      await store.submit();
      expect(store.lookup().kind).toBe(kind);
      expect(store.state().kind).toBe(kind === 'RateLimited' ? 'Idle' : 'Failed');
      TestBed.resetTestingModule();
    });
  }

  it('aborts a pending request to make the team when it is destroyed', async () => {
    let signal: AbortSignal | undefined;
    const store = storeAnswering({
      createTeam: (_, given) => {
        signal = given;
        return new Promise<CreatedTeam>(() => undefined);
      },
    });
    fill(store);
    void store.submit();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.resetTestingModule();
    expect(signal?.aborted).toBe(true);
  });
});
