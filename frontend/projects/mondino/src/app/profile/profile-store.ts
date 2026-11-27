import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  ApiError,
  CLOCK,
  type LookupState,
  PROFILE_API,
  type Profile,
  TEAM_MEMBERSHIP,
} from '@mondino/api';

/** Loading until the viewer's own profile is read; Failed when it could not be. */
export type ProfileState = 'Loading' | 'Ready' | 'Failed';

/**
 * Profile & Settings' state, provided at its route so it goes when the teammate leaves (L2-031,
 * L2-032). It holds the viewer's saved profile, the draft of their country and postal code, the
 * postal code lookup and the save. The postal code lives in these signals and the request bodies,
 * and in no storage or address. A pending request is aborted when a newer one starts and when the
 * screen is left.
 */
@Injectable()
export class ProfileStore {
  private readonly api = inject(PROFILE_API);
  private readonly membership = inject(TEAM_MEMBERSHIP);
  private readonly clock = inject(CLOCK);
  private pendingRead: AbortController | null = null;
  private pendingLookup: AbortController | null = null;
  private pendingSave: AbortController | null = null;

  private readonly profileValue = signal<Profile | null>(null);
  private readonly stateValue = signal<ProfileState>('Loading');
  private readonly countryCodeValue = signal('');
  private readonly postalCodeValue = signal('');
  private readonly lookupValue = signal<LookupState>({ kind: 'Idle' });
  private readonly savingValue = signal(false);

  /** The viewer's profile as saved. */
  readonly profile = this.profileValue.asReadonly();
  readonly state = this.stateValue.asReadonly();
  /** The draft: the country and the postal code as the viewer has them on the screen. */
  readonly countryCode = this.countryCodeValue.asReadonly();
  readonly postalCode = this.postalCodeValue.asReadonly();
  /** Where the lookup of a new postal code stands (L2-032). */
  readonly lookup = this.lookupValue.asReadonly();
  /** A save is being answered. */
  readonly saving = this.savingValue.asReadonly();

  /**
   * Saving is offered only for a new location whose postal code was found: never for one that
   * could not be found, checked or looked up (L2-032).
   */
  readonly canSave = computed(() => {
    const profile = this.profile();
    if (!profile || this.lookup().kind !== 'Found') return false;
    return (
      this.countryCode() !== profile.countryCode || this.postalCode() !== (profile.postalCode ?? '')
    );
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pendingRead?.abort();
      this.pendingLookup?.abort();
      this.pendingSave?.abort();
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
  }

  /** A new postal code: what was found or refused for the old one goes. */
  setPostalCode(postalCode: string): void {
    if (postalCode === this.postalCode() || this.saving()) return;
    this.postalCodeValue.set(postalCode);
    this.clearLookup();
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
   * Saves the new location: the pin moves to the city found (L2-032). Answers whether it saved, so
   * the screen can have the team read again. A refused save keeps the draft on the screen.
   */
  async save(): Promise<boolean> {
    const teamId = this.membership.current()?.teamId;
    if (!teamId || !this.canSave() || this.saving()) return false;
    const pending = new AbortController();
    this.pendingSave = pending;
    this.savingValue.set(true);
    try {
      const profile = await this.api.updateProfile(
        teamId,
        { countryCode: this.countryCode(), postalCode: this.postalCode() },
        pending.signal,
      );
      if (pending.signal.aborted) return false;
      this.saved(profile);
      return true;
    } catch {
      return false;
    } finally {
      if (this.pendingSave === pending) this.pendingSave = null;
      this.savingValue.set(false);
    }
  }

  private saved(profile: Profile): void {
    this.profileValue.set(profile);
    this.countryCodeValue.set(profile.countryCode);
    this.postalCodeValue.set(profile.postalCode ?? '');
    this.clearLookup();
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
