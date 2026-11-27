import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TEAM_MEMBERSHIP } from '@mondino/api';
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly membership = inject(TEAM_MEMBERSHIP);
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
    // An emailed link carries its token in the fragment, which no server is sent (docs/adr/0011).
    const signInToken = this.route.snapshot.fragment;
    if (signInToken) void this.open(signInToken);
  }

  /**
   * Takes the token out of the address before anything else, then opens the link: a teammate's
   * team is remembered and its Globe shown; an email on no team is handed to "You need an invite
   * link" for one navigation. A link that cannot be used leaves the form (L2-052).
   */
  private async open(signInToken: string): Promise<void> {
    await this.router.navigate([], { relativeTo: this.route, replaceUrl: true });
    const result = await this.store.open(signInToken);
    if (!result) return;
    if (result.membership) {
      this.membership.remember(result.membership);
      await this.router.navigateByUrl('/globe', { replaceUrl: true });
    } else {
      await this.router.navigateByUrl('/globe', {
        replaceUrl: true,
        state: { signInEmail: result.email },
      });
    }
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
