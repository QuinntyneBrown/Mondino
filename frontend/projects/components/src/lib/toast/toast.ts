import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A toast: a short word about something that just happened, with a way to dismiss it. The screen
 * places it in a `toast-region` that is in the page before any toast, so it is announced once,
 * and decides when it goes. Every text is rendered as text.
 */
@Component({
  selector: 'mo-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  /** Bold, at the start: what happened. */
  readonly strong = input<string | null>(null);
  readonly text = input.required<string>();

  /** Dismiss was used. */
  readonly dismiss = output<void>();
}
