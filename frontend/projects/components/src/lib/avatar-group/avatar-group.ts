import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Avatars that overlap a little, each ringed: a few of a team at a glance. Decorative. */
@Component({
  selector: 'mo-avatar-group',
  templateUrl: './avatar-group.html',
  styleUrl: './avatar-group.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'avatar-group', 'aria-hidden': 'true' },
})
export class AvatarGroup {}
