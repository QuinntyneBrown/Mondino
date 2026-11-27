import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiError, SIGN_IN_API, type SignInResult } from '@mondino/api';
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

  /**
   * Opens an emailed link by its token. A refusal (used, expired, unknown, too often) or no answer
   * is `LinkUnusable` and gives null: it signs no one in.
   */
  async open(signInToken: string): Promise<SignInResult | null> {
    this.state.set({ kind: 'Opening' });
    const request = (this.pending = new AbortController());
    try {
      return await this.api.redeem(signInToken, request.signal);
    } catch (error) {
      if (request.signal.aborted) return null;
      this.state.set({ kind: 'LinkUnusable' });
      if (!(error instanceof ApiError)) throw error;
      return null;
    } finally {
      if (this.pending === request) this.pending = null;
    }
  }

  /** "Use another email": the form again, with what was typed. */
  useAnotherEmail(): void {
    this.state.set({ kind: 'Idle' });
  }
}
