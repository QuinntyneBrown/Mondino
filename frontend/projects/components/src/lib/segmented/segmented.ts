import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** One choice of a segmented tab list: "Working now" with its count, 8. */
export interface SegmentedOption {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
}

/**
 * The mocks' `segmented` block as a tab list (L2-028): one `tablist` whose options are tabs with
 * ids `tab-{value}`. Only the chosen tab is in the tab order; Left and Right move to the previous
 * and next tab, wrapping, Home and End to the first and last, and each chooses the tab it reaches.
 * The panel it controls is labelled by the chosen tab.
 */
@Component({
  selector: 'mo-segmented',
  templateUrl: './segmented.html',
  styleUrl: './segmented.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Segmented {
  readonly options = input.required<readonly SegmentedOption[]>();
  readonly value = input.required<string>();
  /** What the tab list chooses: "Filter by status". */
  readonly label = input.required<string>();
  /** The id of the panel the tabs control. */
  readonly controls = input.required<string>();

  readonly valueChange = output<string>();

  protected choose(value: string): void {
    if (value !== this.value()) this.valueChange.emit(value);
  }

  protected move(event: KeyboardEvent, index: number): void {
    const last = this.options().length - 1;
    const to =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (to === null) return;
    event.preventDefault();
    // The tabs are the tab list's children, in order; a signal query would bring its runtime into
    // the initial bundle.
    const tabs = (event.currentTarget as HTMLElement).parentElement?.children;
    (tabs?.[to] as HTMLElement | undefined)?.focus();
    this.choose(this.options()[to].value);
  }
}
