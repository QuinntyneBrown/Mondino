import { inject, Injectable } from '@angular/core';
import { CLIPBOARD } from '@mondino/api';
import { inviteLinkFor } from '@mondino/domain';
import { TeamStore } from './team-store';
import { Toaster } from './toaster';

/**
 * Copies the team's invite link and says how it went (L2-025, L2-054): "Invite link copied." for 4
 * seconds, or, where the browser refuses, an alert that stays until dismissed. "Copy" on the
 * Globe's invite card calls it, and the invite dialog's "Copy link" with journey 16. Provided by
 * `TeamShell`.
 */
@Injectable()
export class InviteLinkCopier {
  private readonly clipboard = inject(CLIPBOARD);
  private readonly store = inject(TeamStore);
  private readonly toaster = inject(Toaster);

  /** The team's invite link, or "" before the team is read. */
  link(): string {
    const token = this.store.team()?.inviteToken;
    return token ? inviteLinkFor(location.origin, token) : '';
  }

  /** Copies the link; resolves whether it is on the clipboard. */
  async copy(): Promise<boolean> {
    try {
      await this.clipboard.write(this.link());
      this.toaster.show({
        tone: 'success',
        strong: null,
        text: 'Invite link copied. Paste it wherever your team talks.',
      });
      return true;
    } catch {
      this.toaster.show({
        tone: 'danger',
        strong: 'Couldn’t copy the link.',
        text: 'It’s selected — press Ctrl+C or ⌘C to copy it yourself.',
      });
      return false;
    }
  }
}
