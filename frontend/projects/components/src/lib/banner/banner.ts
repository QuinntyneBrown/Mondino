import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * An alert across the top of a screen (docs/design-system/components/alert.html, `.banner`): the
 * screen could not be refreshed. It says what is still true and how old the rest is, the time in
 * tabular figures, and offers "Try again", which reads "Trying…" and is disabled while it asks
 * (L2-048). Announced politely. Every text is rendered as text.
 */
@Component({
  selector: 'mo-banner',
  imports: [Button],
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Banner {
  /** The words before the time: "Couldn’t refresh. Clocks are live; weather and moments are from". */
  readonly text = input.required<string>();
  /** When what is shown was read, on the viewer's clock: "14:50". */
  readonly time = input.required<string>();
  /** Whether the try is pending. */
  readonly busy = input(false, { transform: booleanAttribute });

  readonly retry = output<void>();
}
