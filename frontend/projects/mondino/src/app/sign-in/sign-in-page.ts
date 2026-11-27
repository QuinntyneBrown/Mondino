import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, GlobeFallback, TextField, Wordmark } from '@mondino/components';
import { emailLimit } from '@mondino/domain';
import { SignInStore } from './sign-in-store';

/**
 * Sign In, "Welcome back." (L2-052): one field for a work email, and a link that signs the
 * teammate straight in. It draws the `auth` block itself, as Create Team does (docs/adr/0011).
 */
@Component({
  selector: 'mo-sign-in-page',
  imports: [Button, GlobeFallback, RouterLink, TextField, Wordmark],
  providers: [SignInStore],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  protected readonly store = inject(SignInStore);
  protected readonly emailLimit = emailLimit;

  protected readonly invalid = computed(() => this.store.state().kind === 'Invalid');

  /** A request to move focus to the field after a submit with a problem; a new object each time. */
  private readonly focusRequest = signal<object | null>(null);

  constructor() {
    afterRenderEffect(() => {
      if (this.focusRequest()) document.getElementById('email')?.focus();
    });
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    await this.store.requestLink();
    if (this.store.state().kind === 'Invalid') this.focusRequest.set({});
  }
}
