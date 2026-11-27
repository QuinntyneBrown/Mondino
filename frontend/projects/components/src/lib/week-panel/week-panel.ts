import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { WeekMoment, WorkingNow } from '@mondino/api';
import { Avatar } from '../avatar/avatar';
import { Emblem } from '../emblem/emblem';

/**
 * The panel beside the globe with no pin selected (L2-024): "This week around the world", the
 * week's moments with "All moments" under them, and "In working hours now", who is working with
 * their count, six at most and a link to the rest. Each row and link is a real link; a plain click
 * is handed to the page as an output, and one that opens a new tab follows the link. Names and
 * cities, and a moment's title, are data. Each moment row links to its teammate's pin; in a week
 * with none, the list says so.
 */
@Component({
  selector: 'mo-week-panel',
  imports: [Avatar, Emblem],
  templateUrl: './week-panel.html',
  styleUrl: './week-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPanel {
  readonly working = input.required<WorkingNow>();
  /** This week's moments, six at most, soonest first (L2-024). */
  readonly moments = input<readonly WeekMoment[]>([]);
  /** The address that selects a teammate: "/globe?teammate=…". */
  readonly address = input.required<(teammateId: string) => string>();
  /** The Moments screen, and the Team screen with "Working now" chosen. */
  readonly allMomentsAddress = input.required<string>();
  readonly moreWorkingAddress = input.required<string>();
  /**
   * Whether the viewer has turned every kind of moment off (L2-022): a note then takes the place of
   * the lead, the moments and "All moments", with "Choose moments", leading to Profile & Settings.
   */
  readonly everyKindOff = input(false);
  readonly chooseMomentsAddress = input('');

  readonly teammateChosen = output<string>();
  readonly allMoments = output();
  readonly chooseMoments = output();
  readonly moreWorking = output();

  /** Whether a click is a plain one, which the page handles; any other follows the link. */
  private plain(event: MouseEvent): boolean {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return false;
    event.preventDefault();
    return true;
  }

  protected choose(event: MouseEvent, teammateId: string): void {
    if (this.plain(event)) this.teammateChosen.emit(teammateId);
  }

  protected toMoments(event: MouseEvent): void {
    if (this.plain(event)) this.allMoments.emit();
  }

  protected toProfile(event: MouseEvent): void {
    if (this.plain(event)) this.chooseMoments.emit();
  }

  protected toTeam(event: MouseEvent): void {
    if (this.plain(event)) this.moreWorking.emit();
  }
}
