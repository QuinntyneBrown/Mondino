import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The mark and the lowercase wordmark "mondino". With `collapses`, as in the header with
 * navigation, the word is hidden under 576 px and the mark stands alone.
 */
@Component({
  selector: 'mo-wordmark',
  templateUrl: './wordmark.html',
  styleUrl: './wordmark.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wordmark {
  readonly collapses = input(false);
}
