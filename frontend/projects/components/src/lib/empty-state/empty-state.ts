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
  readonly tone = input<'error'>('error');
}
