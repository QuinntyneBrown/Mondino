import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { RibbonMarker } from '@mondino/api';
import { Avatar } from '../avatar/avatar';

/**
 * The day, hour by hour (L2-027), the mocks' `day-ribbon`: the 24 hours of a day with the night, the
 * morning, working hours and the evening named in words, and each teammate's marker at the hour
 * they are living through, in its row. A marker is a link to the Globe with that teammate selected,
 * named by their name and local time; a plain click is handed to the page as an output. At its
 * least the ribbon is 45rem wide: narrower, it scrolls sideways inside its own region, which the
 * keyboard reaches, and the page does not. Names and cities are data.
 */
@Component({
  selector: 'mo-day-ribbon',
  imports: [Avatar],
  templateUrl: './day-ribbon.html',
  styleUrl: './day-ribbon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayRibbon {
  readonly markers = input.required<readonly RibbonMarker[]>();
  /** The rows the markers need. */
  readonly rows = input(1);
  /** The nine hour marks, midnight to midnight: "00:00" … or "12 am" …. */
  readonly scale = input.required<readonly string[]>();
  /** The address that selects a teammate on the Globe: "/globe?teammate=…". */
  readonly address = input.required<(teammateId: string) => string>();

  readonly teammateChosen = output<string>();

  protected choose(event: MouseEvent, teammateId: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.teammateChosen.emit(teammateId);
  }
}
