import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The mocks' `invite-prompt` card, in a list's place while the viewer is the team's only teammate
 * (L2-026, L2-054): "It’s just you on Northwind so far", a line, and "Invite teammates", which
 * hands the page the button so the invite dialog can return focus to it. The team's name is data.
 */
@Component({
  selector: 'mo-invite-prompt',
  imports: [Button],
  templateUrl: './invite-prompt.html',
  styleUrl: './invite-prompt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePrompt {
  readonly teamName = input.required<string>();

  readonly invite = output<HTMLElement>();

  protected choose(event: Event): void {
    this.invite.emit(event.currentTarget as HTMLElement);
  }
}
