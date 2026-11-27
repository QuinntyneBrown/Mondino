import { TestBed } from '@angular/core/testing';
import {
  ApiError,
  CLOCK,
  type CityResult,
  INVITE_API,
  type Invite,
  type InviteApi,
  type PostalCodeResult,
} from '@mondino/api';
import { JoinStore } from './join-store';

const invite: Invite = {
  teamName: 'Northwind',
  teammateCount: 12,
  positions: [{ latitude: 45.4642, longitude: 9.19 }],
  avatars: [{ initials: 'ML', colour: 'teammate-2' }],
  alreadyJoined: false,
  full: false,
  countries: [
    {
      code: 'CA',
      name: 'Canada',
      nameInText: 'Canada',
      postalCodeForm: 'Canadian postal codes look like A1A 1A1.',
    },
    {
      code: 'IT',
      name: 'Italy',
      nameInText: 'Italy',
      postalCodeForm: 'Italian postal codes have five digits, like 20121.',
    },
  ],
};

function storeAnswering(
  getInvite: InviteApi['getInvite'],
  rest: Partial<InviteApi> = {},
): { store: JoinStore } {
  const api: InviteApi = {
    getInvite,
    lookUpPostalCode: () => new Promise(() => undefined),
    searchCities: () => Promise.resolve([]),
    join: () => new Promise(() => undefined),
    ...rest,
  };
  TestBed.configureTestingModule({
    providers: [
      JoinStore,
      { provide: INVITE_API, useValue: api },
      { provide: CLOCK, useValue: { now: () => Date.now() } },
    ],
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

describe('JoinStore: the form', () => {
  async function openStore(): Promise<JoinStore> {
    const { store } = storeAnswering(() => Promise.resolve(invite));
    await store.open('northwind-7Kq2');
    return store;
  }

  it('chooses the first country once the invite link is open', async () => {
    const store = await openStore();
    expect(store.countryCode()).toBe('CA');
    expect(store.country()?.name).toBe('Canada');
  });

  const names: [string, string | null][] = [
    ['', 'Missing'],
    ['   ', 'Missing'],
    ['Sofia Bianchi', null],
    ['S'.repeat(60), null],
    ['S'.repeat(61), 'TooLong'],
    [`  ${'S'.repeat(60)}  `, null],
  ];
  for (const [name, problem] of names) {
    it(`finds ${problem ?? 'no problem'} in a name of ${name.length} characters`, async () => {
      const store = await openStore();
      store.name.set(name);
      expect(store.nameProblem()).toBe(problem);
    });
  }

  it('shows nothing until the form is submitted, then reports a problem', async () => {
    const store = await openStore();
    expect(store.submitted()).toBe(false);
    expect(store.submit()).toBe(true);
    expect(store.submitted()).toBe(true);
    expect(store.postalCodeMissing()).toBe(true);
  });
});

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

describe('JoinStore: the postal code lookup', () => {
  async function storeLookingUp(
    lookUpPostalCode: InviteApi['lookUpPostalCode'],
  ): Promise<JoinStore> {
    const { store } = storeAnswering(() => Promise.resolve(invite), { lookUpPostalCode });
    await store.open('northwind-7Kq2');
    store.name.set('Sofia Bianchi');
    store.setCountry('IT');
    store.setPostalCode('20121');
    return store;
  }

  it('looks the postal code up for the chosen country when the field is left', async () => {
    const asked: string[] = [];
    const store = await storeLookingUp((token, country, postalCode) => {
      asked.push(`${token} ${country} ${postalCode}`);
      return Promise.resolve(milan);
    });
    store.leavePostalCode();
    expect(store.lookup()).toEqual({ kind: 'Locating', postalCode: '20121' });
    await Promise.resolve();
    await Promise.resolve();
    expect(store.lookup()).toEqual({ kind: 'Found', result: milan });
    expect(asked).toEqual(['northwind-7Kq2 IT 20121']);
  });

  const refusals: [string, string][] = [
    ['postal_code_not_found', 'NotFound'],
    ['validation_failed', 'Idle'],
    [ApiError.unreachable, 'Idle'],
  ];
  for (const [code, kind] of refusals) {
    it(`gives ${kind} for ${code}`, async () => {
      const store = await storeLookingUp(() => Promise.reject(new ApiError(code, 400)));
      await store.lookUp();
      expect(store.lookup().kind).toBe(kind);
    });
  }

  it('replaces the form with "no longer works" when the invite link was reset meanwhile', async () => {
    const store = await storeLookingUp(() => Promise.reject(new ApiError('invite_not_found', 404)));
    await store.lookUp();
    expect(store.inviteState()).toBe('NotFound');
  });

  it('removes what was found when the postal code or the country changes', async () => {
    const store = await storeLookingUp(() => Promise.resolve(milan));
    await store.lookUp();
    store.setPostalCode('2012');
    expect(store.lookup().kind).toBe('Idle');
    await store.lookUp();
    store.setCountry('CA');
    expect(store.lookup().kind).toBe('Idle');
  });

  it('aborts a pending lookup when the postal code changes, and ignores its answer', async () => {
    let signal: AbortSignal | undefined;
    let answer!: (value: PostalCodeResult) => void;
    const store = await storeLookingUp((_t, _c, _p, given) => {
      signal = given;
      return new Promise((resolve) => (answer = resolve));
    });
    void store.lookUp();
    store.setPostalCode('20122');
    answer(milan);
    await Promise.resolve();
    expect(signal?.aborted).toBe(true);
    expect(store.lookup().kind).toBe('Idle');
  });

  it('aborts a pending lookup when the screen is left', async () => {
    let signal: AbortSignal | undefined;
    const store = await storeLookingUp((_t, _c, _p, given) => {
      signal = given;
      return new Promise(() => undefined);
    });
    void store.lookUp();
    TestBed.resetTestingModule();
    expect(signal?.aborted).toBe(true);
  });

  it('looks nothing up for an empty postal code, or one already found', async () => {
    let calls = 0;
    const store = await storeLookingUp(() => {
      calls++;
      return Promise.resolve(milan);
    });
    await store.lookUp();
    store.leavePostalCode();
    store.setPostalCode('  ');
    store.leavePostalCode();
    expect(calls).toBe(1);
  });
});

const milanResult: CityResult = { cityId: '3173435', city: milan.city };

describe('JoinStore: when the lookup is down', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function storeWithLookupDown(
    searchCities: InviteApi['searchCities'] = () => Promise.resolve([milanResult]),
  ): Promise<JoinStore> {
    const { store } = storeAnswering(() => Promise.resolve(invite), {
      lookUpPostalCode: () => Promise.reject(new ApiError('postal_code_unavailable', 503)),
      searchCities,
    });
    await store.open('northwind-7Kq2');
    store.name.set('Sofia Bianchi');
    store.setCountry('IT');
    store.setPostalCode('20121');
    await store.lookUp();
    return store;
  }

  it('is unavailable, and stays so when the country changes', async () => {
    const store = await storeWithLookupDown();
    expect(store.lookup().kind).toBe('Unavailable');
    store.setCountry('CA');
    expect(store.lookup().kind).toBe('Unavailable');
  });

  it('searches the cities 300 ms after typing stops, once, for the chosen country', async () => {
    const asked: string[] = [];
    const store = await storeWithLookupDown((_token, country, text) => {
      asked.push(`${country} ${text}`);
      return Promise.resolve([milanResult]);
    });
    store.setCityText('M');
    store.setCityText('Mi');
    store.setCityText('Mil');
    await vi.advanceTimersByTimeAsync(299);
    expect(asked).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(asked).toEqual(['IT Mil']);
    expect(store.cityResults()).toEqual([milanResult]);
  });

  it('aborts a search when typing goes on, and drops the timer when the screen is left', async () => {
    let signal: AbortSignal | undefined;
    const store = await storeWithLookupDown((_t, _c, _x, given) => {
      signal = given;
      return new Promise(() => undefined);
    });
    store.setCityText('Mil');
    await vi.advanceTimersByTimeAsync(300);
    store.setCityText('Mila');
    expect(signal?.aborted).toBe(true);
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('places the pin at the chosen city, and typing again takes it away', async () => {
    const store = await storeWithLookupDown();
    store.chooseCity(milanResult);
    expect(store.cityText()).toBe('Milan');
    expect(store.submit()).toBe(false);
    expect(store.lookup()).toEqual({ kind: 'Found', result: { city: milan.city, weather: null } });
    store.setCityText('Mila');
    expect(store.lookup().kind).toBe('Unavailable');
    expect(store.chosenCity()).toBeNull();
  });
});

describe('JoinStore: too many tries', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function rateLimitedStore(): Promise<JoinStore> {
    const { store } = storeAnswering(() => Promise.resolve(invite), {
      lookUpPostalCode: () =>
        Promise.reject(new ApiError('rate_limited', 429, { retryAfterSeconds: 42 })),
    });
    await store.open('northwind-7Kq2');
    store.setPostalCode('20121');
    await store.lookUp();
    return store;
  }

  it('counts down from Retry-After and is idle again at zero', async () => {
    const store = await rateLimitedStore();
    expect(store.lookup().kind).toBe('RateLimited');
    expect(store.secondsToWait()).toBe(42);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(store.secondsToWait()).toBe(32);
    await vi.advanceTimersByTimeAsync(32_000);
    expect(store.lookup().kind).toBe('Idle');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps counting when the postal code is edited, and stops when the screen is left', async () => {
    const store = await rateLimitedStore();
    store.setPostalCode('20122');
    expect(store.lookup().kind).toBe('RateLimited');
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('JoinStore joining the team', () => {
  async function storeJoining(join: InviteApi['join']): Promise<JoinStore> {
    const { store } = storeAnswering(() => Promise.resolve(invite), {
      lookUpPostalCode: () => Promise.resolve(milan),
      join,
    });
    await store.open('northwind-7Kq2');
    store.setName(' Sofia Bianchi ');
    store.setCountry('IT');
    store.setPostalCode('20121');
    await store.lookUp();
    return store;
  }

  const joined = { teamId: 'team', teammateId: 'sofia' };

  it('sends the name, the country and the postal code, and answers the team and teammate', async () => {
    const sent: unknown[] = [];
    const store = await storeJoining((token, request) => {
      sent.push([token, request]);
      return Promise.resolve(joined);
    });
    expect(await store.join()).toEqual(joined);
    expect(sent).toEqual([
      [
        'northwind-7Kq2',
        {
          name: 'Sofia Bianchi',
          countryCode: 'IT',
          postalCode: '20121',
          cityId: null,
          joinRequestId: expect.any(String),
        },
      ],
    ]);
  });

  it('locks the form while the join is answered, and sends one join at a time', async () => {
    let calls = 0;
    const store = await storeJoining(() => {
      calls++;
      return new Promise(() => undefined);
    });
    void store.join();
    expect(store.joinState()).toBe('Joining');
    expect(await store.join()).toBeNull();
    store.setName('Someone else');
    store.setPostalCode('10115');
    store.setCountry('DE');
    expect([store.name(), store.postalCode(), store.countryCode()]).toEqual([
      ' Sofia Bianchi ',
      '20121',
      'IT',
    ]);
    expect(calls).toBe(1);
  });

  it('sends the same join request id when the join is tried again', async () => {
    const ids: string[] = [];
    const store = await storeJoining((_token, request) => {
      ids.push(request.joinRequestId);
      return ids.length === 1
        ? Promise.reject(new ApiError('unreachable', 0))
        : Promise.resolve(joined);
    });
    expect(await store.join()).toBeNull();
    expect(store.joinState()).toBe('Failed');
    expect(await store.join()).toEqual(joined);
    expect(ids[0]).toBe(ids[1]);
  });

  for (const [code, inviteState, joinState, lookup] of [
    ['unexpected', 'Ready', 'Failed', 'Found'],
    ['validation_failed', 'Ready', 'Failed', 'Found'],
    ['team_full', 'Full', 'Idle', 'Found'],
    ['invite_not_found', 'NotFound', 'Idle', 'Found'],
    ['rate_limited', 'Ready', 'Idle', 'RateLimited'],
  ] as const) {
    it(`gives ${inviteState}, ${joinState} and ${lookup} for ${code}`, async () => {
      const store = await storeJoining(() => Promise.reject(new ApiError(code, 400)));
      await store.join();
      expect([store.inviteState(), store.joinState(), store.lookup().kind]).toEqual([
        inviteState,
        joinState,
        lookup,
      ]);
      expect([store.name(), store.postalCode()]).toEqual([' Sofia Bianchi ', '20121']);
      TestBed.resetTestingModule();
    });
  }

  it('aborts a pending join when the screen is left', async () => {
    let given: AbortSignal | null = null;
    const store = await storeJoining((_token, _request, signal) => {
      given = signal;
      return new Promise(() => undefined);
    });
    void store.join();
    TestBed.resetTestingModule();
    expect(store.joinState()).toBe('Joining');
    expect((given as AbortSignal | null)?.aborted).toBe(true);
  });
});
