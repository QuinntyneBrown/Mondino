import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ApiError,
  CLOCK,
  type Pin,
  PROFILE_API,
  type Profile,
  type ProfileApi,
  type PostalCodeResult,
  TEAM_MEMBERSHIP,
} from '@mondino/api';
import { ProfileStore } from './profile-store';

const pin: Pin = {
  teammateId: 't1',
  name: 'Sofia Bianchi',
  colour: 'teammate-1',
  cityName: 'Milan',
  country: 'Italy',
  position: { latitude: 45.46427, longitude: 9.18951 },
  timeZoneId: 'Europe/Rome',
  sharesStatus: true,
  isViewer: true,
  weather: null,
  weatherState: 'Unavailable',
};
const milan: Profile = { teamName: 'Northwind', pin, countryCode: 'IT', postalCode: '20121' };
const toronto: PostalCodeResult = {
  city: {
    name: 'Toronto',
    region: 'Ontario',
    countryCode: 'CA',
    position: { latitude: 43.65333, longitude: -79.38389 },
    timeZoneId: 'America/Toronto',
  },
  weather: null,
};

async function storeAnswering(rest: Partial<ProfileApi> = {}): Promise<ProfileStore> {
  const api: ProfileApi = {
    getProfile: () => Promise.resolve(milan),
    lookUpPostalCode: () => new Promise(() => undefined),
    updateProfile: () => new Promise(() => undefined),
    ...rest,
  };
  TestBed.configureTestingModule({
    providers: [
      ProfileStore,
      { provide: PROFILE_API, useValue: api },
      { provide: CLOCK, useValue: { now: () => 1_000, minute: signal(0) } },
      {
        provide: TEAM_MEMBERSHIP,
        useValue: { current: signal({ teamId: 'n1', teammateId: 't1', teamName: 'Northwind' }) },
      },
    ],
  });
  const store = TestBed.inject(ProfileStore);
  await store.load();
  return store;
}

describe('ProfileStore', () => {
  it('holds the saved country and postal code as the draft, with nothing to save', async () => {
    const store = await storeAnswering();
    expect(store.state()).toBe('Ready');
    expect(store.countryCode()).toBe('IT');
    expect(store.postalCode()).toBe('20121');
    expect(store.canSave()).toBe(false);
  });

  it('offers saving once a new postal code is found, and not after it changes again', async () => {
    const store = await storeAnswering({ lookUpPostalCode: () => Promise.resolve(toronto) });
    store.setCountry('CA');
    store.setPostalCode('M5V 2T6');
    expect(store.canSave()).toBe(false);
    await store.lookUp();
    expect(store.lookup().kind).toBe('Found');
    expect(store.canSave()).toBe(true);
    store.setPostalCode('M5V 2T');
    expect(store.lookup().kind).toBe('Idle');
    expect(store.canSave()).toBe(false);
  });

  const refusals: [string, number, string][] = [
    ['postal_code_not_found', 422, 'NotFound'],
    ['validation_failed', 400, 'NotFound'],
    ['postal_code_unavailable', 503, 'Unavailable'],
    ['unreachable', 0, 'Unavailable'],
    ['rate_limited', 429, 'RateLimited'],
  ];
  for (const [code, status, kind] of refusals)
    it(`shows ${code} as ${kind}, keeps what was typed and offers no save`, async () => {
      const store = await storeAnswering({
        lookUpPostalCode: () => Promise.reject(new ApiError(code, status)),
      });
      store.setCountry('CA');
      store.setPostalCode('M5V 2T');
      await store.lookUp();
      expect(store.lookup().kind).toBe(kind);
      expect(store.postalCode()).toBe('M5V 2T');
      expect(store.canSave()).toBe(false);
    });

  it('saves the draft and takes the answer as saved, with nothing left to save', async () => {
    const sent: unknown[] = [];
    const moved: Profile = { ...milan, countryCode: 'CA', postalCode: 'M5V 2T6' };
    const store = await storeAnswering({
      lookUpPostalCode: () => Promise.resolve(toronto),
      updateProfile: (_, update) => {
        sent.push(update);
        return Promise.resolve(moved);
      },
    });
    store.setCountry('CA');
    store.setPostalCode('M5V 2T6');
    await store.lookUp();
    expect(await store.save()).toBe(true);
    expect(sent).toEqual([{ countryCode: 'CA', postalCode: 'M5V 2T6' }]);
    expect(store.profile()).toBe(moved);
    expect(store.lookup().kind).toBe('Idle');
    expect(store.canSave()).toBe(false);
  });

  it('does not look up an empty postal code', async () => {
    let asked = 0;
    const store = await storeAnswering({
      lookUpPostalCode: () => {
        asked++;
        return Promise.resolve(toronto);
      },
    });
    store.setPostalCode('  ');
    await store.lookUp();
    expect(asked).toBe(0);
    expect(store.lookup().kind).toBe('Idle');
  });
});
