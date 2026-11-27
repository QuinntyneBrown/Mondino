import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  ApiError,
  CLOCK,
  type CityResult,
  type CreatedTeam,
  type LookupState,
  TEAM_CREATION_API,
} from '@mondino/api';
import { isEmailAddress, supportedCountries } from '@mondino/domain';
import type { CreateTeamState } from './create-team-state';

/** The most characters a team's name and a name may have (L2-053, docs/adr/0009). */
export const nameLimit = 60;

/** How long "Your city" waits after typing stops before it searches. */
export const citySearchDelay = 300;

/** The fields of the form, in the order a person meets them. */
export type CreateTeamField = 'team' | 'name' | 'email' | 'postal';

/** What is wrong with one field. */
export type FieldProblem = 'Missing' | 'TooLong' | 'NotAnEmail';

/**
 * Create Team's state, provided at its route so it goes when the person leaves. It holds the form,
 * the postal code lookup and making the team. The postal code and the email live in these signals
 * and the request body, and nowhere else. Every pending request and timer stops when the screen is
 * left.
 */
@Injectable()
export class CreateTeamStore {
  private readonly api = inject(TEAM_CREATION_API);
  private readonly clock = inject(CLOCK);
  private pendingLookup: AbortController | null = null;
  private pendingSearch: AbortController | null = null;
  private pendingCreate: AbortController | null = null;
  /** The lookup that is running, so "Create team" pressed meanwhile waits for it. */
  private running: Promise<boolean> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  /** One id for every request from this screen, so a retried request makes no second team. */
  private readonly createRequestId = crypto.randomUUID();
  /** The lookup was down: it stays down for the life of the store, and is tried again next time. */
  private lookupDown = false;

  readonly countries = supportedCountries;

  readonly teamName = signal('');
  readonly name = signal('');
  readonly email = signal('');
  private readonly countryCodeValue = signal(supportedCountries[0]?.code ?? '');
  private readonly postalCodeValue = signal('');
  private readonly lookupValue = signal<LookupState>({ kind: 'Idle' });
  private readonly stateValue = signal<CreateTeamState>({ kind: 'Idle' });
  private readonly submittedValue = signal(false);
  private readonly cityTextValue = signal('');
  private readonly cityResultsValue = signal<readonly CityResult[]>([]);
  private readonly chosenCityValue = signal<CityResult | null>(null);
  private readonly nowValue = signal(0);

  readonly countryCode = this.countryCodeValue.asReadonly();
  /** The postal code as typed. */
  readonly postalCode = this.postalCodeValue.asReadonly();
  /** Where the postal code lookup stands (L2-003, L2-004). */
  readonly lookup = this.lookupValue.asReadonly();
  /** Where making the team stands. */
  readonly state = this.stateValue.asReadonly();
  /** The form has been submitted, so its problems are shown. */
  readonly submitted = this.submittedValue.asReadonly();
  readonly cityText = this.cityTextValue.asReadonly();
  readonly cityResults = this.cityResultsValue.asReadonly();
  readonly chosenCity = this.chosenCityValue.asReadonly();

  readonly country = computed(
    () => this.countries.find((country) => country.code === this.countryCode()) ?? null,
  );

  /** What is wrong with each field, whether or not it is shown yet. */
  readonly problems = computed<Partial<Record<CreateTeamField, FieldProblem>>>(() => {
    const problems: Partial<Record<CreateTeamField, FieldProblem>> = {};
    const team = nameProblem(this.teamName());
    if (team) problems.team = team;
    const name = nameProblem(this.name());
    if (name) problems.name = name;
    const email = this.email().trim();
    if (email.length === 0) problems.email = 'Missing';
    else if (!isEmailAddress(email)) problems.email = 'NotAnEmail';
    if (!this.lookupDown && this.postalCode().trim().length === 0) problems.postal = 'Missing';
    return problems;
  });

  /** Whole seconds until a rate-limited postal code lookup may be tried again, while it is. */
  readonly secondsToWait = computed(() => {
    const lookup = this.lookup();
    if (lookup.kind !== 'RateLimited') return 0;
    return Math.max(0, Math.ceil((lookup.retryAt - this.nowValue()) / 1000));
  });

