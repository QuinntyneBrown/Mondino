import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Status, TeamRow } from '@mondino/api';
import { Avatar } from '../avatar/avatar';
import { WeatherIcon } from '../weather-icon/weather-icon';

const words: Record<Status, string> = {
  'early-morning': 'Early morning',
  'working-hours': 'Working hours',
  evening: 'Evening',
  'probably-asleep': 'Probably asleep',
};

const dots: Record<Status, string> = {
  'early-morning': 'dot--edge',
  'working-hours': 'dot--working',
  evening: 'dot--edge',
  'probably-asleep': 'dot--asleep',
};

/**
 * Everyone, west to east (L2-026), the mocks' `team-table`: from 768 px a table with the columns
 * Person, Location, Local time, Compared to you, Weather and Coming up; below it each row gives the
 * name, the status in words, the local time, the city with the offset and the next moment. Each row
 * is one link over the name that covers the row; a plain click is handed to the page as an output,
 * any other follows the link. Names and cities are data. The next moment comes with the moments
 * (journey 19); until then "Coming up" is a dash, said in words.
 */
@Component({
  selector: 'mo-team-table',
  imports: [Avatar, WeatherIcon],
  templateUrl: './team-table.html',
  styleUrl: './team-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamTable {
  readonly rows = input.required<readonly TeamRow[]>();
  /** What the table holds: "Everyone, west to east". */
  readonly caption = input.required<string>();
  /** The address that selects a teammate on the Globe: "/globe?teammate=…". */
  readonly address = input.required<(teammateId: string) => string>();
  /** The table's id, which a city section's button names. */
  readonly tableId = input<string | null>(null);
  /**
   * In a city section (L2-056): from 768 px the headings are out of sight under the one row of
   * headings over every city, and stay for assistive technology.
   */
  readonly sectioned = input(false, { transform: booleanAttribute });

  readonly teammateChosen = output<string>();

  protected readonly words = words;
  protected readonly dots = dots;

  protected choose(event: MouseEvent, teammateId: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.teammateChosen.emit(teammateId);
  }
}
