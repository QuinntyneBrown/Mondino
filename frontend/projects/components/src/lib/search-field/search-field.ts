import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * The search above a large team's list (L2-056), the design system's `input--search` in an
 * `input-wrap`: a field of type search, named and with a placeholder by the same words, that takes
 * at most 60 characters and names the list it narrows. Every input event hands the text to the
 * page; what is typed is data, shown only as the field's own value (L2-044).
 */
@Component({
  selector: 'mo-search-field',
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchField {
  readonly value = input('');
  /** Its accessible name and placeholder: "Find a person or city". */
  readonly label = input.required<string>();
  /** The id of the list it narrows. */
  readonly controls = input.required<string>();

  readonly valueChange = output<string>();

  protected changed(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
