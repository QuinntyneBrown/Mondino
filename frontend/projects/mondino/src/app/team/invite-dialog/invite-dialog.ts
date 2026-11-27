import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Button, CopyField } from '@mondino/components';
import { InviteLinkCopier } from '../invite-link-copier';
import { TeamStore } from '../team-store';

/** The ids the CDK container names and describes the dialog by. */
export const inviteDialogTitleId = 'invite-dialog-title';
export const inviteDialogDescriptionId = 'invite-dialog-description';

/**
 * The invite dialog (invite-teammates, L2-054): the team's invite link to copy, how many are on
 * the team, and "Close". "Copy link" closes it once the link is on the clipboard; where the
 * browser refuses, it stays with the link selected. "Reset link" is not built until it is
 * designed (docs/mocks/README.md). Opened by `InviteDialogOpener` with `TeamShell`'s injector, so
 * it shares the shell's team and toast. The team's name is text.
 */
@Component({
  selector: 'mo-invite-dialog',
  imports: [Button, CopyField],
  templateUrl: './invite-dialog.html',
  styleUrl: './invite-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteDialog {
  private readonly store = inject(TeamStore);
  private readonly copier = inject(InviteLinkCopier);
  private readonly dialog = inject(DialogRef);

  protected readonly titleId = inviteDialogTitleId;
  protected readonly descriptionId = inviteDialogDescriptionId;
  protected readonly teamName = computed(() => this.store.team()?.teamName ?? '');
  /** The link as it is read: without its scheme. */
  protected readonly link = computed(() =>
    this.store.team() ? this.copier.link().replace(/^https?:\/\//, '') : '',
  );
  protected readonly count = computed(() => this.store.team()?.pins.length ?? 0);
  /** Raised when a copy is refused, so the field selects the link and takes focus. */
  protected readonly selectRequest = signal(0);

  protected async copy(): Promise<void> {
    if (await this.copier.copy()) this.dialog.close();
    else this.selectRequest.update((count) => count + 1);
  }

  protected close(): void {
    this.dialog.close();
  }
}
