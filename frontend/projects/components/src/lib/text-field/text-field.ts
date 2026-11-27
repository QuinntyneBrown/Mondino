import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A text field in its form field: the label above, the input under it. */
@Component({
  selector: 'mo-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
  /** The input's id, which its label names. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly name = input('');
  readonly autocomplete = input('off');
  readonly maxlength = input<number | null>(null);
  /** Tabular figures, for a postal code. */
  readonly tabular = input(false, { transform: booleanAttribute });
  /** The id of the text that describes the field. */
  readonly describedBy = input<string | null>(null);
}
