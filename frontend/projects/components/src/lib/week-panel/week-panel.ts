import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { WorkingNow } from '@mondino/api';
import { Avatar } from '../avatar/avatar';

/**
 * The panel beside the globe with no pin selected (L2-024): "This week around the world", the
 * week's moments with "All moments" under them, and "In working hours now", who is working with
 * their count, six at most and a link to the rest. Each row and link is a real link; a plain click
 * is handed to the page as an output, and one that opens a new tab follows the link. Names and
 * cities are data. The moment rows come with the moments (journey 19); until then, and in a week
 * with none, the list says so.
 */
@Component({
  selector: 'mo-week-panel',
  imports: [Avatar],
  templateUrl: './week-panel.html',
  styleUrl: './week-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPanel {
  readonly working = input.required<WorkingNow>();
  /** The address that selects a teammate: "/globe?teammate=…". */
  readonly address = input.required<(teammateId: string) => string>();
  /** The Moments screen, and the Team screen with "Working now" chosen. */
  readonly allMomentsAddress = input.required<string>();
  readonly moreWorkingAddress = input.required<string>();

  readonly teammateChosen = output<string>();
  readonly allMoments = output();
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

  protected toTeam(event: MouseEvent): void {
    if (this.plain(event)) this.moreWorking.emit();
  }
}
