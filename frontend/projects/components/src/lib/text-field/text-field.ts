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
  /** `text`, or `email` for a work email. */
  readonly type = input<'text' | 'email'>('text');
  readonly inputmode = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  /** Tabular figures, for a postal code. */
  readonly tabular = input(false, { transform: booleanAttribute });
  /** The id of the text that describes the field, when it shows no error. */
  readonly describedBy = input<string | null>(null);
  readonly value = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shown and focusable, but not changeable: while what was typed is being sent. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Marks the input `aria-invalid`. */
  readonly invalid = input(false, { transform: booleanAttribute });
  /** A line of help under the input, which describes it while it shows no error. */
  readonly help = input<string | null>(null);
  /** What to fix, under the input, which it then describes. */
  readonly error = input<string | null>(null);
  /** Announces the error as an alert when it appears, as a form with no summary does. */
  readonly errorAlert = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  protected readonly errorId = computed(() => `${this.fieldId()}-error`);
  protected readonly helpId = computed(() => `${this.fieldId()}-help`);
  protected readonly description = computed(() =>
    this.error() ? this.errorId() : this.help() ? this.helpId() : this.describedBy(),
  );
}
