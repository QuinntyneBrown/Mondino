import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/** The browser's own select in its form field: the label above, a chevron at its end. */
@Component({
  selector: 'mo-select-field',
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectField {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly name = input('');
  readonly autocomplete = input('off');
  /** The options, in the order they are listed. Their labels are text. */
  readonly options = input<readonly SelectOption[]>([]);
  /** The chosen option's value. */
  readonly value = input('');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();
}
