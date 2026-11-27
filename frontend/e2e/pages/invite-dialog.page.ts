import type { Locator, Page } from '@playwright/test';

/**
 * The invite dialog, opened by "Invite teammate" in the header of the teammate screens: the team's
 * invite link to copy, how many are on the team, and "Close".
 */
export class InviteDialogPage {
  /** The dialog, by its role, whatever its name. */
  readonly dialog: Locator;
  readonly panel: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly label: Locator;
  readonly link: Locator;
  readonly copyLink: Locator;
  readonly meta: Locator;
  readonly close: Locator;
  readonly resetLink: Locator;
  /** Everything in the dialog a person can use, and every field in it. */
  readonly controls: Locator;
  readonly fields: Locator;
  readonly backdrop: Locator;

  constructor(readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.panel = this.dialog.locator('.dialog__panel');
    this.title = this.dialog.locator('.dialog__title');
    this.description = this.dialog.locator('.dialog__body > p');
    this.label = this.dialog.locator('.dialog__label');
    this.link = this.dialog.locator('.copy-field__value');
    this.copyLink = this.dialog.getByRole('button', { name: 'Copy link' });
    this.meta = this.dialog.locator('.dialog__meta');
    this.close = this.dialog.getByRole('button', { name: 'Close' });
    this.resetLink = this.dialog.getByRole('button', { name: 'Reset link' });
    this.controls = this.dialog.locator('button, a[href], input, select, textarea');
    this.fields = this.dialog.locator('input, select, textarea');
    this.backdrop = page.locator('.backdrop');
  }

  /**
   * Keeps every text the page writes to the clipboard, so a spec can say what was copied, and
   * when nothing was. Call before the screen opens.
   */
  async recordCopies(): Promise<void> {
    await this.page.addInitScript(() => {
      const kept: string[] = [];
      (window as unknown as { mondinoCopies: string[] }).mondinoCopies = kept;
      const clipboard = navigator.clipboard;
      const writeText = clipboard.writeText.bind(clipboard);
      clipboard.writeText = (text: string) => {
        kept.push(text);
        return writeText(text);
      };
    });
  }

  /** What the page has written to the clipboard since it opened, in order. */
  copies(): Promise<string[]> {
    return this.page.evaluate(
      () => (window as unknown as { mondinoCopies: string[] }).mondinoCopies,
    );
  }

  /** The text the page has selected. */
  selectedText(): Promise<string> {
    return this.page.evaluate(() => {
      const focused = document.activeElement;
      if (focused instanceof HTMLInputElement && focused.selectionStart !== null)
        return focused.value.slice(focused.selectionStart, focused.selectionEnd ?? undefined);
      return window.getSelection()?.toString() ?? '';
    });
  }

  /** Where the dialog's surface sits in the window. */
  async panelBox(): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await this.panel.boundingBox();
    if (!box) throw new Error('The dialog is not shown');
    return box;
  }
}
