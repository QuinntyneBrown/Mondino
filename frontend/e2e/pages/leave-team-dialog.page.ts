import type { Locator, Page } from '@playwright/test';

/** "Leave Northwind?", opened by "Leave Northwind" on Profile & Settings. */
export class LeaveTeamDialogPage {
  /** The dialog, by its role, whatever its name. */
  readonly dialog: Locator;
  /** The dialog's surface: a sheet from the bottom under 576 px, in the middle from 576 px. */
  readonly panel: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly stay: Locator;
  /** The confirming button, whatever it reads: "Leave Northwind", "Leaving…" or "Try again". */
  readonly confirm: Locator;
  /** The alert when leaving failed. */
  readonly alert: Locator;
  /** Images anywhere on the page: none when names are shown as text. */
  readonly images: Locator;

  constructor(readonly page: Page) {
    this.dialog = page.getByRole('alertdialog');
    this.panel = this.dialog.locator('.dialog__panel');
    this.title = this.dialog.locator('.dialog__title');
    this.description = this.dialog.locator('.dialog__body > p');
    this.stay = this.dialog.getByRole('button', { name: 'Stay' });
    this.confirm = this.dialog.locator('.dialog__footer .btn--danger');
    this.alert = this.dialog.getByRole('alert');
    this.images = page.locator('img');
  }
}
