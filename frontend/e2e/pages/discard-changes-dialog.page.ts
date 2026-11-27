import type { Locator, Page } from '@playwright/test';

/** "Leave without saving?", asked when Profile & Settings is left with unsaved changes. */
export class DiscardChangesDialogPage {
  /** The dialog, by its role, whatever its name. */
  readonly dialog: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly discardAndLeave: Locator;
  readonly keepEditing: Locator;

  constructor(readonly page: Page) {
    this.dialog = page.getByRole('alertdialog');
    this.title = this.dialog.locator('.dialog__title');
    this.description = this.dialog.locator('.dialog__body > p');
    this.discardAndLeave = this.dialog.getByRole('button', { name: 'Discard and leave' });
    this.keepEditing = this.dialog.getByRole('button', { name: 'Keep editing' });
  }
}
