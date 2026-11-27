import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/** What the bar shows (L2-035): nothing, unsaved changes, a save pending, saved, or a failed save. */
export type SaveBarState = 'hidden' | 'unsaved' | 'saving' | 'saved' | 'failed';

/**
 * The bar for unsaved changes on Profile & Settings (L2-035): "You have unsaved changes" and
 * "Save changes"; "Saving…" with its button disabled while the save is answered; "Saved — your pin
 * is up to date", announced; and "Couldn’t save. Your changes are still here." with "Try again", an
 * alert. It renders nothing when `hidden`; the store decides how long "Saved" stays.
 */
@Component({
  selector: 'mo-save-bar',
  imports: [Button],
  templateUrl: './save-bar.html',
  styleUrl: './save-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveBar {
  readonly state = input.required<SaveBarState>();
  readonly save = output<void>();
  readonly retry = output<void>();
}
