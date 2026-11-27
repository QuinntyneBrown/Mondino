import { computed, inject, signal } from '@angular/core';
import {
  ALL_MOMENT_KINDS,
  TEAM_MEMBERSHIP,
  type ClockFormat,
  type MomentKind,
  type Settings,
  type SettingsStore,
  type TemperatureUnit,
} from '@mondino/api';

/** Where the viewer's settings are kept in the browser's local storage. */
export const settingsKey = 'mondino.settings';

/** What the browser keeps: the display settings, for one teammate. */
interface Kept {
  readonly momentKinds: readonly MomentKind[];
  readonly temperatureUnit: TemperatureUnit | null;
  readonly clockFormat: ClockFormat | null;
}

const nothingKept: Kept = {
  momentKinds: ALL_MOMENT_KINDS,
  temperatureUnit: null,
  clockFormat: null,
};

/**
 * The viewer's `SettingsStore` from the browser's local storage (ADR 0020, ADR 0023): the kinds of
 * moment, the unit and the clock kept for the teammate the membership names, any value it does not
 * know dropped. With nothing kept for them, or storage blocked, all four kinds are on (L2-022) and
 * the unit and the clock are null, so the screens take the country's default. `replace` keeps the
 * backend's copy, which is the one that holds. It holds no switch, no postal code and no email.
 */
export class SettingsCache implements SettingsStore {
  private readonly teammateId = inject(TEAM_MEMBERSHIP).current()?.teammateId ?? null;
  private readonly kept = signal(read(this.teammateId));

  readonly momentKinds = computed(() => this.kept().momentKinds);
  readonly temperatureUnit = computed(() => this.kept().temperatureUnit);
  readonly clockFormat = computed(() => this.kept().clockFormat);

  replace(settings: Settings): void {
    const kept: Kept = {
      momentKinds: ALL_MOMENT_KINDS.filter((kind) => settings.momentKinds.includes(kind)),
      temperatureUnit: settings.temperatureUnit,
      clockFormat: settings.clockFormat,
    };
    this.kept.set(kept);
    try {
      localStorage.setItem(settingsKey, JSON.stringify({ teammateId: this.teammateId, ...kept }));
    } catch {
      // Storage blocked: the choice holds for this visit, and the backend keeps it.
    }
  }

  clear(): void {
    this.kept.set(nothingKept);
    try {
      localStorage.removeItem(settingsKey);
    } catch {
      // Nothing was kept.
    }
  }
}

function read(teammateId: string | null): Kept {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(settingsKey) ?? 'null');
    if (typeof kept !== 'object' || kept === null) return nothingKept;
    const {
      teammateId: whose,
      momentKinds,
      temperatureUnit,
      clockFormat,
    } = kept as Record<string, unknown>;
    if (whose !== teammateId) return nothingKept;
    return {
      momentKinds: Array.isArray(momentKinds)
        ? ALL_MOMENT_KINDS.filter((kind) => momentKinds.includes(kind))
        : ALL_MOMENT_KINDS,
      temperatureUnit:
        temperatureUnit === 'celsius' || temperatureUnit === 'fahrenheit' ? temperatureUnit : null,
      clockFormat: clockFormat === '24-hour' || clockFormat === '12-hour' ? clockFormat : null,
    };
  } catch {
    return nothingKept;
  }
}
