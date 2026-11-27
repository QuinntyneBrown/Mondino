import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

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
  host: {
    '(pointerenter)': 'point(true)',
    '(pointerleave)': 'point(false)',
    '(focusin)': 'focus(true)',
    '(focusout)': 'focusLeaves($event)',
  },
})
export class Toast {
  /** A success, ink in light, or a failure: a raised surface with a pin edge and an alert icon. */
  readonly tone = input<'success' | 'danger'>('success');
  /** Bold, at the start: what happened. */
  readonly strong = input<string | null>(null);
  readonly text = input.required<string>();

  /** Dismiss was used. */
  readonly dismiss = output<void>();
  /**
   * The toast is pointed at or focused (true), or no longer either (false): the screen holds the
   * time it has left until it is let go (L2-054).
   */
  readonly held = output<boolean>();

  private readonly pointed = signal(false);
  private readonly focused = signal(false);

  protected point(pointed: boolean): void {
    this.change(pointed, this.focused());
  }

  protected focus(focused: boolean): void {
    this.change(this.pointed(), focused);
  }

  protected focusLeaves(event: FocusEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return;
    this.focus(false);
  }

  private change(pointed: boolean, focused: boolean): void {
    const was = this.pointed() || this.focused();
    this.pointed.set(pointed);
    this.focused.set(focused);
    if (was !== (pointed || focused)) this.held.emit(pointed || focused);
  }
}
