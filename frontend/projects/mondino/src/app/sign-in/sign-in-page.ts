import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alert, Button, GlobeFallback, Notice, TextField, Wordmark } from '@mondino/components';
import { emailLimit } from '@mondino/domain';
import { SignInStore } from './sign-in-store';

/**
 * Sign In, "Welcome back." (L2-052): one field for a work email, and a link that signs the
 * teammate straight in. It draws the `auth` block itself, as Create Team does (docs/adr/0011).
 */
@Component({
  selector: 'mo-sign-in-page',
  imports: [Alert, Button, GlobeFallback, Notice, RouterLink, TextField, Wordmark],
  providers: [SignInStore],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  protected readonly store = inject(SignInStore);
  protected readonly emailLimit = emailLimit;

  protected readonly invalid = computed(() => this.store.state().kind === 'Invalid');

  /** The email a link was sent to, once it is: "Check your inbox". */
  protected readonly sentTo = computed(() => {
    const state = this.store.state();
    return state.kind === 'Sent' ? state.email : null;
  });

  /** Where focus goes once the screen is drawn: a new object for each move. */
  private readonly focusRequest = signal<{ id: string } | null>(null);

  constructor() {
    afterRenderEffect(() => {
      const request = this.focusRequest();
      if (request) document.getElementById(request.id)?.focus();
    });
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const asking = this.store.requestLink();
    if (this.store.state().kind === 'Invalid') this.focusRequest.set({ id: 'email' });
    await asking;
    // "Check your inbox" is announced, and its title takes focus so it is read at once.
    if (this.store.state().kind === 'Sent') this.focusRequest.set({ id: 'sent-title' });
  }

  protected useAnotherEmail(): void {
    this.store.useAnotherEmail();
    this.focusRequest.set({ id: 'email' });
  }
}
