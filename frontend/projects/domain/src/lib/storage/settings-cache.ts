import { inject, signal } from '@angular/core';
import {
  ALL_MOMENT_KINDS,
  TEAM_MEMBERSHIP,
  type MomentKind,
  type SettingsStore,
} from '@mondino/api';

/** Where the viewer's settings are kept in the browser's local storage. */
export const settingsKey = 'mondino.settings';

/**
 * The viewer's `SettingsStore` from the browser's local storage (ADR 0020): the kinds of moment
 * kept for the teammate the membership names, any it does not know dropped. With nothing kept for
 * them, or storage blocked, all four kinds are on (L2-022). It holds no postal code and no email.
 */
export class SettingsCache implements SettingsStore {
  private readonly kinds = signal(read(inject(TEAM_MEMBERSHIP).current()?.teammateId ?? null));

  readonly momentKinds = this.kinds.asReadonly();
}

function read(teammateId: string | null): readonly MomentKind[] {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(settingsKey) ?? 'null');
    if (typeof kept !== 'object' || kept === null) return ALL_MOMENT_KINDS;
    const { teammateId: whose, momentKinds } = kept as Record<string, unknown>;
    if (whose !== teammateId || !Array.isArray(momentKinds)) return ALL_MOMENT_KINDS;
    return ALL_MOMENT_KINDS.filter((kind) => momentKinds.includes(kind));
  } catch {
    return ALL_MOMENT_KINDS;
  }
}
