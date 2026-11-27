import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button, NoticePage } from '@mondino/components';

/**
 * "You need an invite link": shown in place, at the address that was opened, to someone on no team
 * who opens Globe, Team, Moments or Profile & Settings (L2-043). It reads no API. Opened from a
 * sign-in link whose email is on no team, it names that email, as text (L2-038, L2-052).
 */
@Component({
  selector: 'mo-invite-needed-page',
  imports: [Button, NoticePage, RouterLink],
  templateUrl: './invite-needed-page.html',
  styleUrl: './invite-needed-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteNeededPage {
  /**
   * The email of the sign-in link that led here, from the navigation that opened the screen; null
   * when there is none, or on a reload. It is read once and taken out of history, so the browser
   * keeps no email (L2-043).
   */
  protected readonly email = emailIn(
    inject(Router).currentNavigation()?.extras.state?.['signInEmail'],
  );

  /** "…and you aren’t on one yet", or "…and **sofia@northwind.co** isn’t on one yet". */
  protected readonly lead = this.email
    ? 'Mondino teams are invite-only, and '
    : `Mondino teams are invite-only, and you aren’t on one yet. ${askATeammate}`;
  protected readonly rest = this.email ? ` isn’t on one yet. ${askATeammate}` : '';

  constructor() {
    if (!this.email) return;
    const location = inject(Location);
    const state = location.getState();
    location.replaceState(location.path(true), '', {
      ...(typeof state === 'object' ? state : {}),
      signInEmail: null,
    });
  }
}

const askATeammate =
  'Ask a teammate to send you their team’s link — it opens straight onto the globe.';

/** The navigation state is data: an email is read only when it is a short string. */
function emailIn(state: unknown): string | null {
  return typeof state === 'string' && state.length > 0 && state.length <= 254 ? state : null;
}
