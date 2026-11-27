import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { GroupContent } from '@mondino/api';
import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';

/**
 * A selected group pin, in the panel beside the globe (L2-023): how many teammates are close
 * together and where, then a block for each city with its local time and its teammates as rows.
 * Each row is a link to that teammate's address; a plain click is handed to the page as
 * `teammateChosen`, and one that opens a new tab follows the link. Names and cities are data.
 */
@Component({
  selector: 'mo-group-panel',
  imports: [Avatar, Button],
  templateUrl: './group-panel.html',
  styleUrl: './group-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupPanel {
  readonly content = input.required<GroupContent>();
  /** The address that selects a teammate: "/globe?teammate=…". */
  readonly address = input.required<(teammateId: string) => string>();

  readonly teammateChosen = output<string>();
  readonly closed = output();

  protected choose(event: MouseEvent, teammateId: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.teammateChosen.emit(teammateId);
  }
}
