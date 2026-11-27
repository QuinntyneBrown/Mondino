import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MomentView } from '@mondino/api';
import { MomentIcon } from '../moment-icon/moment-icon';

/**
 * A teammate's next moment as Team's "Coming up" shows it (L2-026): its kind's icon, named by the
 * kind, its title and when, "· In 5 days" or "· 9 Nov". The title is data, rendered as text.
 */
@Component({
  selector: 'mo-moment-pill',
  imports: [MomentIcon],
  templateUrl: './moment-pill.html',
  styleUrl: './moment-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'moment-pill' },
})
export class MomentPill {
  readonly moment = input.required<MomentView>();
}
