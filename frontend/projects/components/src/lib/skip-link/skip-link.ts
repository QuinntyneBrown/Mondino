import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

/**
 * "Skip to content": the first focusable element of every screen. It moves focus to the
 * screen's main without changing the address.
 */
@Component({
  selector: 'mo-skip-link',
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {
  private readonly document = inject(DOCUMENT);

  /** The id of the element that takes focus. */
  readonly target = input.required<string>();

  protected skip(event: Event): void {
    event.preventDefault();
    const element = this.document.getElementById(this.target());
    if (!element) return;
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus();
    element.scrollIntoView();
  }
}
