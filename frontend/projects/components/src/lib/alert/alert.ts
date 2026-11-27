import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

/** A link in a form's error summary: its words and the id of the field it leads to. */
export interface AlertLink {
  readonly label: string;
  readonly target: string;
}

/**
 * A message in place about something that needs attention, announced as an alert: a form's error
 * summary (a title and a link to each field), or a warning with a countdown. Every text is
 * rendered as text. A figure that changes (a countdown) is hidden from assistive technology, which
 * reads `figureSpoken` instead, so the alert is announced once and not at each tick.
 */
@Component({
  selector: 'mo-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alert {
  readonly tone = input<'danger' | 'warning'>('danger');
  readonly icon = input<'alert' | 'clock' | 'weather-off'>('alert');
  /**
   * `status` for a warning that is no alarm, announced politely: Team's "Weather is unavailable
   * right now" (L2-049).
   */
  readonly live = input<'alert' | 'status'>('alert');
  readonly title = input<string | null>(null);
  /** Bold, at the start of the line. */
  readonly strong = input<string | null>(null);
  readonly text = input<string | null>(null);
  /** A figure in tabular numbers after the text: "9:42". */
  readonly figure = input<string | null>(null);
  /** What assistive technology reads in the figure's place. */
  readonly figureSpoken = input<string | null>(null);
  readonly end = input<string | null>(null);
  readonly items = input<readonly AlertLink[]>([]);
  /** Takes focus from script, as an error summary does after a submit. */
  readonly focusable = input(false, { transform: booleanAttribute });
  /** Each new value, past 0, moves focus to the alert once it is drawn: one for each submit. */
  readonly focusRequest = input(0);

  /** A link was followed: the id of its field. The screen moves focus there. */
  readonly follow = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.focusRequest() > 0)
        this.host.nativeElement.querySelector<HTMLElement>('.alert')?.focus();
    });
  }

  /** Moves focus to the field, and leaves the address alone (a hash link would leave the screen). */
  protected followLink(event: Event, target: string): void {
    event.preventDefault();
    this.follow.emit(target);
  }
}
