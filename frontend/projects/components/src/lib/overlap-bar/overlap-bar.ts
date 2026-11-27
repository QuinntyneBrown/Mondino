import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ClockFormat, DaySpan, Overlap, OverlapText } from '@mondino/api';
import { barParts } from './bar-parts';

const scales: Record<ClockFormat, readonly string[]> = {
  '24-hour': ['00:00', '06:00', '12:00', '18:00', '00:00'],
  '12-hour': ['12 am', '6 am', '12 pm', '6 pm', '12 am'],
};

/**
 * The working-hours overlap of the viewer and a teammate, on the viewer's clock (L2-017): a
 * 24-hour track with the viewer's working day outlined, the teammate's filled faintly, the part
 * both share filled solid and a tick for now, under a scale and a legend. The drawing is hidden
 * from assistive technology; the figure and the sentence give the overlap as text, with its
 * start, end and length. The teammate's first name is data, rendered as text.
 */
@Component({
  selector: 'mo-overlap-bar',
  templateUrl: './overlap-bar.html',
  styleUrl: './overlap-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlapBar {
  readonly overlap = input.required<Overlap | null>();
  /** The teammate's working day on the viewer's clock. */
  readonly theirDay = input.required<DaySpan>();
  /** The viewer's minute of the day, where the tick for now stands. */
  readonly nowMinute = input.required<number>();
  readonly firstName = input.required<string>();
  readonly text = input.required<OverlapText>();
  readonly clockFormat = input<ClockFormat>('24-hour');

  protected readonly parts = computed(() =>
    barParts(this.overlap(), this.theirDay(), this.nowMinute()),
  );
  protected readonly scale = computed(() => scales[this.clockFormat()]);
}
