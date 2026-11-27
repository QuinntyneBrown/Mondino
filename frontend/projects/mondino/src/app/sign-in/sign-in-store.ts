import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { SIGN_IN_API } from '@mondino/api';
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

  /** Asks for a link for the email typed, or marks it invalid and sends nothing. */
  async requestLink(): Promise<void> {
    if (!isEmailAddress(this.email())) {
      this.state.set({ kind: 'Invalid' });
      return;
    }
  }
}
