import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { GlobeFallback } from '../globe-fallback/globe-fallback';
import { Wordmark } from '../wordmark/wordmark';

/**
 * A page that says one thing: the wordmark, a small globe, a title, a line and a way on.
 * The line is `lead`, then `emphasis` in strong, then `rest`; all three are rendered as text.
 * The way on is projected into the `actions` slot.
 */
@Component({
  selector: 'mo-notice-page',
  imports: [GlobeFallback, Wordmark],
  templateUrl: './notice-page.html',
  styleUrl: './notice-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticePage {
  readonly title = input.required<string>();
  readonly lead = input.required<string>();
  /** Shown in strong between `lead` and `rest`: an address or an email, as text. */
  readonly emphasis = input('');
  readonly rest = input('');
}
