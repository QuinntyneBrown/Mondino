import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'default' | 'primary' | 'on-inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * A button, or a link that looks like one. It is an attribute on the native element, so the
 * element keeps its own semantics and the screen that uses it decides where a link leads:
 * `<a mo-button variant="primary" routerLink="/globe">` or `<button mo-button type="submit">`.
 */
@Component({
  selector: 'a[mo-button], button[mo-button]',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--on-inverse]': "variant() === 'on-inverse'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--lg]': "size() === 'lg'",
    '[class.btn--block]': 'block()',
    '[class.btn--icon]': 'icon()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('md');
  /** Takes the whole width of its container, as a form's main action does. */
  readonly block = input(false, { transform: booleanAttribute });
  /** An icon alone, square at the comfortable touch target; it is named by `aria-label`. */
  readonly icon = input(false, { transform: booleanAttribute });
}
