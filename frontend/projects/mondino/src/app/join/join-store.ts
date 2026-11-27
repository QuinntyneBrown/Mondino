import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  ApiError,
  CLOCK,
  type CityResult,
  INVITE_API,
  type Invite,
  type LookupState,
} from '@mondino/api';
import type { InviteState } from './invite-state';

/** The most characters a name may have (L2-002). */
export const nameLimit = 60;

/** How long "Your city" waits after typing stops before it searches. */
export const citySearchDelay = 300;

/** What is wrong with the name, if anything. */
export type NameProblem = 'Missing' | 'TooLong' | null;

/**
 * The Join screen's state, provided at its route so it goes when the person leaves. It opens the
 * invite link and maps the answer, or the refusal's code, to an `InviteState`, and holds the form:
 * the name, the country and the postal code, which is never written anywhere but this signal. A
 * pending request is aborted when the screen is left or the link is opened again.
 */
@Injectable()
export class JoinStore {
  private readonly api = inject(INVITE_API);
  private pending: AbortController | null = null;
  private readonly clock = inject(CLOCK);
  private pendingLookup: AbortController | null = null;
  private pendingSearch: AbortController | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private inviteToken = '';
  /** The lookup was down: it stays down for the life of the store, and is tried again next time. */
  private lookupDown = false;

  private readonly inviteValue = signal<Invite | null>(null);
  private readonly stateValue = signal<InviteState>('Loading');
  private readonly submittedValue = signal(false);

  /** The team as its invite link shows it, once it is open. */
  readonly invite = this.inviteValue.asReadonly();
  readonly inviteState = this.stateValue.asReadonly();

  readonly name = signal('');
  private readonly countryCodeValue = signal('');
  private readonly postalCodeValue = signal('');
  private readonly lookupValue = signal<LookupState>({ kind: 'Idle' });

  readonly countryCode = this.countryCodeValue.asReadonly();
  /** The postal code as typed. It lives in this signal and the request body, and nowhere else. */
  readonly postalCode = this.postalCodeValue.asReadonly();
  /** Where the postal code lookup stands (L2-003, L2-004). */
  readonly lookup = this.lookupValue.asReadonly();

  private readonly cityTextValue = signal('');
  private readonly cityResultsValue = signal<readonly CityResult[]>([]);
  private readonly chosenCityValue = signal<CityResult | null>(null);
  private readonly nowValue = signal(0);

  /** What is typed in "Your city", while the lookup is down (L2-004). */
  readonly cityText = this.cityTextValue.asReadonly();
  readonly cityResults = this.cityResultsValue.asReadonly();
  readonly chosenCity = this.chosenCityValue.asReadonly();

  /** Whole seconds until a rate-limited lookup may be tried again, while it is. */
  readonly secondsToWait = computed(() => {
    const lookup = this.lookup();
    if (lookup.kind !== 'RateLimited') return 0;
    return Math.max(0, Math.ceil((lookup.retryAt - this.nowValue()) / 1000));
  });

  /** The chosen country, with the form its postal codes take. */
  readonly country = computed(
    () => this.invite()?.countries.find((country) => country.code === this.countryCode()) ?? null,
  );

  /** The form has been submitted, so its problems are shown. */
  readonly submitted = this.submittedValue.asReadonly();

  readonly nameProblem = computed<NameProblem>(() => {
    const name = this.name().trim();
    if (name.length === 0) return 'Missing';
    return name.length > nameLimit ? 'TooLong' : null;
  });

