// Traces to: L2-022
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ALL_MOMENT_KINDS, TEAM_MEMBERSHIP, type TeamMembership } from '@mondino/api';
import { SettingsCache, settingsKey } from './settings-cache';

const membership = (teammateId: string): TeamMembership => ({
  current: signal({ teamId: 't', teammateId, teamName: 'Northwind' }),
  remember: () => undefined,
  forget: () => undefined,
});

function cacheFor(teammateId: string): SettingsCache {
  TestBed.configureTestingModule({
    providers: [{ provide: TEAM_MEMBERSHIP, useValue: membership(teammateId) }, SettingsCache],
  });
  return TestBed.inject(SettingsCache);
}

describe('SettingsCache', () => {
  afterEach(() => localStorage.removeItem(settingsKey));

  it('has every kind on with nothing kept', () => {
    expect(cacheFor('sofia').momentKinds()).toEqual(ALL_MOMENT_KINDS);
  });

  it('reads the kinds kept for the viewer, in the switches’ order, dropping one it does not know', () => {
    localStorage.setItem(
      settingsKey,
      JSON.stringify({ teammateId: 'sofia', momentKinds: ['sport', 'comet', 'holiday'] }),
    );
    expect(cacheFor('sofia').momentKinds()).toEqual(['holiday', 'sport']);
  });

  it('reads every kind off as none', () => {
    localStorage.setItem(settingsKey, JSON.stringify({ teammateId: 'sofia', momentKinds: [] }));
    expect(cacheFor('sofia').momentKinds()).toEqual([]);
  });

  it('ignores another teammate’s kinds, and kept data of the wrong shape', () => {
    localStorage.setItem(settingsKey, JSON.stringify({ teammateId: 'luca', momentKinds: [] }));
    expect(cacheFor('sofia').momentKinds()).toEqual(ALL_MOMENT_KINDS);
    TestBed.resetTestingModule();
    localStorage.setItem(settingsKey, '{"teammateId":"sofia","momentKinds":"none"}');
    expect(cacheFor('sofia').momentKinds()).toEqual(ALL_MOMENT_KINDS);
    TestBed.resetTestingModule();
    localStorage.setItem(settingsKey, 'not json');
    expect(cacheFor('sofia').momentKinds()).toEqual(ALL_MOMENT_KINDS);
  });
});
