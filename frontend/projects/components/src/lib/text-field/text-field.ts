import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

/**
 * A text field in its form field: the label above, the input under it, and, when it is invalid,
 * what to fix under that. What is typed is text; the screen holds the value.
 */
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
  /** The id of the text that describes the field, when it shows no error. */
  readonly describedBy = input<string | null>(null);
  readonly value = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Marks the input `aria-invalid`. */
  readonly invalid = input(false, { transform: booleanAttribute });
  /** What to fix, under the input, which it then describes. */
  readonly error = input<string | null>(null);

  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  protected readonly errorId = computed(() => `${this.fieldId()}-error`);
}
