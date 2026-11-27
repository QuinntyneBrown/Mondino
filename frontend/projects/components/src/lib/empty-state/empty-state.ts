import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The design system's `empty` block: an icon, a title that is the screen's heading, a line, and
 * the ways on, projected. `error` draws a warning, as Team does when the team did not load
 * (L2-049). The title and the line are rendered as text.
 */
@Component({
  selector: 'mo-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input.required<string>();
  /** `error` draws a warning; `calendar` an empty calendar, as Moments does with nothing ahead. */
  readonly tone = input<'error' | 'calendar'>('error');
  /** The title's heading level: 1 when it is the screen's heading, 2 under a screen's own. */
  readonly level = input<1 | 2>(1);
}
