import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The mocks' `list-note` block (L2-028): said in a list's place when it holds no row, as a status
 * a screen reader announces, with an optional way back such as "Show everyone".
 */
@Component({
  selector: 'mo-list-note',
  imports: [Button],
  templateUrl: './list-note.html',
  styleUrl: './list-note.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListNote {
  readonly title = input.required<string>();
  readonly text = input.required<string>();
  readonly action = input<string>();

  readonly actionChosen = output<void>();
}
