import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { RibbonDensity, RibbonMarker } from '@mondino/api';
import { Avatar } from '../avatar/avatar';

/**
 * The day, hour by hour (L2-027), the mocks' `day-ribbon`: the 24 hours of a day with the night, the
 * morning, working hours and the evening named in words, and each teammate's marker at the hour
 * they are living through, in its row. A marker is a link to the Globe with that teammate selected,
 * named by their name and local time; a plain click is handed to the page as an output. At its
 * least the ribbon is 45rem wide: narrower, it scrolls sideways inside its own region, which the
 * keyboard reaches, and the page does not. Names and cities are data.
 *
 * Given a `density`, for a team past 40 where faces no longer fit, it draws no marker: 48 bars over
 * the same bands, one for each half hour, each as tall as its share of the tallest, which carries
 * the count. The chart is one picture named by what it shows and where the most are; its bars are
 * hidden and are not controls. A line above it says how many are in working hours.
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
  /** For a large team: how many teammates are at each half hour, drawn in place of the markers. */
  readonly density = input<RibbonDensity | null>(null);
  /** The bold part of the line over the bar chart: "324 of 500". */
  readonly summary = input<string | null>(null);

  /** "How many teammates are at each half hour of their day. The most, 123, are at 15:00." */
  protected readonly densityName = computed(() => {
    const density = this.density();
    return density
      ? `How many teammates are at each half hour of their day. The most, ${density.max}, are at ${density.maxBinTime}.`
      : null;
  });

  readonly teammateChosen = output<string>();

  protected choose(event: MouseEvent, teammateId: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.teammateChosen.emit(teammateId);
  }
}
