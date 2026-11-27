import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The bar for unsaved changes on Profile & Settings (L2-035): "You have unsaved changes" and
 * "Save changes", and "Saving…" with its button disabled while the save is answered. It is a polite
 * live region. Its confirmation and its failure join with journey 23.
 */
@Component({
  selector: 'mo-save-bar',
  imports: [Button],
  templateUrl: './save-bar.html',
  styleUrl: './save-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveBar {
  readonly saving = input(false, { transform: booleanAttribute });
  readonly save = output<void>();
}
