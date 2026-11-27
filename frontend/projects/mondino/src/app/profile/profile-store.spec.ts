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
  SETTINGS_STORE,
  type Settings,
  type SettingsStore,
  TEAM_MEMBERSHIP,
} from '@mondino/api';
import { ProfileStore, savedLifetime } from './profile-store';

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
const italian: Settings = {
  temperatureUnit: 'celsius',
  clockFormat: '24-hour',
  momentKinds: ['holiday', 'formula-1', 'local-event', 'sport'],
  sharesWeather: true,
  sharesStatus: true,
};
const milan: Profile = {
  teamName: 'Northwind',
  pin,
  countryCode: 'IT',
  postalCode: '20121',
  settings: italian,
};
/** What the screens were given through `SETTINGS_STORE`, in order. */
let replaced: Settings[] = [];
const settingsStore: SettingsStore = {
  momentKinds: signal([]),
  temperatureUnit: signal(null),
  clockFormat: signal(null),
  replace: (settings) => replaced.push(settings),
};
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
      { provide: SETTINGS_STORE, useValue: settingsStore },
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
  beforeEach(() => (replaced = []));

  it('holds the saved country and postal code as the draft, with nothing to save', async () => {
    const store = await storeAnswering();
    expect(store.state()).toBe('Ready');
    expect(store.countryCode()).toBe('IT');
    expect(store.postalCode()).toBe('20121');
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it('offers saving once a new postal code is found, and not after it changes again', async () => {
    const store = await storeAnswering({ lookUpPostalCode: () => Promise.resolve(toronto) });
    store.setCountry('CA');
    store.setPostalCode('M5V 2T6');
    expect(store.hasUnsavedChanges()).toBe(false);
    await store.lookUp();
    expect(store.lookup().kind).toBe('Found');
    expect(store.hasUnsavedChanges()).toBe(true);
    store.setPostalCode('M5V 2T');
    expect(store.lookup().kind).toBe('Idle');
    expect(store.hasUnsavedChanges()).toBe(false);
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
      expect(store.hasUnsavedChanges()).toBe(false);
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
    expect(store.barState()).toBe('saved');
    expect(store.profile()).toBe(moved);
    expect(store.lookup().kind).toBe('Idle');
    expect(store.hasUnsavedChanges()).toBe(false);
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

  it('gives the screens the backend’s settings as the profile is read', async () => {
    await storeAnswering();
    expect(replaced).toEqual([italian]);
  });

  it('counts a changed setting as unsaved, and one changed back as nothing to save', async () => {
    const store = await storeAnswering();
    store.setTemperatureUnit('fahrenheit');
    expect(store.hasUnsavedChanges()).toBe(true);
    expect(store.barState()).toBe('unsaved');
    store.setTemperatureUnit('celsius');
    expect(store.hasUnsavedChanges()).toBe(false);
    expect(store.barState()).toBe('hidden');
    store.setMomentKind('formula-1', false);
    store.setMomentKind('formula-1', true);
    expect(store.settings()?.momentKinds).toEqual(italian.momentKinds);
    expect(store.barState()).toBe('hidden');
  });

  it('sends only the settings when the location is unchanged, and applies the answer everywhere', async () => {
    const sent: unknown[] = [];
    const chosen: Settings = { ...italian, temperatureUnit: 'fahrenheit', sharesStatus: false };
    const store = await storeAnswering({
      updateProfile: (_, update) => {
        sent.push(update);
        return Promise.resolve({ ...milan, settings: chosen });
      },
    });
    store.setTemperatureUnit('fahrenheit');
    store.setSharesStatus(false);
    expect(await store.save()).toBe(false);
    expect(sent).toEqual([{ settings: chosen }]);
    expect(store.profile()?.settings).toBe(chosen);
    expect(replaced.at(-1)).toBe(chosen);
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  describe('the bar after a save', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('says "Saving" until the save answers, then "Saved" for 4 seconds', async () => {
      let answer!: (profile: Profile) => void;
      const store = await storeAnswering({
        updateProfile: () => new Promise((resolve) => (answer = resolve)),
      });
      store.setClockFormat('12-hour');
      const saving = store.save();
      expect(store.barState()).toBe('saving');
      store.setClockFormat('24-hour');
      expect(store.settings()?.clockFormat).toBe('12-hour');
      answer({ ...milan, settings: { ...italian, clockFormat: '12-hour' } });
      await saving;
      expect(store.barState()).toBe('saved');
      vi.advanceTimersByTime(savedLifetime - 1);
      expect(store.barState()).toBe('saved');
      vi.advanceTimersByTime(1);
      expect(store.barState()).toBe('hidden');
    });

    it('keeps the changes after a failed save and says so until they are saved or undone', async () => {
      let fail = true;
      const store = await storeAnswering({
        updateProfile: () =>
          fail
            ? Promise.reject(new ApiError('unexpected', 500))
            : Promise.resolve({ ...milan, settings: { ...italian, sharesWeather: false } }),
      });
      store.setSharesWeather(false);
      await store.save();
      expect(store.barState()).toBe('failed');
      expect(store.settings()?.sharesWeather).toBe(false);
      vi.advanceTimersByTime(60_000);
      expect(store.barState()).toBe('failed');
      store.setSharesWeather(true);
      expect(store.barState()).toBe('hidden');
      store.setSharesWeather(false);
      expect(store.barState()).toBe('unsaved');
      await store.save();
      fail = false;
      expect(store.barState()).toBe('failed');
      await store.save();
      expect(store.barState()).toBe('saved');
      expect(replaced.at(-1)?.sharesWeather).toBe(false);
    });

    it('clears its timer when the screen is left', async () => {
      const store = await storeAnswering({ updateProfile: () => Promise.resolve(milan) });
      store.setClockFormat('12-hour');
      await store.save();
      expect(vi.getTimerCount()).toBe(1);
      TestBed.resetTestingModule();
      expect(vi.getTimerCount()).toBe(0);
      expect(store.barState()).toBe('saved');
    });
  });
});
