import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MomentGroups } from '@mondino/api';
import { MomentRow } from '../moment-row/moment-row';
import { TodayMoment } from '../today-moment/today-moment';

/**
 * The Moments screen's list (L2-029): today's moments first, each a card, then "This week" and
 * "Later". A group with no moment is left out, heading and all.
 */
@Component({
  selector: 'mo-moment-list',
  imports: [MomentRow, TodayMoment],
  templateUrl: './moment-list.html',
  styleUrl: './moment-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MomentList {
  readonly groups = input.required<MomentGroups>();
  /** The address that selects a teammate on the Globe: "/globe?teammate=…". */
  readonly address = input.required<(teammateId: string) => string>();

  /** The teammate of the moment chosen. */
  readonly teammateChosen = output<string>();
}
