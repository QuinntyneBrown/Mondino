import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiError, INVITE_API, type Invite } from '@mondino/api';
import type { InviteState } from './invite-state';

/** The most characters a name may have (L2-002). */
export const nameLimit = 60;

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

  private readonly inviteValue = signal<Invite | null>(null);
  private readonly stateValue = signal<InviteState>('Loading');
  private readonly submittedValue = signal(false);

  /** The team as its invite link shows it, once it is open. */
  readonly invite = this.inviteValue.asReadonly();
  readonly inviteState = this.stateValue.asReadonly();

  readonly name = signal('');
  readonly countryCode = signal('');
  readonly postalCode = signal('');

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
    inject(DestroyRef).onDestroy(() => this.pending?.abort());
  }

  async open(inviteToken: string): Promise<void> {
    this.pending?.abort();
    const pending = new AbortController();
    this.pending = pending;
    this.inviteValue.set(null);
    this.stateValue.set('Loading');
    try {
      const invite = await this.api.getInvite(inviteToken, pending.signal);
      if (pending.signal.aborted) return;
      this.inviteValue.set(invite.alreadyJoined ? null : invite);
      if (!this.countryCode()) this.countryCode.set(invite.countries[0]?.code ?? '');
      this.stateValue.set(invite.alreadyJoined ? 'AlreadyJoined' : 'Ready');
    } catch (error) {
      if (pending.signal.aborted) return;
      this.stateValue.set(stateFor(error));
    } finally {
      if (this.pending === pending) this.pending = null;
    }
  }

  /**
   * Submits the form: with a problem it is marked and nothing is looked up. Answers whether the
   * form had a problem, so the screen can move focus to the summary.
   */
  submit(): boolean {
    this.submittedValue.set(true);
    return this.nameProblem() !== null || this.postalCodeMissing();
  }
}

/** A refused open says the link no longer works only for `invite_not_found`; anything else failed. */
function stateFor(error: unknown): InviteState {
  return error instanceof ApiError && error.code === 'invite_not_found' ? 'NotFound' : 'Failed';
}
