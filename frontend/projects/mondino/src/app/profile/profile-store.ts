import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  ALL_MOMENT_KINDS,
  ApiError,
  CLOCK,
  type ClockFormat,
  type LookupState,
  type MomentKind,
  PROFILE_API,
  type Profile,
  type ProfileUpdate,
  SETTINGS_STORE,
  type Settings,
  TEAM_MEMBERSHIP,
  type TemperatureUnit,
} from '@mondino/api';
import type { SaveBarState } from '@mondino/components';

/** Loading until the viewer's own profile is read; Failed when it could not be. */
export type ProfileState = 'Loading' | 'Ready' | 'Failed';

/** Where the last save stands (L2-035). */
export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

/** How long "Saved — your pin is up to date" stays before it goes by itself (L2-035). */
export const savedLifetime = 4000;

/**
 * Profile & Settings' state, provided at its route so it goes when the teammate leaves (L2-031 to
 * L2-035). It holds the viewer's saved profile, the draft of their country, postal code and
 * settings, the postal code lookup and the save. The postal code lives in these signals and the
 * request bodies, and in no storage or address. A pending request is aborted when a newer one starts
 * and when the screen is left; the confirmation's timer goes with it too.
 */
@Injectable()
export class ProfileStore {
  private readonly api = inject(PROFILE_API);
  private readonly membership = inject(TEAM_MEMBERSHIP);
  private readonly clock = inject(CLOCK);
  private readonly settingsStore = inject(SETTINGS_STORE);
  private savedTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingRead: AbortController | null = null;
  private pendingLookup: AbortController | null = null;
  private pendingSave: AbortController | null = null;

  private readonly profileValue = signal<Profile | null>(null);
  private readonly stateValue = signal<ProfileState>('Loading');
  private readonly countryCodeValue = signal('');
  private readonly postalCodeValue = signal('');
  private readonly lookupValue = signal<LookupState>({ kind: 'Idle' });
  private readonly settingsValue = signal<Settings | null>(null);
  private readonly saveStateValue = signal<SaveState>('idle');

  /** The viewer's profile as saved. */
  readonly profile = this.profileValue.asReadonly();
  readonly state = this.stateValue.asReadonly();
  /** The draft: the country and the postal code as the viewer has them on the screen. */
  readonly countryCode = this.countryCodeValue.asReadonly();
  readonly postalCode = this.postalCodeValue.asReadonly();
  /** Where the lookup of a new postal code stands (L2-032). */
  readonly lookup = this.lookupValue.asReadonly();
  /** The draft's settings: the unit, the clock, the kinds and the two switches (L2-033, L2-034). */
  readonly settings = this.settingsValue.asReadonly();
  readonly saveState = this.saveStateValue.asReadonly();
  /** A save is being answered. */
  readonly saving = computed(() => this.saveState() === 'saving');

  /**
   * A new location counts as a change only once its postal code was found: never one that could
   * not be found, checked or looked up (L2-032).
   */
  readonly locationChanged = computed(() => {
    const profile = this.profile();
    if (!profile || this.lookup().kind !== 'Found') return false;
    return (
      this.countryCode() !== profile.countryCode || this.postalCode() !== (profile.postalCode ?? '')
    );
  });

  /** The draft's settings differ from the saved ones; one changed back is no difference (L2-035). */
  readonly settingsChanged = computed(() => {
    const saved = this.profile()?.settings;
    const draft = this.settings();
    return !!saved && !!draft && !sameSettings(saved, draft);
  });

  /** Something on the screen is not saved yet (L2-035). */
  readonly hasUnsavedChanges = computed(() => this.locationChanged() || this.settingsChanged());

