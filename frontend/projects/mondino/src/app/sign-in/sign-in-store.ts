import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiError, SIGN_IN_API } from '@mondino/api';
import { isEmailAddress } from '@mondino/domain';
import type { SignInState } from './sign-in-state';

/**
 * Sign In's state, provided by the page so it goes when the person leaves. The email lives in
 * these signals only: never in browser storage, never in an address (L2-043).
 */
@Injectable()
export class SignInStore {
  private readonly api = inject(SIGN_IN_API);

  /** The email as typed. */
  readonly email = signal('');
  readonly state = signal<SignInState>({ kind: 'Idle' });

  private pending: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pending?.abort());
  }

  /** The field was edited: an "invalid" message goes at once. */
  setEmail(value: string): void {
    this.email.set(value);
    if (this.state().kind === 'Invalid') this.state.set({ kind: 'Idle' });
  }

  /**
   * Asks for a link for the email typed, or marks it invalid and sends nothing. Pressed again while
   * a request is out, it does nothing. Any refusal, and no answer, is `Failed`: the screen never
   * says more, since the answer is the same whatever the email (L2-043).
   */
  async requestLink(): Promise<void> {
    if (this.state().kind === 'Sending') return;
    const email = this.email().trim();
    if (!isEmailAddress(email)) {
      this.state.set({ kind: 'Invalid' });
      return;
    }
    this.state.set({ kind: 'Sending' });
    const request = (this.pending = new AbortController());
    try {
      await this.api.requestLink(email, request.signal);
      this.state.set({ kind: 'Sent', email: this.email() });
    } catch (error) {
      if (request.signal.aborted) return;
      this.state.set({ kind: 'Failed' });
      if (!(error instanceof ApiError)) throw error;
    } finally {
      if (this.pending === request) this.pending = null;
    }
  }

  /** "Use another email": the form again, with what was typed. */
  useAnotherEmail(): void {
    this.state.set({ kind: 'Idle' });
  }
}
