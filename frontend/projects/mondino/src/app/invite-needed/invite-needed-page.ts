import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, NoticePage } from '@mondino/components';

/**
 * "You need an invite link": shown in place, at the address that was opened, to someone on no team
 * who opens Globe, Team, Moments or Profile & Settings (L2-043). It reads no API. The email a
 * sign-in link was sent to joins its text with Sign In (journey 7).
 */
@Component({
  selector: 'mo-invite-needed-page',
  imports: [Button, NoticePage, RouterLink],
  templateUrl: './invite-needed-page.html',
  styleUrl: './invite-needed-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteNeededPage {}
