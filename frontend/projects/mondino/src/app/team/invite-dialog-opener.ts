import {
  createEnvironmentInjector,
  DestroyRef,
  EnvironmentInjector,
  inject,
  Injectable,
  Injector,
} from '@angular/core';
import type { Dialog, DialogRef } from '@angular/cdk/dialog';
import type { InviteDialog } from './invite-dialog/invite-dialog';

/**
 * Opens the invite dialog (invite-teammates, L2-054). The dialog and the CDK Dialog are imported
 * when it is first opened, so their code is in no screen's chunk. It is opened with `TeamShell`'s
 * injector, so it shares the shell's team and toast; focus starts on "Copy link" and returns to
 * the button that opened it. One dialog at a time; one still open goes with the shell. Provided
 * by `TeamShell`.
 *
 * The dialog is drawn in the page's own layers, not the browser's top layer, so the toast that
 * answers a refused copy is above it (`--z-toast` over the overlay's 1000), as
 * `dialogs/invite/copy-failed` draws it.
 */
@Injectable()
export class InviteDialogOpener {
  private readonly injector = inject(Injector);
  private readonly environment = inject(EnvironmentInjector);
  private dialogs: { readonly service: Dialog; readonly injector: EnvironmentInjector } | null =
    null;
  private current: DialogRef<unknown, InviteDialog> | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      // Destroying the dialogs' injector closes any dialog still open.
      this.dialogs?.injector.destroy();
    });
  }

  async open(trigger: HTMLElement): Promise<void> {
    if (this.current) return;
    const [
      { Dialog, OVERLAY_DEFAULT_CONFIG },
      { InviteDialog, inviteDialogTitleId, inviteDialogDescriptionId },
    ] = await Promise.all([
      import('./invite-dialog/dialog-layers'),
      import('./invite-dialog/invite-dialog'),
    ]);
    if (this.current || this.destroyed) return;
    if (!this.dialogs) {
      const injector = createEnvironmentInjector(
        [Dialog, { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } }],
        this.environment,
      );
      this.dialogs = { service: injector.get(Dialog), injector };
    }
    const dialog = this.dialogs.service.open(InviteDialog, {
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
