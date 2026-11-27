import { DestroyRef, inject, Injectable, Injector } from '@angular/core';
import type { DialogRef } from '@angular/cdk/dialog';
import type { InviteDialog } from './invite-dialog/invite-dialog';

/**
 * Opens the invite dialog (invite-teammates, L2-054). The dialog and the CDK Dialog are imported
 * when it is first opened, so their code is in no screen's chunk. It is opened with `TeamShell`'s
 * injector, so it shares the shell's team and toast; focus starts on "Copy link" and returns to
 * the button that opened it. One dialog at a time; one still open goes with the shell. Provided
 * by `TeamShell`.
 */
@Injectable()
export class InviteDialogOpener {
  private readonly injector = inject(Injector);
  private current: DialogRef<unknown, InviteDialog> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.current?.close());
  }

  async open(trigger: HTMLElement): Promise<void> {
    if (this.current) return;
    const [{ Dialog }, { InviteDialog, inviteDialogTitleId, inviteDialogDescriptionId }] =
      await Promise.all([import('@angular/cdk/dialog'), import('./invite-dialog/invite-dialog')]);
    if (this.current) return;
    const dialog = this.injector.get(Dialog).open(InviteDialog, {
      injector: this.injector,
      role: 'dialog',
      ariaModal: true,
      ariaLabelledBy: inviteDialogTitleId,
      ariaDescribedBy: inviteDialogDescriptionId,
      autoFocus: '.copy-field .btn',
      restoreFocus: trigger,
      hasBackdrop: false,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    this.current = dialog;
    dialog.closed.subscribe(() => (this.current = null));
  }
}
