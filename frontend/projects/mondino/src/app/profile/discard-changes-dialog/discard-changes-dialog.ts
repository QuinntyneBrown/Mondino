import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Button } from '@mondino/components';

/** The ids the CDK container names and describes the dialog by. */
export const discardChangesTitleId = 'discard-changes-title';
export const discardChangesDescriptionId = 'discard-changes-description';

/**
 * "Leave without saving?" (L2-035), asked when the viewer leaves Profile & Settings with unsaved
 * changes: "Discard and leave" closes it with `true`, and the screen is left with nothing saved;
 * "Keep editing" and Escape close it with nothing, and the changes stay on the screen. Focus starts
 * on "Keep editing". Opened by `ProfilePage`, whose CDK Dialog makes it an alert dialog.
 */
@Component({
  selector: 'mo-discard-changes-dialog',
  imports: [Button],
  templateUrl: './discard-changes-dialog.html',
  styleUrl: './discard-changes-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscardChangesDialog {
  protected readonly dialog = inject<DialogRef<boolean>>(DialogRef);
  protected readonly titleId = discardChangesTitleId;
  protected readonly descriptionId = discardChangesDescriptionId;
}
