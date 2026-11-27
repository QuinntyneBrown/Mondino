import { InjectionToken, type Signal } from '@angular/core';
import type { MomentKind } from '../moments/moment';
import type { ClockFormat } from '../time/status';
import type { TemperatureUnit } from '../weather/weather';

/**
 * A teammate's own settings, as Profile & Settings reads and saves them (ADR 0023): the unit and
 * the clock they read (L2-019, L2-033), the kinds of moment that mark pins for them (L2-022), and
 * whether teammates see their weather and their status (L2-034). Only their own teammate receives
 * them.
 */
export interface Settings {
  readonly temperatureUnit: TemperatureUnit;
  readonly clockFormat: ClockFormat;
  readonly momentKinds: readonly MomentKind[];
  readonly sharesWeather: boolean;
  readonly sharesStatus: boolean;
}

/**
 * The viewer's own display settings, as the teammate screens read them (ADR 0020, ADR 0023): the
 * kinds of moment they chose to mark pins on the globe and fill "This week around the world"
 * (L2-022), all four to begin with, and the unit and the clock they read, null until a profile has
 * been read or saved in this browser, when the screens take the viewer's country's default. The
 * choice is the viewer's alone, and changes nothing for anyone else.
 */
export interface SettingsStore {
  readonly momentKinds: Signal<readonly MomentKind[]>;
  readonly temperatureUnit: Signal<TemperatureUnit | null>;
  readonly clockFormat: Signal<ClockFormat | null>;
  /** Replaces them with the backend's copy, from a read or a save of the profile. */
  replace(settings: Settings): void;
}

export const SETTINGS_STORE = new InjectionToken<SettingsStore>('SettingsStore');