  /** What the bar for unsaved changes shows (L2-035). */
  readonly barState = computed<SaveBarState>(() => {
    const state = this.saveState();
    if (state === 'saving') return 'saving';
    if (this.hasUnsavedChanges()) return state === 'failed' ? 'failed' : 'unsaved';
    return state === 'saved' ? 'saved' : 'hidden';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pendingRead?.abort();
      this.pendingLookup?.abort();
      this.pendingSave?.abort();
      clearTimeout(this.savedTimer);
    });
  }

  /** Reads the viewer's own profile, as the screen opens and when "Try again" is used. */
  async load(): Promise<void> {
    const teamId = this.membership.current()?.teamId;
    this.pendingRead?.abort();
    const pending = new AbortController();
    this.pendingRead = pending;
    this.stateValue.set('Loading');
    try {
      if (!teamId) throw new ApiError('team_not_found', 404);
      this.saved(await this.api.getProfile(teamId, pending.signal));
      this.stateValue.set('Ready');
    } catch {
      if (!pending.signal.aborted) this.stateValue.set('Failed');
    } finally {
      if (this.pendingRead === pending) this.pendingRead = null;
    }
  }

  /** A new country: what was found or refused for the old one goes. */
  setCountry(countryCode: string): void {
    if (countryCode === this.countryCode() || this.saving()) return;
    this.countryCodeValue.set(countryCode);
    this.clearLookup();
    this.changed();
  }

  /** A new postal code: what was found or refused for the old one goes. */
  setPostalCode(postalCode: string): void {
    if (postalCode === this.postalCode() || this.saving()) return;
    this.postalCodeValue.set(postalCode);
    this.clearLookup();
    this.changed();
  }

  setTemperatureUnit(temperatureUnit: TemperatureUnit): void {
    this.changeSettings({ temperatureUnit });
  }

  setClockFormat(clockFormat: ClockFormat): void {
    this.changeSettings({ clockFormat });
  }

  /** Turns a kind of moment on or off for the globe (L2-022). */
  setMomentKind(kind: MomentKind, on: boolean): void {
    const kinds = this.settings()?.momentKinds ?? [];
    this.changeSettings({
      momentKinds: ALL_MOMENT_KINDS.filter((each) => (each === kind ? on : kinds.includes(each))),
    });
  }

  setSharesWeather(sharesWeather: boolean): void {
    this.changeSettings({ sharesWeather });
  }

  setSharesStatus(sharesStatus: boolean): void {
    this.changeSettings({ sharesStatus });
  }

  /**
   * "Look up": looks the postal code up for the chosen country, and changes nothing until it is
   * saved. One lookup runs at a time: a new one aborts the pending one.
   */
  async lookUp(): Promise<void> {
    const teamId = this.membership.current()?.teamId;
    const postalCode = this.postalCode();
    if (!teamId || postalCode.trim().length === 0 || this.saving()) return;
    this.pendingLookup?.abort();
    const pending = new AbortController();
    this.pendingLookup = pending;
    this.lookupValue.set({ kind: 'Locating', postalCode });
    try {
      const result = await this.api.lookUpPostalCode(
        teamId,
        this.countryCode(),
        postalCode,
        pending.signal,
      );
      if (!pending.signal.aborted) this.lookupValue.set({ kind: 'Found', result });
    } catch (error) {
      if (!pending.signal.aborted) this.lookupValue.set(this.refused(error, postalCode));
    } finally {
      if (this.pendingLookup === pending) this.pendingLookup = null;
    }
  }

  /**
   * Saves what changed: a new location, whose pin moves to the city found (L2-032), and the
   * settings, which then apply on every screen (L2-033). It says "Saved" for 4 seconds; a refused
   * save keeps the draft on the screen and says so until a save succeeds or the changes are undone
   * (L2-035). Answers whether the pin moved, so the screen can have the team read again.
   */
  async save(): Promise<boolean> {
    const teamId = this.membership.current()?.teamId;
    const settings = this.settings();
    if (!teamId || !this.hasUnsavedChanges() || this.saving()) return false;
    const moving = this.locationChanged();
    const update: ProfileUpdate = {
      ...(moving ? { countryCode: this.countryCode(), postalCode: this.postalCode() } : {}),
      ...(this.settingsChanged() && settings ? { settings } : {}),
    };
    const pending = new AbortController();
    this.pendingSave = pending;
    clearTimeout(this.savedTimer);
    this.saveStateValue.set('saving');
    try {
      const profile = await this.api.updateProfile(teamId, update, pending.signal);
      if (pending.signal.aborted) return false;
      this.saved(profile);
      this.saveStateValue.set('saved');
      this.savedTimer = setTimeout(() => this.saveStateValue.set('idle'), savedLifetime);
      return moving;
    } catch {
      if (!pending.signal.aborted) this.saveStateValue.set('failed');
      return false;
    } finally {
      if (this.pendingSave === pending) this.pendingSave = null;
    }
  }

  /** The backend's copy: on the screen as saved, and on every screen through `SETTINGS_STORE`. */
  private saved(profile: Profile): void {
    this.profileValue.set(profile);
    this.countryCodeValue.set(profile.countryCode);
    this.postalCodeValue.set(profile.postalCode ?? '');
    this.settingsValue.set(profile.settings);
    this.settingsStore.replace(profile.settings);
    this.clearLookup();
  }

  private changeSettings(change: Partial<Settings>): void {
    const settings = this.settings();
    if (!settings || this.saving()) return;
    this.settingsValue.set({ ...settings, ...change });
    this.changed();
  }

  /** A failure is about changes still on the screen: once they are undone, it goes. */
  private changed(): void {
    if (this.saveState() === 'failed' && !this.hasUnsavedChanges()) this.saveStateValue.set('idle');
  }

  private clearLookup(): void {
    this.pendingLookup?.abort();
    this.pendingLookup = null;
    this.lookupValue.set({ kind: 'Idle' });
  }

  private refused(error: unknown, postalCode: string): LookupState {
    const code = error instanceof ApiError ? error.code : 'unexpected';
    if (code === 'postal_code_not_found' || code === 'validation_failed')
      return { kind: 'NotFound', postalCode };
    if (code === 'rate_limited') {
      const seconds = error instanceof ApiError ? (error.retryAfterSeconds ?? 60) : 60;
      return { kind: 'RateLimited', retryAt: this.clock.now() + seconds * 1000 };
    }
    return { kind: 'Unavailable' };
  }
}

/** Two sets of settings alike field by field, the kinds whatever their order. */
function sameSettings(a: Settings, b: Settings): boolean {
  return (
    a.temperatureUnit === b.temperatureUnit &&
    a.clockFormat === b.clockFormat &&
    a.sharesWeather === b.sharesWeather &&
    a.sharesStatus === b.sharesStatus &&
    a.momentKinds.length === b.momentKinds.length &&
    a.momentKinds.every((kind) => b.momentKinds.includes(kind))
  );
}