  /** The form cannot be changed while the team is being made. */
  readonly locked = computed(() => this.state().kind === 'Creating');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pendingLookup?.abort();
      this.pendingSearch?.abort();
      this.pendingCreate?.abort();
      if (this.searchTimer !== null) clearTimeout(this.searchTimer);
      this.stopCountdown();
    });
  }

  setTeamName(value: string): void {
    if (!this.locked()) this.teamName.set(value);
  }

  setName(value: string): void {
    if (!this.locked()) this.name.set(value);
  }

  setEmail(value: string): void {
    if (!this.locked()) this.email.set(value);
  }

  /** A new postal code: whatever was found or refused for the old one goes. */
  setPostalCode(postalCode: string): void {
    if (postalCode === this.postalCode() || this.locked()) return;
    this.postalCodeValue.set(postalCode);
    this.clearFound();
  }

  /** A new country: whatever was found or refused goes, and so does a city chosen. */
  setCountry(countryCode: string): void {
    if (countryCode === this.countryCode() || this.locked()) return;
    this.countryCodeValue.set(countryCode);
    this.clearFound();
    this.setCityText('');
  }

  /** The postal code field was left: an untried postal code is looked up. */
  leavePostalCode(): void {
    if (this.postalCode().trim().length > 0 && this.lookup().kind === 'Idle') void this.lookUp();
  }

  /** Typing in "Your city": what was chosen goes, and the cities are searched once typing stops. */
  setCityText(text: string): void {
    if (this.locked()) return;
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

  /** A city is chosen in the list: its name fills the field and the pin goes there. */
  chooseCity(city: CityResult): void {
    this.chosenCityValue.set(city);
    this.cityTextValue.set(city.city.name);
    this.cityResultsValue.set([]);
    this.lookupValue.set({ kind: 'Found', result: { city: city.city, weather: null } });
  }

  /** Looks the postal code up. One lookup runs at a time: a new one aborts the pending one. */
  lookUp(): Promise<boolean> {
    const running = this.find();
    this.running = running;
    void running.finally(() => {
      if (this.running === running) this.running = null;
    });
    return running;
  }

  private async find(): Promise<boolean> {
    this.pendingLookup?.abort();
    const pending = new AbortController();
    this.pendingLookup = pending;
    const postalCode = this.postalCode();
    this.lookupValue.set({ kind: 'Locating', postalCode });
    try {
      const result = await this.api.lookUpPostalCode(
        this.countryCode(),
        postalCode,
        pending.signal,
      );
      if (pending.signal.aborted) return false;
      this.lookupValue.set({ kind: 'Found', result });
      return true;
    } catch (error) {
      if (!pending.signal.aborted) this.refused(error, postalCode);
      return false;
    } finally {
      if (this.pendingLookup === pending) this.pendingLookup = null;
    }
  }

  /**
   * "Create team": with a problem, it is marked and nothing is sent, and the answer is the first
   * field that is wrong. Otherwise a postal code not yet found is looked up, and the team is made
   * at the city found, once a lookup that is running has answered. A second press while it is
   * being made does nothing.
   */
  async submit(): Promise<CreateTeamField | null> {
    const kind = this.lookup().kind;
    if (this.locked() || kind === 'RateLimited') return null;
    this.submittedValue.set(true);
    const first = (['team', 'name', 'email', 'postal'] as const).find((f) => this.problems()[f]);
    if (first) return first;
    if (kind === 'Unavailable') return null;
    if (kind === 'Locating') {
      if (!(await this.running)) return null;
    } else if (kind !== 'Found' && !(await this.lookUp())) return null;
    await this.create();
    return null;
  }

  /** Makes the team at the city found (L2-053). What was typed is kept whatever the answer. */
  private async create(): Promise<void> {
    const lookup = this.lookup();
    if (lookup.kind !== 'Found' || this.locked()) return;
    const chosen = this.chosenCity();
    const pending = new AbortController();
    this.pendingCreate = pending;
    this.stateValue.set({ kind: 'Creating' });
    try {
      const team: CreatedTeam = await this.api.createTeam(
        {
          teamName: this.teamName().trim(),
          name: this.name().trim(),
          email: this.email().trim(),
          countryCode: this.countryCode(),
          postalCode: chosen ? null : this.postalCode(),
          cityId: chosen ? chosen.cityId : null,
          createRequestId: this.createRequestId,
        },
        pending.signal,
      );
      if (!pending.signal.aborted) this.stateValue.set({ kind: 'Created', team });
    } catch (error) {
      if (pending.signal.aborted) return;
      const code = error instanceof ApiError ? error.code : 'unexpected';
      // Making a team has no rate limit (ADR 0016): a 429 from it is a failure like any other.
      this.stateValue.set({ kind: 'Failed' });
      if (code === 'postal_code_not_found' || code === 'postal_code_unavailable')
        this.refused(error, this.postalCode());
    } finally {
      if (this.pendingCreate === pending) this.pendingCreate = null;
    }
  }

  private async searchCities(): Promise<void> {
    this.pendingSearch?.abort();
    const pending = new AbortController();
    this.pendingSearch = pending;
    try {
      const results = await this.api.searchCities(
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

  /** The found city and the new pin go, as does a failure; a countdown that runs keeps running. */
  private clearFound(): void {
    if (this.state().kind === 'Failed') this.stateValue.set({ kind: 'Idle' });
    const kind = this.lookup().kind;
    if (kind === 'Idle' || kind === 'Unavailable' || kind === 'RateLimited') return;
    this.pendingLookup?.abort();
    this.pendingLookup = null;
    this.lookupValue.set(this.lookupDown ? { kind: 'Unavailable' } : { kind: 'Idle' });
  }

  private refused(error: unknown, postalCode: string): void {
    const code = error instanceof ApiError ? error.code : 'unexpected';
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

  /** One timer counts down to `retryAt`; at zero it stops and the button comes back. */
  private startCountdown(retryAt: number): void {
    this.stopCountdown();
    this.nowValue.set(this.clock.now());
    this.lookupValue.set({ kind: 'RateLimited', retryAt });
    this.countdownTimer = setInterval(() => {
      this.nowValue.set(this.clock.now());
      if (this.secondsToWait() === 0) {
        this.stopCountdown();
        this.lookupValue.set(this.lookupDown ? { kind: 'Unavailable' } : { kind: 'Idle' });
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  }
}

function nameProblem(value: string): FieldProblem | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'Missing';
  return trimmed.length > nameLimit ? 'TooLong' : null;
}