  readonly postalCodeMissing = computed(() => this.postalCode().trim().length === 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pending?.abort();
      this.pendingLookup?.abort();
      this.pendingSearch?.abort();
      if (this.searchTimer !== null) clearTimeout(this.searchTimer);
      this.stopCountdown();
    });
  }

  async open(inviteToken: string): Promise<void> {
    this.inviteToken = inviteToken;
    this.pending?.abort();
    const pending = new AbortController();
    this.pending = pending;
    this.inviteValue.set(null);
    this.stateValue.set('Loading');
    try {
      const invite = await this.api.getInvite(inviteToken, pending.signal);
      if (pending.signal.aborted) return;
      this.inviteValue.set(invite.alreadyJoined ? null : invite);
      if (!this.countryCode()) this.countryCodeValue.set(invite.countries[0]?.code ?? '');
      this.stateValue.set(invite.alreadyJoined ? 'AlreadyJoined' : 'Ready');
    } catch (error) {
      if (pending.signal.aborted) return;
      this.stateValue.set(stateFor(error));
    } finally {
      if (this.pending === pending) this.pending = null;
    }
  }

  /** A new postal code: whatever was found or refused for the old one goes (L2-003, L2-004). */
  setPostalCode(postalCode: string): void {
    if (postalCode === this.postalCode()) return;
    this.postalCodeValue.set(postalCode);
    this.clearFound();
  }

  /** A new country: whatever was found or refused goes, and so does a city chosen. */
  setCountry(countryCode: string): void {
    if (countryCode === this.countryCode()) return;
    this.countryCodeValue.set(countryCode);
    this.clearFound();
    this.setCityText('');
  }

  /**
   * Aborts a pending lookup and returns to `Idle` (or `Unavailable`, while the lookup is down):
   * the found city and the new pin go. A countdown that is running keeps running.
   */
  clearFound(): void {
    const kind = this.lookup().kind;
    if (kind === 'Idle' || kind === 'Unavailable' || kind === 'RateLimited') return;
    this.pendingLookup?.abort();
    this.pendingLookup = null;
    this.lookupValue.set(this.lookupDown ? { kind: 'Unavailable' } : { kind: 'Idle' });
  }

  /** The postal code field was left: an untried postal code is looked up. */
  leavePostalCode(): void {
    if (!this.postalCodeMissing() && this.lookup().kind === 'Idle') void this.lookUp();
  }

  /** Typing in "Your city": what was chosen goes, and the cities are searched once typing stops. */
  setCityText(text: string): void {
    this.cityTextValue.set(text);
    this.chosenCityValue.set(null);
    if (this.lookup().kind === 'Found') this.clearFound();
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = null;
    this.pendingSearch?.abort();
    if (text.trim().length === 0) {
      this.cityResultsValue.set([]);
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.searchCities();
    }, citySearchDelay);
  }

  /** Searches the cities of the chosen country, aborting the search before it. */
  async searchCities(): Promise<void> {
    this.pendingSearch?.abort();
    const pending = new AbortController();
    this.pendingSearch = pending;
    try {
      const results = await this.api.searchCities(
        this.inviteToken,
        this.countryCode(),
        this.cityText().trim(),
        pending.signal,
      );
      if (!pending.signal.aborted) this.cityResultsValue.set(results);
    } catch {
      if (!pending.signal.aborted) this.cityResultsValue.set([]);
    } finally {
      if (this.pendingSearch === pending) this.pendingSearch = null;
    }
  }

  /** A city is chosen in the list: its name fills the field. */
  chooseCity(city: CityResult): void {
    this.chosenCityValue.set(city);
    this.cityTextValue.set(city.city.name);
    this.cityResultsValue.set([]);
  }

  /** Places the pin at the chosen city, as a postal code would (L2-004, L2-006). */
  placeAtCity(): void {
    const chosen = this.chosenCity();
    if (chosen)
      this.lookupValue.set({ kind: 'Found', result: { city: chosen.city, weather: null } });
  }

  /**
   * Looks the postal code up for the chosen country. One lookup runs at a time: a new one aborts
   * the pending one.
   */
  async lookUp(): Promise<void> {
    this.pendingLookup?.abort();
    const pending = new AbortController();
    this.pendingLookup = pending;
    const postalCode = this.postalCode();
    this.lookupValue.set({ kind: 'Locating', postalCode });
    try {
      const result = await this.api.lookUpPostalCode(
        this.inviteToken,
        this.countryCode(),
        postalCode,
        pending.signal,
      );
      if (pending.signal.aborted) return;
      this.lookupValue.set({ kind: 'Found', result });
    } catch (error) {
      if (pending.signal.aborted) return;
      this.refused(error, postalCode);
    } finally {
      if (this.pendingLookup === pending) this.pendingLookup = null;
    }
  }

  /**
   * Submits the form: with a problem it is marked and nothing is looked up; with none, a postal
   * code not yet found is looked up. Answers whether the form had a problem, so the screen can
   * move focus to the summary.
   */
  submit(): boolean {
    this.submittedValue.set(true);
    if (this.lookupDown) {
      if (this.nameProblem() !== null) return true;
      if (this.lookup().kind === 'Unavailable') this.placeAtCity();
      return false;
    }
    if (this.nameProblem() !== null || this.postalCodeMissing()) return true;
    if (this.lookup().kind === 'Idle' || this.lookup().kind === 'NotFound') void this.lookUp();
    return false;
  }

  private refused(error: unknown, postalCode: string): void {
    const code = error instanceof ApiError ? error.code : 'unexpected';
    if (code === 'invite_not_found') {
      this.lookupValue.set({ kind: 'Idle' });
      this.inviteValue.set(null);
      this.stateValue.set('NotFound');
      return;
    }
    if (code === 'postal_code_unavailable') {
      this.lookupDown = true;
      this.lookupValue.set({ kind: 'Unavailable' });
    } else if (code === 'rate_limited') {
      const seconds = error instanceof ApiError ? (error.retryAfterSeconds ?? 60) : 60;
      this.startCountdown(this.clock.now() + seconds * 1000);
    } else {
      this.lookupValue.set(
        code === 'postal_code_not_found' ? { kind: 'NotFound', postalCode } : { kind: 'Idle' },
      );
    }
  }

  /** One timer counts down to `retryAt`; at zero it stops and the lookup can be tried again. */
  private startCountdown(retryAt: number): void {
    this.stopCountdown();
    this.nowValue.set(this.clock.now());
    this.lookupValue.set({ kind: 'RateLimited', retryAt });
    this.countdownTimer = setInterval(() => {
      this.nowValue.set(this.clock.now());
      if (this.secondsToWait() === 0) {
        this.stopCountdown();
        this.lookupValue.set({ kind: 'Idle' });
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }
}

/** A refused open says the link no longer works only for `invite_not_found`; anything else failed. */
function stateFor(error: unknown): InviteState {
  return error instanceof ApiError && error.code === 'invite_not_found' ? 'NotFound' : 'Failed';
}
