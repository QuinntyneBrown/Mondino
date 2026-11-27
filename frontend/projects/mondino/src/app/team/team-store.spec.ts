import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ApiError,
  CLOCK,
  TEAM_API,
  TEAM_MEMBERSHIP,
  type Moment,
  type Pin,
  type TeamApi,
  type TeamPins,
} from '@mondino/api';
import { TeamStore } from './team-store';

const minute = 60_000;
const start = Date.UTC(2025, 9, 27, 14, 5);

function pin(teammateId: string): Pin {
  return {
    teammateId,
    name: teammateId,
    colour: 'teammate-1',
    cityName: 'Milan',
    country: 'Italy',
    position: { latitude: 45.46, longitude: 9.19 },
    timeZoneId: 'Europe/Rome',
    sharesStatus: true,
    isViewer: teammateId === 'sofia',
    weather: null,
    weatherState: 'Unavailable',
  };
}

function team(...ids: string[]): TeamPins {
  return {
    teamId: 't1',
    teamName: 'Northwind',
    inviteToken: 'northwind-7Kq2',
    viewerTeammateId: 'sofia',
    pins: ids.map(pin),
  };
}

describe('TeamStore', () => {
  let answers: (() => Promise<TeamPins>)[];
  let reads: number;
  let now: ReturnType<typeof signal<number>>;
  let store: TeamStore;

  /** The clock's minute moves on, as the shell's clock ticks; effects then run. */
  async function tickTo(minutes: number): Promise<void> {
    now.set(start + minutes * minute);
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(async () => {
    answers = [];
    reads = 0;
    now = signal(start);
    const api: TeamApi = {
      getPins: () => {
        reads++;
        const next = answers.shift();
        return next ? next() : Promise.resolve(team('sofia'));
      },
      getMoments: () => Promise.resolve([] as Moment[]),
    };
    TestBed.configureTestingModule({
      providers: [
        TeamStore,
        { provide: TEAM_API, useValue: api },
        { provide: CLOCK, useValue: { now: () => now(), minute: now } },
        {
          provide: TEAM_MEMBERSHIP,
          useValue: {
            current: signal({ teamId: 't1', teammateId: 'sofia', teamName: 'Northwind' }),
            remember: () => undefined,
            forget: () => undefined,
          },
        },
      ],
    });
    store = TestBed.inject(TeamStore);
    answers.push(() => Promise.resolve(team('sofia', 'luca')));
    await store.load();
    TestBed.tick();
  });

  it('reads the team again at the minute 15 minutes after the last read, and not before', async () => {
    await tickTo(14);
    expect(reads).toBe(1);
    await tickTo(15);
    expect(reads).toBe(2);
    await tickTo(29);
    expect(reads).toBe(2);
    await tickTo(30);
    expect(reads).toBe(3);
  });

  it('reads at once at the first tick after a rest longer than 15 minutes', async () => {
    await tickTo(75);
    expect(reads).toBe(2);
  });

  it('notes the teammates a refresh brought, and the first read brings none', async () => {
    expect(store.arrivedIds()).toEqual([]);
    answers.push(() => Promise.resolve(team('sofia', 'luca', 'jordan')));
    await tickTo(15);
    expect(store.arrivedIds()).toEqual(['jordan']);
    expect(store.team()?.pins.length).toBe(3);
  });

  it('keeps the selection through a refresh', async () => {
    store.select('luca');
    await tickTo(15);
    expect(store.selectedId()).toBe('luca');
  });

  it('keeps the pins when a refresh fails, says so, and reads again at the next tick', async () => {
    answers.push(() => Promise.reject(new ApiError(ApiError.unreachable, 0)));
    await tickTo(15);
    expect(store.refreshFailed()).toBe(true);
    expect(store.team()?.pins.length).toBe(2);
    expect(store.refreshedAt()).toBe(start);
    expect(store.state()).toBe('Ready');

    await tickTo(16);
    expect(reads).toBe(3);
    expect(store.refreshFailed()).toBe(false);
    expect(store.refreshedAt()).toBe(start + 16 * minute);
  });

  it('forgets the team when a refresh finds the session ended', async () => {
    answers.push(() => Promise.reject(new ApiError('unauthorized', 401)));
    await tickTo(15);
    expect(store.state()).toBe('Forgotten');
    expect(store.refreshFailed()).toBe(false);
  });

  it('asks once while a refresh is pending', async () => {
    let answer!: (pins: TeamPins) => void;
    answers.push(() => new Promise((resolve) => (answer = resolve)));
    await tickTo(15);
    expect(store.refreshing()).toBe(true);
    await tickTo(16);
    expect(reads).toBe(2);
    answer(team('sofia', 'luca'));
    await Promise.resolve();
    await Promise.resolve();
    expect(store.refreshing()).toBe(false);
  });
});
