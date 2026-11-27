import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Button } from '../button/button';

/**
 * A link to pass on, read-only so it can be selected and copied by hand, with the button that
 * copies it: the team's invite link. The screen copies it and says whether it worked. The link is
 * text.
 */
@Component({
  selector: 'mo-copy-field',
  imports: [Button],
  templateUrl: './copy-field.html',
  styleUrl: './copy-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyField {
  /** The link as it is read: without its scheme. */
  readonly value = input.required<string>();
  /** What names the value, where no visible label does. */
  readonly label = input('Invite link');
  /** The link is on the clipboard: the button reads "Copied", with a tick. */
  readonly copied = input(false);
  /** Each new value, past 0, selects the whole link and moves focus to it: a copy was refused. */
  readonly selectRequest = input(0);

  /** "Copy link" was used. */
  readonly copyLink = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.selectRequest() === 0) return;
      const field = this.host.nativeElement.querySelector<HTMLInputElement>('.copy-field__value');
      field?.focus();
      field?.select();
    });
  }
}
