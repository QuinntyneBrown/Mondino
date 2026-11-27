import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Wordmark } from '../wordmark/wordmark';

/**
 * The header over the teammate screens (docs/design-system/components/app-header): the mark and
 * wordmark, a link to the Globe; the screens' navigation, projected as `[nav]`; and at its end
 * "Invite teammate", an icon alone under 768 px with the same name, and the viewer's own link,
 * projected as `[me]`. It injects no router: a plain click on the mark is handed to the screen.
 */
@Component({
  selector: 'mo-app-header',
  imports: [Wordmark],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  /** Where the mark leads: the Globe. */
  readonly homeAddress = input.required<string>();

  readonly home = output();
  /** "Invite teammate" was used, with the button, to which the dialog returns focus. */
  readonly invite = output<HTMLElement>();

  protected goHome(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.home.emit();
  }
}
