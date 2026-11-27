import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Button } from '../button/button';

/**
 * The card of a team of one, in the panel's place (L2-025): "Bring the team onto the globe", what
 * the link does, and the team's invite link as selectable text beside "Copy". The screen copies
 * it; where the browser refuses, the screen calls `selectLink`, so the link can be copied by
 * hand. The link is text.
 */
@Component({
  selector: 'mo-invite-card',
  imports: [Button],
  templateUrl: './invite-card.html',
  styleUrl: './invite-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card card--raised invite-card' },
})
export class InviteCard {
  /** The link as it is read: without its scheme. */
  readonly inviteLink = input.required<string>();

  /** "Copy" was used. */
  readonly copyLink = output();

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  /** Selects the whole link, so it can be copied by hand. */
  selectLink(): void {
    const link = this.host.querySelector('.invite-card__url');
    const selection = window.getSelection();
    if (!link || !selection) return;
    selection.selectAllChildren(link);
  }
}
